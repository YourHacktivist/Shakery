import { normalizeName } from '../../../core/normalize'
import type { Sqlite } from '../connection'

export type IndexedEntity = 'recipe' | 'ingredient' | 'product' | 'notebook_entry' | 'tasting_note' | 'sheet'

export type IndexedFields = {
  title: string
  aliases?: readonly string[]
  body?: readonly (string | null)[]
}

export const INSERT_INDEX_ROW =
  'INSERT INTO search_index (entity_type, entity_id, title, aliases, body) VALUES (?, ?, ?, ?, ?)'

/** Normalised title, aliases and body of a row of the index. */
export function indexValues(fields: IndexedFields): [string, string, string] {
  return [
    normalizeName(fields.title),
    (fields.aliases ?? []).map(normalizeName).join(' | '),
    (fields.body ?? [])
      .filter((part): part is string => Boolean(part))
      .map(normalizeName)
      .join('\n'),
  ]
}

/**
 * Keeps the FTS5 table in step with the writes (section 12.1): called by the repositories in
 * the same transaction. Texts are stored normalized (lower case, no accents).
 *
 * `fresh`: the entity was just created and cannot be in the index yet, so the removal is
 * skipped. entity_type and entity_id are unindexed columns of the FTS5 table: removing a row
 * scans the whole table, which made loading thousands of seed recipes quadratic.
 */
export function indexEntity(
  sqlite: Sqlite,
  entity: IndexedEntity,
  id: string,
  fields: IndexedFields,
  options: { fresh?: boolean } = {},
): void {
  if (!options.fresh) removeFromIndex(sqlite, entity, id)
  sqlite.prepare(INSERT_INDEX_ROW).run(entity, id, ...indexValues(fields))
}

export function removeFromIndex(sqlite: Sqlite, entity: IndexedEntity, id: string): void {
  sqlite.prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?').run(entity, id)
}
