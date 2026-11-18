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
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { normalizeName } from '../../core/normalize'
import type { Db, Ids } from '../db/client'
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

export type TablePreview = {
  readonly table: string
  readonly total: number
  readonly added: number
  /** Matched with an existing category, glass, ice type or ingredient. */
  readonly matched: number
  /** Same identifier already in the notebook. */
  readonly conflicts: number
}

type Plan = {
  /** Imported id -> id to use in the notebook (matched or duplicated rows). */
  readonly idMap: Map<string, string>
  /** Imported ids of rows that already exist (conflicts) per table. */
  readonly conflicts: Map<string, Set<string>>
  /** Imported ids matched with an existing row (never inserted). */
  readonly matched: Set<string>
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

function plan(db: Db, data: ImportData, strategy: ConflictStrategy, ids: Ids): Plan {
  const idMap = new Map<string, string>()
  const matched = new Set<string>()
  const conflicts = new Map<string, Set<string>>()

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

  // Ingredients: same normalized name in the (mapped) same category, or a known alias.
  const ingredientRows = liveRows(db, 'ingredients', 'id, name_normalized, category_id')
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
    const category = String(row['category_id'])
    const name = normalizeName(String(row['name']))
    const existing = byName.get(`${idMap.get(category) ?? category}|${name}`) ?? byAlias.get(name)
    if (existing !== undefined) {
      idMap.set(id, existing)
      matched.add(id)
    }
  }

  for (const [table, rows] of data.tables) {
    const existing = idsOf(db, table)
    const set = new Set<string>()
    for (const row of rows) {
      const id = str(row['id'])
      if (id === null || matched.has(id) || !existing.has(id)) continue
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
  return { idMap, conflicts, matched }
}

export function previewImport(db: Db, data: ImportData, ids: Ids): TablePreview[] {
  const { conflicts, matched } = plan(db, data, 'ignore', ids)
  return [...data.tables].map(([table, rows]) => {
    const tableConflicts = conflicts.get(table)?.size ?? 0
    const tableMatched = rows.filter((r) => matched.has(String(r['id']))).length
    return {
      table,
      total: rows.length,
      matched: tableMatched,
      conflicts: tableConflicts,
      added: rows.length - tableMatched - tableConflicts,
    }
  })
}

export type ImportResult = { readonly inserted: number; readonly updated: number; readonly skipped: number }

export async function applyImport(
  db: Db,
  content: { data: ImportData; media: ArchiveContent['media'] },
  options: { strategy: ConflictStrategy; ids: Ids; mediaRoot: string },
): Promise<ImportResult> {
  const { data } = content
  const { strategy, ids } = options
  const result = { inserted: 0, updated: 0, skipped: 0 }

  const sqlite = db.$client
  const run = sqlite.transaction(() => {
    const { idMap, conflicts, matched } = plan(db, data, strategy, ids)
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
        if (matched.has(id)) {
          result.skipped += 1
          continue
        }
        const isConflict = conflicts.get(name)?.has(id) ?? false
        if (isConflict && strategy === 'ignore') {
          result.skipped += 1
          continue
        }
        const row: Row = { ...original, id: idMap.get(id) ?? id }
        for (const [column] of info.foreignKeys) {
          const value = row[column]
          if (typeof value === 'string') row[column] = idMap.get(value) ?? value
        }
        if (name === 'study_guides' && isConflict && strategy === 'duplicate') row['import_key'] = null
        const columns = Object.keys(row)
        if (isConflict && strategy === 'replace') {
          const sets = columns.filter((c) => c !== 'id').map((c) => `${c} = @${c}`)
          sqlite.prepare(`UPDATE ${name} SET ${sets.join(', ')} WHERE id = @id`).run(row)
          result.updated += 1
        } else {
          sqlite
            .prepare(
              `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
            )
            .run(row)
          result.inserted += 1
        }
      }
    }
    reindex(db, data, idMap)
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

/** The imported recipes, ingredients and bottles enter the search index. */
function reindex(db: Db, data: ImportData, idMap: Map<string, string>): void {
  const mapped = (id: unknown): string => idMap.get(String(id)) ?? String(id)
  for (const row of data.tables.get('recipes') ?? []) {
    const id = mapped(row['id'])
    const recipe = db.$client
      .prepare('SELECT name, notes, garnish, profile, credit FROM recipes WHERE id = ?')
      .get(id) as Row | undefined
    if (recipe) {
      indexEntity(db.$client, 'recipe', id, {
        title: String(recipe['name']),
        body: [str(recipe['notes']), str(recipe['garnish']), str(recipe['profile']), str(recipe['credit'])],
      })
    }
  }
  for (const row of data.tables.get('ingredients') ?? []) {
    const id = mapped(row['id'])
    const ingredient = db.$client
      .prepare('SELECT name, description FROM ingredients WHERE id = ?')
      .get(id) as Row | undefined
    if (!ingredient) continue
    const aliases = (
      db.$client
        .prepare('SELECT alias FROM ingredient_aliases WHERE ingredient_id = ? AND deleted_at IS NULL')
        .all(id) as Array<{ alias: string }>
    ).map((a) => a.alias)
    indexEntity(db.$client, 'ingredient', id, {
      title: String(ingredient['name']),
      aliases,
      body: [str(ingredient['description'])],
    })
  }
  for (const row of data.tables.get('products') ?? []) {
    const id = mapped(row['id'])
    const product = db.$client
      .prepare('SELECT name, brand, personal_notes FROM products WHERE id = ?')
      .get(id) as Row | undefined
    if (product) {
      indexEntity(db.$client, 'product', id, {
        title: String(product['name']),
        aliases: [str(product['brand']) ?? ''],
        body: [str(product['personal_notes'])],
      })
    }
  }
}
