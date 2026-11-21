/**
 * Export of the notebook as a .shakery archive (section 12.4), read back by import.ts.
 *
 * - Full: every row of every table the import knows, deleted rows included, and every photo of
 *   the media folder. An export followed by an import gives the same notebook back.
 * - Partial, to share recipes with a colleague: the recipes, the preparations they use (through
 *   their ingredients, recursively), their ingredients with aliases, and the referentials. The
 *   tasting notes, the notebook entries and the bottles (purchase prices) are left out unless
 *   `includePrivate` is set. A link to something left out (parent recipe, preferred bottle,
 *   reference guide) is cleared, so that the archive stays consistent on its own.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Db } from '../db/client'
import {
  ARCHIVE_FORMAT,
  ARCHIVE_LIMITS,
  ARCHIVE_VERSION,
  checkEntryName,
  isWebp,
  type ArchiveManifest,
} from './archive'
import { IMPORT_TABLE_NAMES } from './import'

type Row = Record<string, unknown>

export type ExportRequest =
  | { readonly kind: 'full' }
  | {
      readonly kind: 'partial'
      readonly recipeIds: readonly string[]
      readonly includePrivate: boolean
      /** The collection these recipes come from, exported with its items. */
      readonly collectionId?: string | null
    }

export type ExportBundle = {
  readonly manifest: ArchiveManifest
  readonly data: { readonly formatVersion: typeof ARCHIVE_VERSION; readonly tables: Record<string, Row[]> }
  readonly media: Map<string, Buffer>
}

export type ExportContext = {
  readonly appVersion: string
  readonly now: number
  readonly mediaRoot: string
  readonly label?: string | null
}

export async function buildExport(
  db: Db,
  request: ExportRequest,
  context: ExportContext,
): Promise<ExportBundle> {
  const tables = request.kind === 'full' ? fullTables(db) : partialTables(db, request)
  const media =
    request.kind === 'full'
      ? await allMedia(context.mediaRoot)
      : await referencedMedia(context.mediaRoot, tables)
  const counts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]))
  counts['media'] = media.size
  return {
    manifest: {
      format: ARCHIVE_FORMAT,
      formatVersion: ARCHIVE_VERSION,
      appVersion: context.appVersion,
      createdAt: context.now,
      kind: request.kind,
      label: context.label ?? null,
      counts,
    },
    data: { formatVersion: ARCHIVE_VERSION, tables },
    media,
  }
}

function fullTables(db: Db): Record<string, Row[]> {
  return Object.fromEntries(
    IMPORT_TABLE_NAMES.map((name) => [name, db.$client.prepare(`SELECT * FROM ${name}`).all() as Row[]]),
  )
}

function partialTables(db: Db, request: Extract<ExportRequest, { kind: 'partial' }>): Record<string, Row[]> {
  const sqlite = db.$client
  const rows = (sql: string, ...params: unknown[]) => sqlite.prepare(sql).all(...params) as Row[]
  /** `column IN (the ids)`, the ids passed as one JSON parameter. */
  const among = (column: string) => `${column} IN (SELECT value FROM json_each(?))`

  // The recipes and, recursively, the preparations their ingredients come from.
  const recipeIds = new Set(
    rows(
      `SELECT id FROM recipes WHERE deleted_at IS NULL AND ${among('id')}`,
      JSON.stringify(request.recipeIds),
    ).map((row) => String(row['id'])),
  )
  const preps = sqlite.prepare(
    `SELECT DISTINCT i.prep_recipe_id AS id FROM recipe_lines l JOIN ingredients i ON i.id = l.ingredient_id
     JOIN recipes r ON r.id = i.prep_recipe_id
     WHERE l.recipe_id = ? AND l.deleted_at IS NULL AND r.deleted_at IS NULL`,
  )
  const queue = [...recipeIds]
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const row of preps.all(id) as Row[]) {
      const prep = String(row['id'])
      if (recipeIds.has(prep)) continue
      recipeIds.add(prep)
      queue.push(prep)
    }
  }
  const recipeList = JSON.stringify([...recipeIds])

  const recipes = rows(`SELECT * FROM recipes WHERE ${among('id')}`, recipeList).map((row) => ({
    ...row,
    parent_recipe_id:
      typeof row['parent_recipe_id'] === 'string' && recipeIds.has(row['parent_recipe_id'])
        ? row['parent_recipe_id']
        : null,
  }))
  const lines = rows(
    `SELECT * FROM recipe_lines WHERE deleted_at IS NULL AND ${among('recipe_id')}`,
    recipeList,
  )
  const history = rows(
    `SELECT * FROM recipe_history WHERE deleted_at IS NULL AND ${among('recipe_id')}`,
    recipeList,
  )

  const ingredientIds = new Set(lines.map((line) => String(line['ingredient_id'])))
  for (const row of rows(`SELECT id FROM ingredients WHERE ${among('prep_recipe_id')}`, recipeList)) {
    ingredientIds.add(String(row['id']))
  }
  const ingredientList = JSON.stringify([...ingredientIds])
  const ingredients = rows(`SELECT * FROM ingredients WHERE ${among('id')}`, ingredientList)
  const aliases = rows(
    `SELECT * FROM ingredient_aliases WHERE deleted_at IS NULL AND ${among('ingredient_id')}`,
    ingredientList,
  )

  const products: Row[] = request.includePrivate
    ? rows(
        `SELECT * FROM products WHERE deleted_at IS NULL AND ${among('ingredient_id')}`,
        ingredientList,
      ).map((row) => ({ ...row, reference_guide_id: null }))
    : []
  const productIds = new Set(products.map((row) => String(row['id'])))
  const keptLines = lines.map((line) => ({
    ...line,
    preferred_product_id:
      typeof line['preferred_product_id'] === 'string' && productIds.has(line['preferred_product_id'])
        ? line['preferred_product_id']
        : null,
  }))

  const tables: Record<string, Row[]> = {
    categories: rows('SELECT * FROM categories'),
    glasses: rows('SELECT * FROM glasses'),
    ice_types: rows('SELECT * FROM ice_types'),
    recipes,
    ingredients,
    ingredient_aliases: aliases,
    products,
    recipe_lines: keptLines,
    recipe_history: history,
  }

  if (request.includePrivate) {
    tables['tasting_notes'] = rows(
      `SELECT * FROM tasting_notes WHERE deleted_at IS NULL AND ${among('recipe_id')}`,
      recipeList,
    )
    const entries = rows(
      `SELECT DISTINCT e.* FROM notebook_entries e JOIN notebook_links k ON k.entry_id = e.id
       WHERE e.deleted_at IS NULL AND k.deleted_at IS NULL AND k.entity_type = 'recipe' AND ${among('k.entity_id')}`,
      recipeList,
    )
    tables['notebook_entries'] = entries
    tables['notebook_links'] = rows(
      `SELECT * FROM notebook_links WHERE deleted_at IS NULL AND ${among('entry_id')}`,
      JSON.stringify(entries.map((entry) => entry['id'])),
    )
  }

  if (request.collectionId) {
    const collection = rows(
      'SELECT * FROM collections WHERE id = ? AND deleted_at IS NULL',
      request.collectionId,
    )
    if (collection.length > 0) {
      tables['collections'] = collection
      tables['collection_items'] = rows(
        `SELECT * FROM collection_items WHERE collection_id = ? AND deleted_at IS NULL AND ${among('recipe_id')}`,
        request.collectionId,
        recipeList,
      )
    }
  }
  return tables
}

/** Media paths stored in the rows (recipe and tasting photos, bottle images). */
const MEDIA_COLUMNS: Record<string, string> = {
  recipes: 'photo_path',
  tasting_notes: 'photo_path',
  products: 'image_path',
}

async function referencedMedia(
  mediaRoot: string,
  tables: Record<string, Row[]>,
): Promise<Map<string, Buffer>> {
  const media = new Map<string, Buffer>()
  for (const [table, column] of Object.entries(MEDIA_COLUMNS)) {
    for (const row of tables[table] ?? []) {
      const relative = row[column]
      if (typeof relative !== 'string' || media.has(relative)) continue
      const buffer = await readMedia(mediaRoot, relative)
      if (buffer) media.set(relative, buffer)
    }
  }
  return media
}

/** Every WebP file of the media folder whose path an archive may carry. */
async function allMedia(mediaRoot: string): Promise<Map<string, Buffer>> {
  const media = new Map<string, Buffer>()
  const entries = await readdir(mediaRoot, { recursive: true }).catch(() => [] as string[])
  for (const entry of entries) {
    const relative = entry.split(path.sep).join('/')
    const buffer = await readMedia(mediaRoot, relative)
    if (buffer) media.set(relative, buffer)
  }
  return media
}

/** A media file the archive can carry: a safe name, a WebP signature, within the size limit. */
async function readMedia(mediaRoot: string, relative: string): Promise<Buffer | null> {
  try {
    if (checkEntryName(`media/${relative}`) !== 'media') return null
  } catch {
    return null
  }
  const file = path.join(mediaRoot, ...relative.split('/'))
  const info = await stat(file).catch(() => null)
  if (!info?.isFile() || info.size > ARCHIVE_LIMITS.maxMediaBytes) return null
  const buffer = await readFile(file)
  return isWebp(buffer) ? buffer : null
}
