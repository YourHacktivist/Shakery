import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../../core/uuid'
import { BUNDLED_SEED } from '../../seed/bundled'
import { loadSeedData } from '../../seed/load'
import { createDb, type Db, type Ids } from '../client'
import { openDatabase } from '../connection'
import { computeRecipe } from '../facts'
import { runMigrations } from '../migrate'
import { categories } from '../schema'
import { IngredientRepository } from './ingredients'
import { ProductRepository } from './products'
import { RecipeRepository } from './recipes'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

let db: Db
let ids: Ids
let clock: number
let ingredientsRepo: IngredientRepository
let productsRepo: ProductRepository
let recipesRepo: RecipeRepository
let cat: (seedKey: string) => string

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  clock = 1_000
  ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(3),
    ),
  }
  loadSeedData(db, ids, BUNDLED_SEED)
  const bySeed = new Map(
    db
      .select()
      .from(categories)
      .all()
      .map((c) => [c.seedKey, c.id]),
  )
  cat = (seedKey) => bySeed.get(seedKey) ?? ''
  ingredientsRepo = new IngredientRepository(db, ids)
  productsRepo = new ProductRepository(db, ids)
  recipesRepo = new RecipeRepository(db, ids, ingredientsRepo)
})

function search(term: string): string[] {
  return (
    db.$client
      .prepare('SELECT entity_id FROM search_index WHERE search_index MATCH ?')
      .all(`"${term}"`) as Array<{ entity_id: string }>
  ).map((r) => r.entity_id)
}

describe('IngredientRepository', () => {
  it('creates an ingredient with aliases, indexed for search, and refuses a duplicate', () => {
    const gin = ingredientsRepo.create({
      name: 'Gin London Dry',
      categoryId: cat('cat.spirits.gin'),
      defaultAbv: 40,
      aliases: ['London Dry'],
    })
    expect(gin.aliases).toEqual(['London Dry'])
    expect(search('london')).toContain(gin.id)
    expect(() =>
      ingredientsRepo.create({ name: 'gin london dry', categoryId: cat('cat.spirits.gin') }),
    ).toThrow(/already exists/)
    expect(() => ingredientsRepo.create({ name: 'London dry', categoryId: cat('cat.spirits.gin') })).toThrow(
      /already exists/,
    )
    // Another category is fine.
    expect(() =>
      ingredientsRepo.create({ name: 'Gin London Dry', categoryId: cat('cat.preps.infusions') }),
    ).not.toThrow()
  })

  it('merges a duplicate: lines and bottles move, the old name becomes an alias', () => {
    const a = ingredientsRepo.create({ name: 'Cointreau', categoryId: cat('cat.liqueurs.orange') })
    const b = ingredientsRepo.create({
      name: 'Triple sec',
      categoryId: cat('cat.liqueurs.orange'),
      aliases: ['Curaçao blanc'],
    })
    const bottle = productsRepo.create({
      ingredientId: a.id,
      name: 'Cointreau 70 cl',
      abv: 40,
      volumeMl: 700,
    })
    const recipe = recipesRepo.create({
      name: 'Margarita',
      lines: [{ ingredientId: a.id, quantity: 20, unit: 'ml' }],
    })
    const merged = ingredientsRepo.merge(a.id, b.id)
    expect(merged.aliases).toEqual(['Cointreau', 'Curaçao blanc'])
    expect(productsRepo.get(bottle.id).ingredientId).toBe(b.id)
    expect(recipesRepo.get(recipe.id).lines[0]?.ingredientId).toBe(b.id)
    expect(() => ingredientsRepo.get(a.id)).toThrow()
    expect(() => ingredientsRepo.merge(b.id, b.id)).toThrow()
  })

  it('refuses to delete an ingredient a recipe uses', () => {
    const lime = ingredientsRepo.create({ name: 'Citron vert', categoryId: cat('cat.fruits.fresh') })
    recipesRepo.create({ name: 'Daiquiri', lines: [{ ingredientId: lime.id, quantity: 20, unit: 'ml' }] })
    expect(() => {
      ingredientsRepo.delete(lime.id)
    }).toThrow(/merge/)
    const unused = ingredientsRepo.create({ name: 'Yuzu', categoryId: cat('cat.fruits.fresh') })
    ingredientsRepo.delete(unused.id)
    expect(ingredientsRepo.list().some((i) => i.id === unused.id)).toBe(false)
  })
})

describe('ProductRepository', () => {
  it('requires the price basis and keeps pack quantity and unit together', () => {
    const gin = ingredientsRepo.create({ name: 'Gin', categoryId: cat('cat.spirits.gin') })
    expect(() => productsRepo.create({ ingredientId: gin.id, name: 'X', purchasePriceCents: 1600 })).toThrow()
    expect(() => productsRepo.create({ ingredientId: gin.id, name: 'X', packQuantity: 10 })).toThrow()
    const bottle = productsRepo.create({
      ingredientId: gin.id,
      name: 'Beefeater',
      purchasePriceCents: 1600,
      purchasePriceBasis: 'ht',
      volumeMl: 700,
    })
    expect(productsRepo.setOwned(bottle.id, true).owned).toBe(true)
    expect(productsRepo.listByIngredient(gin.id)).toHaveLength(1)
    productsRepo.delete(bottle.id)
    expect(productsRepo.listByIngredient(gin.id)).toHaveLength(0)
  })
})

describe('RecipeRepository', () => {
  it('versions a recipe, allows a simple correction, and keeps snapshots', () => {
    const gin = ingredientsRepo.create({ name: 'Gin', categoryId: cat('cat.spirits.gin'), defaultAbv: 40 })
    const created = recipesRepo.create({
      name: 'Negroni',
      lines: [{ ingredientId: gin.id, quantity: 30, unit: 'ml' }],
    })
    expect(created.version).toBe(1)
    const v2 = recipesRepo.update(created.id, {
      name: 'Negroni',
      lines: [{ ingredientId: gin.id, quantity: 35, unit: 'ml' }],
    })
    expect(v2.version).toBe(2)
    const corrected = recipesRepo.update(
      created.id,
      { name: 'Négroni', lines: [{ ingredientId: gin.id, quantity: 35, unit: 'ml' }] },
      { newVersion: false },
    )
    expect(corrected.version).toBe(2)
    expect(corrected.history.map((h) => h.version)).toEqual([2, 1])
    expect(search('negroni')).toContain(created.id)
  })

  it('creates a variant, deletes then restores a recipe', () => {
    const original = recipesRepo.create({ name: 'Daiquiri', family: 'sour', method: 'shake' })
    const variant = recipesRepo.createVariant(original.id, 'Daiquiri fraise')
    expect(variant).toMatchObject({
      parentRecipeId: original.id,
      status: 'draft',
      family: 'sour',
      version: 1,
    })
    recipesRepo.delete(variant.id)
    expect(recipesRepo.list().some((r) => r.id === variant.id)).toBe(false)
    expect(search('fraise')).toEqual([])
    recipesRepo.restore(variant.id)
    expect(search('fraise')).toEqual([variant.id])
  })

  it('notes a quick idea, matching known ingredients and creating the others in « À classer »', () => {
    const gin = ingredientsRepo.create({ name: 'Gin', categoryId: cat('cat.spirits.gin') })
    const idea = recipesRepo.quickIdea({
      name: 'Gin rhubarbe',
      ingredients: ['gin', 'Sirop de rhubarbe'],
      note: 'Tester',
    })
    expect(idea.status).toBe('idea')
    expect(idea.lines.map((l) => l.ingredientId)[0]).toBe(gin.id)
    const created = ingredientsRepo.get(idea.lines[1]?.ingredientId ?? '')
    expect(created).toMatchObject({ name: 'Sirop de rhubarbe', categoryId: cat('cat.unsorted') })
  })

  it('makes a preparation an ingredient and refuses a preparation that uses itself', () => {
    const sugar = ingredientsRepo.create({
      name: 'Sucre',
      categoryId: cat('cat.sweeteners.sugars'),
      sugarGPerL: 1000,
    })
    const syrup = recipesRepo.create({
      name: 'Sirop simple',
      kind: 'prep',
      prepCategoryId: cat('cat.preps.syrups'),
      yieldMl: 750,
      lines: [{ ingredientId: sugar.id, quantity: 500, unit: 'ml' }],
    })
    const syrupIngredient = ingredientsRepo.list().find((i) => i.prepRecipeId === syrup.id)
    expect(syrupIngredient).toMatchObject({ name: 'Sirop simple', categoryId: cat('cat.preps.syrups') })
    expect(() =>
      recipesRepo.update(syrup.id, {
        name: 'Sirop simple',
        kind: 'prep',
        lines: [{ ingredientId: syrupIngredient?.id ?? '', quantity: 10, unit: 'ml' }],
      }),
    ).toThrow(/cannot use itself/)
  })

  it('refuses a line on an unknown ingredient', () => {
    expect(() =>
      recipesRepo.create({ name: 'X', lines: [{ ingredientId: 'nope', quantity: 1, unit: 'ml' }] }),
    ).toThrow()
  })
})

describe('computeRecipe', () => {
  it('computes the panel of a draft from the database', () => {
    const gin = ingredientsRepo.create({
      name: 'Gin',
      categoryId: cat('cat.spirits.gin'),
      defaultAbv: 40,
      sugarGPerL: 0,
      acidGPerL: 0,
    })
    const egg = ingredientsRepo.create({
      name: 'Blanc d’œuf',
      categoryId: cat('cat.dairy.eggs'),
      allergens: ['eggs'],
    })
    productsRepo.create({
      ingredientId: gin.id,
      name: 'Beefeater',
      purchasePriceCents: 1600,
      purchasePriceBasis: 'ht',
      volumeMl: 700,
      owned: true,
    })
    const result = computeRecipe(db, {
      id: 'draft',
      data: {
        kind: 'cocktail',
        method: 'shake',
        dilutionOverridePct: null,
        yieldMl: null,
        garnishCostHtCents: null,
        lines: [
          {
            ingredientId: gin.id,
            preferredProductId: null,
            quantity: 50,
            unit: 'ml',
            topEstimateMl: null,
            isOptional: false,
            isGarnish: false,
            note: null,
          },
          {
            ingredientId: egg.id,
            preferredProductId: null,
            quantity: 1,
            unit: 'piece',
            topEstimateMl: null,
            isOptional: true,
            isGarnish: false,
            note: null,
          },
        ],
      },
    })
    expect(result.abv.value).toBeCloseTo(32)
    expect(result.costCents).toBeCloseTo((1600 / 700) * 50)
    expect(result.costBasis).toBe('ht')
    expect(result.optionalAllergens).toEqual(['eggs'])
  })
})
