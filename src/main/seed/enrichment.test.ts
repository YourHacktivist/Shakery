import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { TYPICAL_STEPS_CREDIT } from '../../shared/classics'
import { createDb, type Db } from '../db/client'
import { openDatabase } from '../db/connection'
import { computeRecipe } from '../db/facts'
import { runMigrations } from '../db/migrate'
import { IngredientRepository } from '../db/repositories/ingredients'
import { RecipeRepository } from '../db/repositories/recipes'
import { SearchRepository } from '../db/repositories/search'
import { createZonesCache } from '../services/zones'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from './bundled'
import { loadSeedData, type SeedData } from './load'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
const FILE = path.resolve(__dirname, '../../../resources/seed', CLASSICS_FILE)

/** The seed of today, and the same as it was before D-039: no degree, family nor steps. */
const all = withClassics(BUNDLED_SEED, FILE)
const classics = all.recipes.filter((recipe) => recipe.seed_key.startsWith('classic.')).slice(0, 300)
const today: SeedData = { ...BUNDLED_SEED, recipes: [...BUNDLED_SEED.recipes, ...classics] }
const before: SeedData = {
  ...BUNDLED_SEED,
  ingredients: BUNDLED_SEED.ingredients.map((item) =>
    item.composition_source === null ? { ...item, default_abv: null } : item,
  ),
  recipes: [
    ...BUNDLED_SEED.recipes,
    ...classics.map((recipe) => ({ ...recipe, family: null, steps: [], credit: null })),
  ],
}

let sqlite: ReturnType<typeof openDatabase>
let db: Db
let recipes: RecipeRepository
let clock: number
const ids = {
  now: () => (clock += 1),
  newId: createUuidV7Generator(
    () => clock,
    (bytes) => bytes.fill(3),
  ),
}

beforeEach(() => {
  clock = 100
  sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  recipes = new RecipeRepository(db, ids, new IngredientRepository(db, ids))
})

afterEach(() => {
  sqlite.close()
})

function idOf(seedKey: string | undefined): string {
  return (sqlite.prepare('SELECT id FROM recipes WHERE seed_key = ?').get(seedKey) as { id: string }).id
}

describe('classics completed (D-039)', () => {
  it('completes a notebook loaded earlier without marking its classics as changed', () => {
    loadSeedData(db, ids, before)
    const seed = classics.find((recipe) => recipe.family !== null && recipe.steps.length > 0)
    const id = idOf(seed?.seed_key)
    expect(recipes.get(id).steps).toEqual([])

    expect(loadSeedData(db, ids, today).recipes).toBe(0)

    const detail = recipes.get(id)
    expect(detail).toMatchObject({
      family: seed?.family,
      steps: seed?.steps,
      credit: TYPICAL_STEPS_CREDIT,
      version: 1,
    })
    expect(detail.updatedAt).toBe(detail.createdAt)
    expect(recipes.getVersion(id, 1)).toEqual({ ...detail, history: [] })

    const gin = sqlite
      .prepare("SELECT default_abv AS abv, created_at, updated_at FROM ingredients WHERE name = 'Gin'")
      .get() as { abv: number; created_at: number; updated_at: number }
    expect(gin.abv).toBe(37.5)
    expect(gin.updated_at).toBe(gin.created_at)
  })

  it('never replaces what the user changed', () => {
    loadSeedData(db, ids, before)
    const id = idOf(classics[0]?.seed_key)
    const {
      id: _id,
      version: _v,
      isFavorite: _f,
      createdAt: _c,
      updatedAt: _u,
      history: _h,
      lines,
      ...rest
    } = recipes.get(id)
    recipes.update(id, {
      ...rest,
      steps: ['À ma façon.'],
      lines: lines.map(({ id: _line, ...line }) => line),
    })
    sqlite.prepare("UPDATE ingredients SET updated_at = updated_at + 9 WHERE name = 'Gin'").run()

    loadSeedData(db, ids, today)

    expect(recipes.get(id)).toMatchObject({ steps: ['À ma façon.'], family: null, credit: null })
    const gin = sqlite.prepare("SELECT default_abv AS abv FROM ingredients WHERE name = 'Gin'").get() as {
      abv: number | null
    }
    expect(gin.abv).toBeNull()
  })

  it('keeps the standard steps out of the search, and the steps of the user in it', () => {
    loadSeedData(db, ids, today)
    const search = new SearchRepository(db)
    const id = idOf(classics.find((recipe) => recipe.steps.length > 0)?.seed_key)
    const generated = new Set(classics.map((recipe) => idOf(recipe.seed_key)))
    const found = search.search('énergiquement', 50).filter((hit) => generated.has(hit.id))
    expect(found.map((hit) => hit.title)).toEqual([])

    const {
      id: _id,
      version: _v,
      isFavorite: _f,
      createdAt: _c,
      updatedAt: _u,
      history: _h,
      lines,
      ...rest
    } = recipes.get(id)
    const saved = recipes.update(id, {
      ...rest,
      steps: ['Passer au chinois zinzolin.'],
      lines: lines.map(({ id: _line, ...line }) => line),
    })
    expect(saved.credit).toBeNull()
    expect(search.search('zinzolin', 5)[0]?.id).toBe(id)
  })

  it('gives the zones read at once the values of each recipe computed alone', () => {
    loadSeedData(db, ids, today)
    const zones = createZonesCache().get(db, recipes)
    const zone = zones['sour']?.abv
    expect(zone?.recipeIds.length).toBeGreaterThan(20)

    const values = (zone?.recipeIds ?? [])
      .map((id) => computeRecipe(db, { id, data: recipes.get(id) }).abv.value ?? Number.NaN)
      .sort((a, b) => a - b)
    const at = (p: number) => {
      const rank = (values.length - 1) * p
      const low = values[Math.floor(rank)] ?? 0
      return low + ((values[Math.ceil(rank)] ?? low) - low) * (rank - Math.floor(rank))
    }
    expect(zone?.from).toBeCloseTo(at(0.25), 9)
    expect(zone?.to).toBeCloseTo(at(0.75), 9)
  })
})
