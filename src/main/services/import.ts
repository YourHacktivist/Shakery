/**
 * Import of a .shakery archive (section 12.4, brought forward to phase 3 by D-018).
 *
 * 1. Validation of data.json against the schema before anything is written: known tables
 *    only, known columns only, required columns present, SQLite types, size limits.
 * 2. Matching: categories by seed_key then slug, glasses and ice by seed_key then name,
 *    ingredients by normalized name or alias; every other row by id.
 * 3. Preview: per table, new rows, matched rows, conflicts.
 * 4. Apply in one transaction, foreign keys checked at commit: conflicts are ignored,
 *    replaced or duplicated (new ids, references remapped). Any failure rolls everything back.
 */
import type { Statement } from 'better-sqlite3'
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { normalizeName } from '../../core/normalize'
import type { Db, Ids } from '../db/client'
import { recipeIndexFields } from '../db/repositories/recipes'
import { indexEntity } from '../db/repositories/search-index'
import * as s from '../db/schema'
import { isPathInside } from '../security-policy'
import { ARCHIVE_VERSION, type ArchiveContent } from './archive'

/** Tables carried by a .shakery archive, in insertion order (parents first). */
const TABLES: readonly SQLiteTable[] = [
  s.categories,
  s.glasses,
  s.iceTypes,
  s.studyGuides,
  s.guideSources,
  s.recipes,
  s.ingredients,
  s.ingredientAliases,
  s.products,
  s.recipeLines,
  s.recipeHistory,
  s.referenceSpecs,
  s.referenceSpecLines,
  s.knowledgeSheets,
  s.knowledgeSections,
  s.knowledgeItems,
  s.knowledgeLinks,
  s.studyTables,
  s.studyTableRows,
  s.sourceCitations,
  s.tastingNotes,
  s.notebookEntries,
  s.notebookLinks,
  s.prepBatches,
  s.collections,
  s.collectionItems,
  s.practiceSessions,
  s.practiceAnswers,
]

type ColumnKind = 'text' | 'json' | 'integer' | 'real'
type ColumnInfo = { name: string; kind: ColumnKind; required: boolean; nullable: boolean }
type TableInfo = { name: string; columns: Map<string, ColumnInfo>; foreignKeys: Map<string, string> }

function kindOf(column: { columnType: string }): ColumnKind {
  const type = column.columnType
  if (type === 'SQLiteTextJson' || type === 'SQLiteBlobJson') return 'json'
  if (type === 'SQLiteReal') return 'real'
  if (type.startsWith('SQLiteText')) return 'text'
  return 'integer'
}

const TABLE_INFO: ReadonlyMap<string, TableInfo> = new Map(
  TABLES.map((table) => {
    const config = getTableConfig(table)
    const columns = new Map(
      config.columns.map((c) => [
        c.name,
        { name: c.name, kind: kindOf(c), required: c.notNull && !c.hasDefault, nullable: !c.notNull },
      ]),
    )
    const foreignKeys = new Map<string, string>()
    for (const fk of config.foreignKeys) {
      const ref = fk.reference()
      const column = ref.columns[0]
      if (column) foreignKeys.set(column.name, getTableConfig(ref.foreignTable).name)
    }
    return [config.name, { name: config.name, columns, foreignKeys }]
  }),
)

export const IMPORT_TABLE_NAMES: readonly string[] = [...TABLE_INFO.keys()]

type Row = Record<string, unknown>

export type ImportData = { readonly tables: ReadonlyMap<string, readonly Row[]> }

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportValidationError'
  }
}

const dataSchema = z
  .object({
    formatVersion: z.literal(ARCHIVE_VERSION),
    tables: z.record(z.string().max(64), z.array(z.record(z.string().max(64), z.unknown())).max(500_000)),
  })
  .strict()

/** Full validation of data.json, before any write. */
export function validateImportData(raw: unknown): ImportData {
  const parsed = dataSchema.safeParse(raw)
  if (!parsed.success) throw new ImportValidationError('data.json does not follow the format')
  const tables = new Map<string, Row[]>()
  for (const [name, rows] of Object.entries(parsed.data.tables)) {
    const info = TABLE_INFO.get(name)
    if (!info) throw new ImportValidationError(`Unknown table ${name}`)
    rows.forEach((row, index) => {
      checkRow(info, row, `${name}[${String(index)}]`)
    })
    tables.set(name, rows)
  }
  return { tables }
}

function checkRow(info: TableInfo, row: Row, where: string): void {
  for (const key of Object.keys(row)) {
    if (!info.columns.has(key)) throw new ImportValidationError(`${where}: unknown column ${key}`)
  }
  for (const column of info.columns.values()) {
    const value = row[column.name]
    if (value === undefined) {
      if (column.required) throw new ImportValidationError(`${where}: missing ${column.name}`)
      continue
    }
    if (value === null) {
      if (!column.nullable) throw new ImportValidationError(`${where}: ${column.name} cannot be null`)
      continue
    }
    const ok =
      column.kind === 'integer'
        ? typeof value === 'number' && Number.isSafeInteger(value)
        : column.kind === 'real'
          ? typeof value === 'number' && Number.isFinite(value)
          : typeof value === 'string' &&
            value.length <= 1_000_000 &&
            (column.kind !== 'json' || isJson(value))
    if (!ok) throw new ImportValidationError(`${where}: invalid value for ${column.name}`)
  }
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

export type ConflictStrategy = 'ignore' | 'replace' | 'duplicate'

/** Rows that follow their recipe: kept, replaced or duplicated with it. */
const RECIPE_CHILDREN = new Set(['recipe_lines', 'recipe_history'])

export type TablePreview = {
  readonly table: string
  readonly total: number
  readonly added: number
  /** Matched with an existing category, glass, ice type, ingredient or classic. */
  readonly matched: number
  /** Same identifier already in the notebook, or a classic changed on both sides. */
  readonly conflicts: number
}

type Plan = {
  /** Imported id -> id to use in the notebook (matched or duplicated rows). */
  readonly idMap: Map<string, string>
  /** Imported ids of rows that already exist (conflicts) per table. */
  readonly conflicts: Map<string, Set<string>>
  /** Imported ids matched with an existing row (never inserted). */
  readonly matched: Set<string>
  /**
   * Imported ids of seed rows (classics, seed ingredients) whose state replaces the matching row
   * of the notebook: changed in the archive while untouched here, or a conflict replaced.
   */
  readonly adopted: Set<string>
}

function liveRows(db: Db, table: string, columns: string): Row[] {
  return db.$client.prepare(`SELECT ${columns} FROM ${table} WHERE deleted_at IS NULL`).all() as Row[]
}

function idsOf(db: Db, table: string): Set<string> {
  return new Set(
    (db.$client.prepare(`SELECT id FROM ${table}`).all() as Array<{ id: string }>).map((r) => r.id),
  )
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** A seed row the user changed: edited (new version, favourite, status), or deleted. */
function touched(row: Row, table: 'recipes' | 'ingredients'): boolean {
  if (row['updated_at'] !== row['created_at'] || row['deleted_at'] !== null) return true
  if (table === 'ingredients') return false
  return row['version'] !== 1 || row['is_favorite'] === 1 || row['status'] !== 'final'
}

function plan(db: Db, data: ImportData, strategy: ConflictStrategy, ids: Ids): Plan {
  const idMap = new Map<string, string>()
  const matched = new Set<string>()
  const conflicts = new Map<string, Set<string>>()
  const adopted = new Set<string>()
  const seedConflicts = new Map<string, Set<string>>()

  const matchBy = (
    table: string,
    keyOf: (row: Row) => string | null,
    existingKeys: Map<string, string>,
  ): void => {
    for (const row of data.tables.get(table) ?? []) {
      const key = keyOf(row)
      const id = str(row['id'])
      const existing = key === null ? undefined : existingKeys.get(key)
      if (id !== null && existing !== undefined) {
        idMap.set(id, existing)
        matched.add(id)
      }
    }
  }

  const categoryRows = liveRows(db, 'categories', 'id, seed_key, slug')
  matchBy(
    'categories',
    (r) => (str(r['seed_key']) !== null ? `seed:${String(r['seed_key'])}` : `slug:${String(r['slug'])}`),
    new Map(
      categoryRows.flatMap((r) => {
        const pairs: Array<[string, string]> = [[`slug:${String(r['slug'])}`, String(r['id'])]]
        if (str(r['seed_key']) !== null) pairs.push([`seed:${String(r['seed_key'])}`, String(r['id'])])
        return pairs
      }),
    ),
  )
  for (const table of ['glasses', 'ice_types']) {
    const rows = liveRows(db, table, 'id, seed_key, name')
    matchBy(
      table,
      (r) =>
        str(r['seed_key']) !== null
          ? `seed:${String(r['seed_key'])}`
          : `name:${normalizeName(String(r['name']))}`,
      new Map(
        rows.flatMap((r) => {
          const pairs: Array<[string, string]> = [
            [`name:${normalizeName(String(r['name']))}`, String(r['id'])],
          ]
          if (str(r['seed_key']) !== null) pairs.push([`seed:${String(r['seed_key'])}`, String(r['id'])])
          return pairs
        }),
      ),
    )
  }

  /**
   * A seed row of the archive and the row with the same seed_key here: the same entry. Untouched
   * in the archive, nothing to bring. Changed there and untouched here, the archive state is
   * adopted. Changed on both sides, it is a conflict the strategy decides.
   */
  const settleSeedRow = (table: 'recipes' | 'ingredients', row: Row, existing: Row): void => {
    const id = String(row['id'])
    idMap.set(id, String(existing['id']))
    if (!touched(row, table)) {
      matched.add(id)
      return
    }
    if (!touched(existing, table)) {
      adopted.add(id)
      return
    }
    const set = seedConflicts.get(table) ?? new Set<string>()
    set.add(id)
    seedConflicts.set(table, set)
    if (strategy === 'replace') adopted.add(id)
    else if (strategy === 'duplicate' && table === 'recipes') idMap.set(id, ids.newId())
    else matched.add(id)
  }

  // Ingredients: same seed_key; otherwise the same normalized name in the (mapped) same
  // category, or a known alias.
  const ingredientRows = liveRows(
    db,
    'ingredients',
    'id, name_normalized, category_id, seed_key, created_at, updated_at, deleted_at',
  )
  const ingredientsBySeed = new Map(
    ingredientRows.filter((r) => str(r['seed_key']) !== null).map((r) => [String(r['seed_key']), r]),
  )
  const aliasRows = liveRows(db, 'ingredient_aliases', 'ingredient_id, alias_normalized')
  const byName = new Map(
    ingredientRows.map((r) => [
      `${String(r['category_id'])}|${String(r['name_normalized'])}`,
      String(r['id']),
    ]),
  )
  const byAlias = new Map(aliasRows.map((r) => [String(r['alias_normalized']), String(r['ingredient_id'])]))
  for (const row of data.tables.get('ingredients') ?? []) {
    const id = str(row['id'])
    if (id === null) continue
    const seed = str(row['seed_key'])
    const sameSeed = seed === null ? undefined : ingredientsBySeed.get(seed)
    if (sameSeed !== undefined && String(sameSeed['id']) !== id) {
      settleSeedRow('ingredients', row, sameSeed)
      continue
    }
    const category = String(row['category_id'])
    const name = normalizeName(String(row['name']))
    const existing = byName.get(`${idMap.get(category) ?? category}|${name}`) ?? byAlias.get(name)
    if (existing !== undefined && existing !== id) {
      idMap.set(id, existing)
      matched.add(id)
    }
  }

  // Classics: the same seed_key, deleted rows included (a deleted classic stays deleted).
  const recipesBySeed = new Map(
    (
      db.$client
        .prepare(
          `SELECT id, seed_key, version, is_favorite, status, created_at, updated_at, deleted_at
           FROM recipes WHERE seed_key IS NOT NULL`,
        )
        .all() as Row[]
    ).map((r) => [String(r['seed_key']), r]),
  )
  for (const row of data.tables.get('recipes') ?? []) {
    const seed = str(row['seed_key'])
    const existing = seed === null ? undefined : recipesBySeed.get(seed)
    if (existing !== undefined && String(existing['id']) !== String(row['id'])) {
      settleSeedRow('recipes', row, existing)
    }
  }

  for (const [table, rows] of data.tables) {
    const existing = idsOf(db, table)
    const set = new Set<string>(seedConflicts.get(table) ?? [])
    for (const row of rows) {
      const id = str(row['id'])
      if (id === null || matched.has(id) || adopted.has(id) || !existing.has(id)) continue
      set.add(id)
      if (strategy === 'duplicate') idMap.set(id, ids.newId())
    }
    conflicts.set(table, set)
  }
  // A study guide keeps its import key unique: importing the same notebook twice is a conflict.
  const guideKeys = new Map(
    liveRows(db, 'study_guides', 'id, import_key').map((r) => [String(r['import_key']), String(r['id'])]),
  )
  for (const row of data.tables.get('study_guides') ?? []) {
    const id = str(row['id'])
    const key = str(row['import_key'])
    if (id === null || key === null) continue
    const current = guideKeys.get(key)
    if (current !== undefined && current !== id) conflicts.get('study_guides')?.add(id)
  }
  return { idMap, conflicts, matched, adopted }
}

export function previewImport(db: Db, data: ImportData, ids: Ids): TablePreview[] {
  const { idMap, conflicts, matched, adopted } = plan(db, data, 'ignore', ids)
  const recipeConflicts = conflicts.get('recipes') ?? new Set<string>()
  const aliasExists = db.$client.prepare(
    'SELECT 1 FROM ingredient_aliases WHERE ingredient_id = ? AND alias_normalized = ? AND deleted_at IS NULL',
  )
  /** The same reading as applyImport: a row is new, already here, or a conflict. */
  const classify = (table: string, row: Row): 'added' | 'matched' | 'conflict' => {
    const id = String(row['id'])
    if (RECIPE_CHILDREN.has(table)) {
      const recipe = String(row['recipe_id'])
      if (recipeConflicts.has(recipe)) return 'conflict'
      if (matched.has(recipe) && !adopted.has(recipe)) return 'matched'
    }
    if (conflicts.get(table)?.has(id)) return 'conflict'
    if (matched.has(id) || adopted.has(id)) return 'matched'
    if (table === 'ingredient_aliases') {
      const ingredient = String(row['ingredient_id'])
      if (aliasExists.get(idMap.get(ingredient) ?? ingredient, row['alias_normalized'])) return 'matched'
    }
    return 'added'
  }
  return [...data.tables].map(([table, rows]) => {
    const counts = { added: 0, matched: 0, conflict: 0 }
    for (const row of rows) counts[classify(table, row)] += 1
    return {
      table,
      total: rows.length,
      matched: counts.matched,
      conflicts: counts.conflict,
      added: counts.added,
    }
  })
}

export type ImportResult = { readonly inserted: number; readonly updated: number; readonly skipped: number }

/** Ids inside a version snapshot point to rows of the notebook it was taken in. */
function remapSnapshot(snapshot: string, map: (id: unknown) => unknown): string {
  try {
    const value = JSON.parse(snapshot) as Record<string, unknown>
    for (const key of ['id', 'glassId', 'iceId', 'parentRecipeId', 'prepCategoryId']) {
      if (typeof value[key] === 'string') value[key] = map(value[key])
    }
    if (Array.isArray(value['lines'])) {
      value['lines'] = (value['lines'] as Array<Record<string, unknown>>).map((line) => ({
        ...line,
        id: map(line['id']),
        ingredientId: map(line['ingredientId']),
        preferredProductId:
          typeof line['preferredProductId'] === 'string' ? map(line['preferredProductId']) : null,
      }))
    }
    return JSON.stringify(value)
  } catch {
    return snapshot
  }
}

export async function applyImport(
  db: Db,
  content: { data: ImportData; media: ArchiveContent['media'] },
  options: { strategy: ConflictStrategy; ids: Ids; mediaRoot: string },
): Promise<ImportResult> {
  const { data } = content
  const { strategy, ids } = options
  const result = { inserted: 0, updated: 0, skipped: 0 }
  const written = { recipes: new Set<string>(), ingredients: new Set<string>(), products: new Set<string>() }
  const fresh = new Set<string>()

  const sqlite = db.$client
  const statements = new Map<string, Statement>()
  const prepared = (sql: string): Statement => {
    let statement = statements.get(sql)
    if (!statement) {
      statement = sqlite.prepare(sql)
      statements.set(sql, statement)
    }
    return statement
  }
  const run = sqlite.transaction(() => {
    const { idMap, conflicts, matched, adopted } = plan(db, data, strategy, ids)
    const mapped = (id: unknown): unknown => (typeof id === 'string' ? (idMap.get(id) ?? id) : id)
    /** Recipes whose lines and versions stay as they are here. */
    const keptRecipes = new Set<string>()
    /** Recipes whose lines and versions come from the archive in place of those here. */
    const adoptedRecipes = new Set<string>()
    const childIds = new Map<string, { lines: string[]; history: string[] }>()
    for (const [table, key] of [
      ['recipe_lines', 'lines'],
      ['recipe_history', 'history'],
    ] as const) {
      for (const child of data.tables.get(table) ?? []) {
        const recipe = String(child['recipe_id'])
        const entry = childIds.get(recipe) ?? { lines: [], history: [] }
        entry[key].push(String(child['id']))
        childIds.set(recipe, entry)
      }
    }
    const exists = (table: string, id: unknown) =>
      prepared(`SELECT 1 FROM ${table} WHERE id = ?`).get(id) !== undefined
    const now = ids.now()
    // Foreign keys are checked at commit, so circular references (recipes and their
    // preparation ingredients) can be inserted in any order.
    sqlite.pragma('defer_foreign_keys = ON')
    for (const table of TABLES) {
      const name = getTableConfig(table).name
      const info = TABLE_INFO.get(name)
      const rows = data.tables.get(name)
      if (!info || !rows) continue
      for (const original of rows) {
        const id = String(original['id'])
        if (RECIPE_CHILDREN.has(name) && keptRecipes.has(String(original['recipe_id']))) {
          result.skipped += 1
          continue
        }
        const isConflict = conflicts.get(name)?.has(id) ?? false
        const adopt = adopted.has(id)
        if ((matched.has(id) && !adopt) || (isConflict && strategy === 'ignore' && !adopt)) {
          if (name === 'recipes') keptRecipes.add(id)
          result.skipped += 1
          continue
        }
        const row: Row = { ...original, id: idMap.get(id) ?? id }
        for (const [column] of info.foreignKeys) row[column] = mapped(row[column])
        if (name === 'study_guides' && isConflict && strategy === 'duplicate') row['import_key'] = null
        // A duplicated classic becomes the user's own copy: the seed keeps its key here.
        if (isConflict && strategy === 'duplicate' && !adopt && 'seed_key' in row) row['seed_key'] = null
        if (name === 'recipe_history' && typeof row['snapshot'] === 'string') {
          row['snapshot'] = remapSnapshot(row['snapshot'], mapped)
        }
        if (name === 'ingredient_aliases') {
          const exists = prepared(
            'SELECT 1 FROM ingredient_aliases WHERE ingredient_id = ? AND alias_normalized = ? AND deleted_at IS NULL',
          ).get(row['ingredient_id'], row['alias_normalized'])
          if (exists) {
            result.skipped += 1
            continue
          }
        }
        if (adopt && name === 'recipes') {
          // The archive's lines and versions replace those of the classic here: what the archive
          // does not carry is removed (a version number is unique per recipe).
          adoptedRecipes.add(id)
          const children = childIds.get(id) ?? { lines: [], history: [] }
          prepared(
            `UPDATE recipe_lines SET deleted_at = ?, updated_at = ? WHERE recipe_id = ? AND deleted_at IS NULL
             AND id NOT IN (SELECT value FROM json_each(?))`,
          ).run(now, now, row['id'], JSON.stringify(children.lines))
          prepared(
            'DELETE FROM recipe_history WHERE recipe_id = ? AND id NOT IN (SELECT value FROM json_each(?))',
          ).run(row['id'], JSON.stringify(children.history))
        }
        const columns = Object.keys(row)
        const followsAdopted = RECIPE_CHILDREN.has(name) && adoptedRecipes.has(String(original['recipe_id']))
        if ((isConflict && strategy === 'replace') || adopt || (followsAdopted && exists(name, row['id']))) {
          const sets = columns.filter((c) => c !== 'id').map((c) => `${c} = @${c}`)
          prepared(`UPDATE ${name} SET ${sets.join(', ')} WHERE id = @id`).run(row)
          result.updated += 1
        } else {
          prepared(
            `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
          ).run(row)
          result.inserted += 1
          fresh.add(String(row['id']))
        }
        if (name === 'recipes' || name === 'ingredients' || name === 'products')
          written[name].add(String(row['id']))
        if (name === 'ingredient_aliases') written.ingredients.add(String(row['ingredient_id']))
      }
    }
    reindex(db, written, fresh)
  })
  run()

  const mediaRoot = path.resolve(options.mediaRoot)
  for (const [relative, buffer] of content.media) {
    const target = path.resolve(mediaRoot, ...relative.split('/'))
    if (!isPathInside(mediaRoot, target)) continue
    const exists = await stat(target).then(
      () => true,
      () => false,
    )
    if (exists) continue
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, buffer)
  }
  return result
}

/**
 * The recipes, ingredients and bottles written by the import enter the search index. Only
 * those: an untouched classic of a full archive is not read again. A new row cannot be in the
 * index yet, so it skips the removal (a scan of the FTS5 table).
 */
function reindex(
  db: Db,
  written: { recipes: Set<string>; ingredients: Set<string>; products: Set<string> },
  fresh: Set<string>,
): void {
  const sqlite = db.$client
  const recipe = sqlite.prepare(
    'SELECT name, notes, garnish, profile, credit, steps, tags FROM recipes WHERE id = ? AND deleted_at IS NULL',
  )
  for (const id of written.recipes) {
    const row = recipe.get(id) as Row | undefined
    if (!row) continue
    indexEntity(
      sqlite,
      'recipe',
      id,
      recipeIndexFields({
        name: String(row['name']),
        notes: str(row['notes']),
        garnish: str(row['garnish']),
        profile: str(row['profile']),
        credit: str(row['credit']),
        steps: parseList(row['steps']),
        tags: parseList(row['tags']),
      }),
      { fresh: fresh.has(id) },
    )
  }
  const ingredient = sqlite.prepare(
    'SELECT name, description FROM ingredients WHERE id = ? AND deleted_at IS NULL',
  )
  const aliases = sqlite.prepare(
    'SELECT alias FROM ingredient_aliases WHERE ingredient_id = ? AND deleted_at IS NULL',
  )
  for (const id of written.ingredients) {
    const row = ingredient.get(id) as Row | undefined
    if (!row) continue
    indexEntity(
      sqlite,
      'ingredient',
      id,
      {
        title: String(row['name']),
        aliases: (aliases.all(id) as Array<{ alias: string }>).map((a) => a.alias),
        body: [str(row['description'])],
      },
      { fresh: fresh.has(id) },
    )
  }
  const product = sqlite.prepare(
    'SELECT name, brand, personal_notes FROM products WHERE id = ? AND deleted_at IS NULL',
  )
  for (const id of written.products) {
    const row = product.get(id) as Row | undefined
    if (!row) continue
    indexEntity(
      sqlite,
      'product',
      id,
      {
        title: String(row['name']),
        aliases: [str(row['brand']) ?? ''],
        body: [str(row['personal_notes'])],
      },
      { fresh: fresh.has(id) },
    )
  }
}

function parseList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}
