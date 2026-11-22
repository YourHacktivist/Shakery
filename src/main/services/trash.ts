/**
 * The trash (section 10.14, D-043). Deleting is logical everywhere (section 7); a row leaves
 * for good only when the trash is emptied, which the caller does after a verified backup.
 *
 * Two kinds of rows stay as tombstones, hidden from the trash once it is emptied:
 * - an entry of the seed, whose row is the trace of its seed_key: removed, the next start of
 *   Shakery would load it again;
 * - a row something alive still refers to.
 * Nothing alive is ever removed, except what belongs to a deleted recipe and could not live
 * without it (its versions, its tastings).
 */
import type { Statement } from 'better-sqlite3'
import { DomainError } from '../errors'
import type { TrashKind, Trash, TrashItem } from '../../shared/domain/trash'
import { TRASH_SHOWN } from '../../shared/domain/trash'
import type { Db, Ids } from '../db/client'
import { indexRows, type RowEntity } from '../db/repositories/index-rows'
import { SqliteSettingsRepository } from '../db/repositories/settings'

const TABLE_OF: Readonly<Record<TrashKind, string>> = {
  recipe: 'recipes',
  ingredient: 'ingredients',
  product: 'products',
  tasting_note: 'tasting_notes',
  notebook_entry: 'notebook_entries',
  prep_batch: 'prep_batches',
  collection: 'collections',
}

/** One SELECT per kind, each with the same four columns and one parameter: emptied since when. */
const DELETED = `
  SELECT 'recipe' AS kind, r.id, r.name AS title, r.deleted_at AS deletedAt
    FROM recipes r WHERE r.deleted_at > @since
  UNION ALL
  SELECT 'ingredient', i.id, i.name, i.deleted_at
    FROM ingredients i
   WHERE i.deleted_at > @since
     -- A merged ingredient became the alias of another: it was not thrown away.
     AND NOT EXISTS (
       SELECT 1 FROM ingredient_aliases a
        WHERE a.alias_normalized = i.name_normalized AND a.ingredient_id <> i.id AND a.deleted_at IS NULL)
  UNION ALL
  SELECT 'product', p.id, TRIM(COALESCE(p.brand, '') || ' ' || p.name), p.deleted_at
    FROM products p WHERE p.deleted_at > @since
  UNION ALL
  SELECT 'tasting_note', t.id, r.name, t.deleted_at
    FROM tasting_notes t JOIN recipes r ON r.id = t.recipe_id WHERE t.deleted_at > @since
  UNION ALL
  SELECT 'notebook_entry', n.id, n.title, n.deleted_at
    FROM notebook_entries n WHERE n.deleted_at > @since
  UNION ALL
  SELECT 'prep_batch', b.id, r.name, b.deleted_at
    FROM prep_batches b JOIN recipes r ON r.id = b.recipe_id WHERE b.deleted_at > @since
  UNION ALL
  SELECT 'collection', c.id, c.name, c.deleted_at
    FROM collections c WHERE c.deleted_at > @since`

function sqliteCode(error: unknown): string {
  return error instanceof Error && 'code' in error ? String(error.code) : ''
}

export class TrashService {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
  ) {}

  list(): Trash {
    const since = this.settings().get('trash.emptiedAt')
    const { total } = this.db.$client
      .prepare(`SELECT COUNT(*) AS total FROM (${DELETED})`)
      .get({ since }) as { total: number }
    const items = this.db.$client
      .prepare(`SELECT * FROM (${DELETED}) ORDER BY deletedAt DESC, title LIMIT ${String(TRASH_SHOWN)}`)
      .all({ since }) as TrashItem[]
    return { items, total }
  }

  /** Puts an entry back, with what it cannot live without: its recipe, its ingredients. */
  restore(kind: TrashKind, id: string): void {
    const sqlite = this.db.$client
    const since = this.settings().get('trash.emptiedAt')
    const inTrash = sqlite.prepare(`SELECT 1 FROM (${DELETED}) WHERE kind = @kind AND id = @id`)
    if (!inTrash.get({ since, kind, id })) throw new DomainError('NOT_FOUND', 'Not in the trash')
    try {
      sqlite.transaction(() => {
        this.revive(kind, id)
      })()
    } catch (error) {
      if (sqliteCode(error) === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new DomainError('CONFLICT', 'An entry of the same name took its place')
      }
      throw error
    }
  }

  private revive(kind: TrashKind, id: string): void {
    const sqlite = this.db.$client
    const table = TABLE_OF[kind]
    const changed = sqlite
      .prepare(
        `UPDATE ${table} SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`,
      )
      .run(this.ids.now(), id).changes
    if (changed === 0) return

    if (kind === 'recipe') {
      const needed = sqlite
        .prepare(
          `SELECT i.id FROM ingredients i
            WHERE i.deleted_at IS NOT NULL
              AND (i.prep_recipe_id = @id OR i.id IN (
                SELECT ingredient_id FROM recipe_lines WHERE recipe_id = @id AND deleted_at IS NULL))`,
        )
        .all({ id }) as Array<{ id: string }>
      for (const ingredient of needed) this.revive('ingredient', ingredient.id)
    } else if (kind === 'product') {
      const { owner } = sqlite
        .prepare('SELECT ingredient_id AS owner FROM products WHERE id = ?')
        .get(id) as {
        owner: string
      }
      this.revive('ingredient', owner)
    } else if (kind === 'tasting_note' || kind === 'prep_batch') {
      const { owner } = sqlite.prepare(`SELECT recipe_id AS owner FROM ${table} WHERE id = ?`).get(id) as {
        owner: string
      }
      this.revive('recipe', owner)
    }

    const indexed: readonly RowEntity[] = [
      'recipe',
      'ingredient',
      'product',
      'notebook_entry',
      'tasting_note',
    ]
    const entity = indexed.find((name) => name === kind)
    if (entity) indexRows(this.db, [{ entity, id }])
  }

  /** Removes for good. The backup before it is the caller's. Returns the rows removed. */
  empty(): { removed: number } {
    const sqlite = this.db.$client
    const now = this.ids.now()
    let removed = 0

    const exec = (sql: string) => sqlite.prepare(sql).run().changes
    const idsOf = (sql: string) => (sqlite.prepare(sql).all() as Array<{ id: string }>).map((row) => row.id)
    /** Removes each row alone: one still referred to stays as a tombstone. */
    const removeEach = (ids: readonly string[], statement: Statement) => {
      for (const id of ids) {
        try {
          removed += statement.run(id).changes
        } catch (error) {
          if (!sqliteCode(error).startsWith('SQLITE_CONSTRAINT')) throw error
        }
      }
    }

    sqlite.transaction(() => {
      for (const table of ['tasting_notes', 'notebook_entries', 'prep_batches', 'collections']) {
        removed += exec(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`)
      }
      exec('DELETE FROM collection_items WHERE deleted_at IS NOT NULL')
      // The lines replaced by each edit: the versions keep their own snapshot.
      exec('DELETE FROM recipe_lines WHERE deleted_at IS NOT NULL')

      const deletedRecipe = 'SELECT id FROM recipes WHERE deleted_at IS NOT NULL'
      // A deleted classic keeps its bare row, the trace of its seed_key.
      const deletedClassic = `${deletedRecipe} AND seed_key IS NOT NULL`
      for (const table of ['recipe_lines', 'recipe_history', 'tasting_notes']) {
        exec(`DELETE FROM ${table} WHERE recipe_id IN (${deletedClassic})`)
      }
      exec(
        `UPDATE recipes SET notes = NULL, photo_path = NULL WHERE deleted_at IS NOT NULL AND seed_key IS NOT NULL`,
      )

      const ownRecipe = `${deletedRecipe} AND seed_key IS NULL`
      exec(`UPDATE recipes SET parent_recipe_id = NULL WHERE parent_recipe_id IN (${ownRecipe})`)
      exec(`UPDATE ingredients SET prep_recipe_id = NULL WHERE prep_recipe_id IN (${ownRecipe})`)
      removeEach(idsOf(ownRecipe), sqlite.prepare('DELETE FROM recipes WHERE id = ?'))

      const deletedProduct = 'SELECT id FROM products WHERE deleted_at IS NOT NULL'
      exec(
        `UPDATE recipe_lines SET preferred_product_id = NULL WHERE preferred_product_id IN (${deletedProduct})`,
      )
      removeEach(idsOf(deletedProduct), sqlite.prepare('DELETE FROM products WHERE id = ?'))

      removeEach(
        idsOf('SELECT id FROM ingredients WHERE deleted_at IS NOT NULL AND seed_key IS NULL'),
        sqlite.prepare('DELETE FROM ingredients WHERE id = ?'),
      )

      exec(
        `DELETE FROM search_index
          WHERE entity_type = 'tasting_note' AND entity_id NOT IN (SELECT id FROM tasting_notes)`,
      )
      this.settings().set('trash.emptiedAt', now)
    })()
    return { removed }
  }

  private settings(): SqliteSettingsRepository {
    return new SqliteSettingsRepository(this.db, this.ids.now)
  }
}
