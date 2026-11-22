import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { recipeFacetsSchema, NO_SPIRIT, type RecipeFacets } from '../../shared/domain/facets'
import { createDb, systemIds, type Db } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { SqliteReferenceRepository } from '../db/repositories/reference'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from '../seed/bundled'
import { loadSeedData } from '../seed/load'
import { recipeFacets } from './facets'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
const CLASSICS = path.resolve(__dirname, '../../../resources/seed', CLASSICS_FILE)

let sqlite: ReturnType<typeof openDatabase>
let db: Db
let facets: Map<string, RecipeFacets>
let milliseconds: number

beforeAll(() => {
  sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  loadSeedData(db, systemIds(), withClassics(BUNDLED_SEED, CLASSICS))
  const started = performance.now()
  const list = recipeFacets(db)
  milliseconds = performance.now() - started
  facets = new Map(list.map((facet) => [facet.id, facet]))
}, 120_000)

afterAll(() => {
  sqlite.close()
})

function named(name: string): RecipeFacets {
  const { id } = sqlite.prepare('SELECT id FROM recipes WHERE name = ?').get(name) as { id: string }
  const facet = facets.get(id)
  if (!facet) throw new Error(name)
  return facet
}

describe('recipeFacets (D-040)', () => {
  it('reads every recipe of the seed, fast and within the schema', () => {
    expect(facets.size).toBeGreaterThan(7000)
    expect(milliseconds).toBeLessThan(4000)
    for (const facet of facets.values()) recipeFacetsSchema.parse(facet)
  })

  it('gives the base spirit, none for a drink without spirit', () => {
    const name = (id: string) =>
      new SqliteReferenceRepository(db).listCategories().find((category) => category.id === id)?.slug
    expect(name(named('Negroni').spirit)).toBe('gin-et-genievre')
    expect(name(named('Manhattan').spirit)).toBe('whiskies')
    expect(name(named('Daiquiri').spirit)).toBe('rhums')
    expect(named('Spritz').spirit).toBe(NO_SPIRIT)
  })

  it('declares the allergens a guest would ask about', () => {
    expect(named('Mai Tai').allergens).toContain('nuts')
    expect(named('Alexander').allergens).toContain('milk')
    expect(named('Pisco Sour').allergens).toContain('eggs')
    expect(named('Manhattan').allergens).toContain('sulphites')
    expect(named('Bloody Mary').allergens).toEqual(expect.arrayContaining(['fish', 'celery']))
    expect(named('Daiquiri').allergens).toEqual([])
  })

  it('never misses an allergen that a line declares by its ingredient', () => {
    const rows = sqlite
      .prepare(
        `SELECT l.recipe_id AS id, i.allergens AS codes
           FROM recipe_lines l JOIN ingredients i ON i.id = l.ingredient_id
          WHERE l.deleted_at IS NULL AND i.allergens <> '[]'`,
      )
      .all() as Array<{ id: string; codes: string }>
    expect(rows.length).toBeGreaterThan(3000)
    const missing = rows.filter((row) =>
      (JSON.parse(row.codes) as string[]).some(
        (code) => !facets.get(row.id)?.allergens.some((found) => found === code),
      ),
    )
    expect(missing).toEqual([])
  })

  it('reads the allergen written in the note of a line', () => {
    const rows = sqlite
      .prepare("SELECT DISTINCT recipe_id AS id FROM recipe_lines WHERE note LIKE '%cacahuète%'")
      .all() as Array<{ id: string }>
    expect(rows.length).toBeGreaterThan(0)
    for (const { id } of rows) expect(facets.get(id)?.allergens).toContain('peanuts')
  })
})
