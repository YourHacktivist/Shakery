/**
 * The row of the search index (section 12.1) of what is already written: for the imports, the
 * restores from the trash and the rebuild asked in the settings (D-043). Same fields as the
 * repositories give when they write.
 */
import type { Db } from '../client'
import { recipeIndexFields } from './recipes'
import { INSERT_INDEX_ROW, indexValues, removeFromIndex, type IndexedFields } from './search-index'

export type RowEntity = 'recipe' | 'ingredient' | 'product' | 'notebook_entry' | 'tasting_note'

const ENTITIES: readonly RowEntity[] = ['recipe', 'ingredient', 'product', 'notebook_entry', 'tasting_note']

const TABLE_OF: Readonly<Record<RowEntity, string>> = {
  recipe: 'recipes',
  ingredient: 'ingredients',
  product: 'products',
  notebook_entry: 'notebook_entries',
  tasting_note: 'tasting_notes',
}

type Row = Record<string, unknown>

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function list(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/** Reads a live row of an entity as the fields of the index, with statements prepared once. */
function fieldsReader(db: Db): (entity: RowEntity, id: string) => IndexedFields | null {
  const sqlite = db.$client
  const live = {
    recipe: sqlite.prepare(
      'SELECT name, notes, garnish, profile, credit, steps, tags FROM recipes WHERE id = ? AND deleted_at IS NULL',
    ),
    ingredient: sqlite.prepare(
      'SELECT name, description FROM ingredients WHERE id = ? AND deleted_at IS NULL',
    ),
    product: sqlite.prepare(
      'SELECT name, brand, personal_notes FROM products WHERE id = ? AND deleted_at IS NULL',
    ),
    notebook_entry: sqlite.prepare(
      'SELECT title, body, tags FROM notebook_entries WHERE id = ? AND deleted_at IS NULL',
    ),
    tasting_note: sqlite.prepare(
      `SELECT r.name, t.comment, t.next_step FROM tasting_notes t JOIN recipes r ON r.id = t.recipe_id
        WHERE t.id = ? AND t.deleted_at IS NULL`,
    ),
  }
  const aliases = sqlite.prepare(
    'SELECT alias FROM ingredient_aliases WHERE ingredient_id = ? AND deleted_at IS NULL',
  )

  return (entity, id) => {
    const row = live[entity].get(id) as Row | undefined
    if (!row) return null
    switch (entity) {
      case 'recipe':
        return recipeIndexFields({
          name: String(row['name']),
          notes: text(row['notes']),
          garnish: text(row['garnish']),
          profile: text(row['profile']),
          credit: text(row['credit']),
          steps: list(row['steps']),
          tags: list(row['tags']),
        })
      case 'ingredient':
        return {
          title: String(row['name']),
          aliases: (aliases.all(id) as Array<{ alias: string }>).map((item) => item.alias),
          body: [text(row['description'])],
        }
      case 'product':
        return {
          title: String(row['name']),
          aliases: [text(row['brand']) ?? ''],
          body: [text(row['personal_notes'])],
        }
      case 'notebook_entry':
        return { title: String(row['title']), aliases: list(row['tags']), body: [text(row['body'])] }
      case 'tasting_note':
        return { title: String(row['name']), body: [text(row['comment']), text(row['next_step'])] }
    }
  }
}

/**
 * Writes the index row of each entity as the tables hold it now, and removes it for a deleted
 * one. `fresh` rows cannot be in the index yet, which skips a scan of the FTS5 table.
 */
export function indexRows(
  db: Db,
  rows: Iterable<{ entity: RowEntity; id: string }>,
  fresh: ReadonlySet<string> = new Set(),
): void {
  const read = fieldsReader(db)
  const insert = db.$client.prepare(INSERT_INDEX_ROW)
  for (const { entity, id } of rows) {
    if (!fresh.has(id)) removeFromIndex(db.$client, entity, id)
    const fields = read(entity, id)
    if (fields) insert.run(entity, id, ...indexValues(fields))
  }
}

/** The whole index again, from the tables. Returns the rows written. */
export function rebuildSearchIndex(db: Db): number {
  const sqlite = db.$client
  return sqlite.transaction(() => {
    const read = fieldsReader(db)
    const insert = sqlite.prepare(INSERT_INDEX_ROW)
    let written = 0
    for (const entity of ENTITIES) {
      sqlite.prepare('DELETE FROM search_index WHERE entity_type = ?').run(entity)
      const ids = sqlite
        .prepare(`SELECT id FROM ${TABLE_OF[entity]} WHERE deleted_at IS NULL`)
        .all() as Array<{ id: string }>
      for (const { id } of ids) {
        const fields = read(entity, id)
        if (!fields) continue
        insert.run(entity, id, ...indexValues(fields))
        written += 1
      }
    }
    return written
  })()
}
