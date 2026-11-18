import { normalizeName } from '../../../core/normalize'
import type { Sqlite } from '../connection'

export type IndexedEntity = 'recipe' | 'ingredient' | 'product' | 'notebook_entry' | 'tasting_note' | 'sheet'

/**
 * Keeps the FTS5 table in step with the writes (section 12.1): called by the repositories in
 * the same transaction. Texts are stored normalized (lower case, no accents).
 */
export function indexEntity(
  sqlite: Sqlite,
  entity: IndexedEntity,
  id: string,
  fields: { title: string; aliases?: readonly string[]; body?: readonly (string | null)[] },
): void {
  removeFromIndex(sqlite, entity, id)
  sqlite
    .prepare('INSERT INTO search_index (entity_type, entity_id, title, aliases, body) VALUES (?, ?, ?, ?, ?)')
    .run(
      entity,
      id,
      normalizeName(fields.title),
      (fields.aliases ?? []).map(normalizeName).join(' | '),
      (fields.body ?? [])
        .filter((part): part is string => Boolean(part))
        .map(normalizeName)
        .join('\n'),
    )
}

export function removeFromIndex(sqlite: Sqlite, entity: IndexedEntity, id: string): void {
  sqlite.prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?').run(entity, id)
}
