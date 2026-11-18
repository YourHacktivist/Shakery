import path from 'node:path'
import { normalizeName } from '../../core/normalize'
import { describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { SqliteReferenceRepository } from '../db/repositories/reference'
import { BUNDLED_SEED } from './bundled'
import { loadSeedData, validateSeedData } from './load'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')

describe('bundled seed data', () => {
  it('passes validation: unique keys and slugs, known parents, no cycle, nothing left to review', () => {
    const checked = validateSeedData(BUNDLED_SEED)
    expect(checked.categories.length).toBeGreaterThanOrEqual(50)
    expect(checked.categories.length).toBeLessThanOrEqual(100)
  })

  it('keeps the tree within three levels', () => {
    const parentOf = new Map(BUNDLED_SEED.categories.map((c) => [c.seed_key, c.parent]))
    for (const category of BUNDLED_SEED.categories) {
      let depth = 1
      let parent = category.parent
      while (parent) {
        depth += 1
        parent = parentOf.get(parent) ?? null
      }
      expect(depth, category.seed_key).toBeLessThanOrEqual(3)
    }
  })

  it('invents no glass capacity', () => {
    for (const glass of BUNDLED_SEED.glasses) expect(glass.capacity_ml, glass.seed_key).toBeNull()
  })

  it('loads into an empty notebook, then adds nothing the second time', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    const db = createDb(sqlite)
    const ids = {
      now: () => 1,
      newId: createUuidV7Generator(
        () => 1,
        (b) => b.fill(1),
      ),
    }
    const first = loadSeedData(db, ids, BUNDLED_SEED)
    expect(first).toEqual({
      categories: BUNDLED_SEED.categories.length,
      glasses: BUNDLED_SEED.glasses.length,
      ice: BUNDLED_SEED.ice.length,
      ingredients: BUNDLED_SEED.ingredients.length,
      recipes: BUNDLED_SEED.recipes.length,
    })
    expect(loadSeedData(db, ids, BUNDLED_SEED)).toEqual({
      categories: 0,
      glasses: 0,
      ice: 0,
      ingredients: 0,
      recipes: 0,
    })
    // Aliases are written and the ingredients can be found by the search index.
    const aliases = sqlite.prepare('SELECT COUNT(*) AS n FROM ingredient_aliases').get() as { n: number }
    expect(aliases.n).toBe(BUNDLED_SEED.ingredients.reduce((sum, item) => sum + item.aliases.length, 0))
    const indexed = sqlite
      .prepare("SELECT COUNT(*) AS n FROM search_index WHERE entity_type = 'ingredient'")
      .get() as { n: number }
    const preps = BUNDLED_SEED.recipes.filter((recipe) => recipe.kind === 'prep').length
    expect(indexed.n).toBe(BUNDLED_SEED.ingredients.length + preps)
    // Classic recipes are final, marked as IBA, and a cocktail can use a seed preparation.
    const negroni = sqlite
      .prepare(
        "SELECT r.status, r.origin, r.source, COUNT(l.id) AS lines FROM recipes r JOIN recipe_lines l ON l.recipe_id = r.id WHERE r.seed_key = 'iba.negroni' GROUP BY r.id",
      )
      .get() as { status: string; origin: string; source: string; lines: number }
    expect(negroni).toEqual({ status: 'final', origin: 'classic', source: 'seed_iba', lines: 3 })
    const zombie = sqlite
      .prepare(
        "SELECT COUNT(*) AS n FROM recipe_lines l JOIN ingredients i ON i.id = l.ingredient_id JOIN recipes r ON r.id = l.recipe_id WHERE r.seed_key = 'iba.zombie' AND i.prep_recipe_id IS NOT NULL",
      )
      .get() as { n: number }
    expect(zombie.n).toBe(1)
    const tree = new SqliteReferenceRepository(db).listCategories()
    expect(tree).toHaveLength(BUNDLED_SEED.categories.length)
    sqlite.close()
  })

  it('never recreates an ingredient the user deleted, nor duplicates one the user named alike', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    const db = createDb(sqlite)
    const ids = {
      now: () => 1,
      newId: createUuidV7Generator(
        () => 1,
        (b) => b.fill(2),
      ),
    }
    const [first, second] = BUNDLED_SEED.ingredients
    if (!first || !second) throw new Error('fixture')
    loadSeedData(db, ids, { ...BUNDLED_SEED, ingredients: [first], recipes: [] })
    sqlite.prepare('UPDATE ingredients SET deleted_at = 5 WHERE seed_key = ?').run(first.seed_key)
    const category = sqlite
      .prepare('SELECT category_id AS id FROM ingredients WHERE seed_key = ?')
      .get(first.seed_key) as { id: string }
    // The user already has the second ingredient under the same name, without a seed key.
    const secondCategory = sqlite
      .prepare('SELECT id FROM categories WHERE seed_key = ?')
      .get(second.category) as {
      id: string
    }
    sqlite
      .prepare(
        "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id, source) VALUES ('mine', 1, 1, ?, ?, ?, 'user')",
      )
      .run(second.name, normalizeName(second.name), secondCategory.id)
    const report = loadSeedData(db, ids, BUNDLED_SEED)
    expect(report.ingredients).toBe(BUNDLED_SEED.ingredients.length - 2)
    expect(category.id).toBeTruthy()
    const live = sqlite
      .prepare('SELECT COUNT(*) AS n FROM ingredients WHERE seed_key = ? AND deleted_at IS NULL')
      .get(first.seed_key) as { n: number }
    expect(live.n).toBe(0)
    sqlite.close()
  })

  it('gives a free slug to a new entry whose slug a user category already holds', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    const db = createDb(sqlite)
    const ids = {
      now: () => 1,
      newId: createUuidV7Generator(
        () => 1,
        (b) => b.fill(2),
      ),
    }
    sqlite
      .prepare(
        "INSERT INTO categories (id, created_at, updated_at, name, slug) VALUES ('mine', 1, 1, 'Spiritueux perso', 'spiritueux')",
      )
      .run()
    loadSeedData(db, ids, BUNDLED_SEED)
    const slugs = new SqliteReferenceRepository(db).listCategories().map((c) => c.slug)
    expect(slugs).toContain('spiritueux')
    expect(slugs).toContain('spiritueux-2')
    sqlite.close()
  })

  it('gives every parent a batch hint at least as strict as its children', () => {
    const rank = { ok: 0, add_at_service: 1, fresh: 2 } as const
    for (const parent of BUNDLED_SEED.categories) {
      for (const child of BUNDLED_SEED.categories.filter((c) => c.parent === parent.seed_key)) {
        expect(rank[parent.batch_hint], `${parent.seed_key} > ${child.seed_key}`).toBeGreaterThanOrEqual(
          rank[child.batch_hint],
        )
      }
    }
  })
})
