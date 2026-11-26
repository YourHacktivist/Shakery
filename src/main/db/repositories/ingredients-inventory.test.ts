import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../../core/uuid'
import { BUNDLED_SEED } from '../../seed/bundled'
import { loadSeedData } from '../../seed/load'
import { createDb, type Db, type Ids } from '../client'
import { openDatabase } from '../connection'
import { runMigrations } from '../migrate'
import { categories } from '../schema'
import { IngredientRepository } from './ingredients'
import { ProductRepository } from './products'
import { RecipeRepository } from './recipes'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

let ingredientsRepo: IngredientRepository
let productsRepo: ProductRepository
let recipesRepo: RecipeRepository
let cat: (seedKey: string) => string

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  const db: Db = createDb(sqlite)
  let clock = 1_000
  const ids: Ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(3),
    ),
  }
  loadSeedData(db, ids, { ...BUNDLED_SEED, ingredients: [], recipes: [] })
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

describe('IngredientRepository.inventory', () => {
  it('lists the ingredients with an owned bottle and counts the live recipes using each one', () => {
    const gin = ingredientsRepo.create({ name: 'Gin', categoryId: cat('cat.spirits.gin') })
    const lime = ingredientsRepo.create({ name: 'Citron vert', categoryId: cat('cat.fruits.fresh') })
    const yuzu = ingredientsRepo.create({ name: 'Yuzu', categoryId: cat('cat.fruits.fresh') })
    const owned = productsRepo.create({ ingredientId: gin.id, name: 'Gin sec', owned: true })
    productsRepo.create({ ingredientId: lime.id, name: 'Citron', owned: false })
    recipesRepo.create({ name: 'Gimlet', lines: [{ ingredientId: gin.id, quantity: 50, unit: 'ml' }] })
    const sour = recipesRepo.create({
      name: 'Gin sour',
      lines: [
        { ingredientId: gin.id, quantity: 50, unit: 'ml' },
        { ingredientId: lime.id, quantity: 25, unit: 'ml' },
      ],
    })

    const first = ingredientsRepo.inventory()
    expect(first.owned).toEqual([gin.id])
    const counts = new Map(first.usage.map((entry) => [entry.id, entry.count]))
    expect(counts.get(gin.id)).toBe(2)
    expect(counts.get(lime.id)).toBe(1)
    expect(counts.has(yuzu.id)).toBe(false)

    // A deleted recipe no longer counts, and a bottle no longer owned leaves the bar.
    recipesRepo.delete(sour.id)
    productsRepo.setOwned(owned.id, false)
    const second = ingredientsRepo.inventory()
    expect(second.owned).toEqual([])
    expect(new Map(second.usage.map((entry) => [entry.id, entry.count])).get(gin.id)).toBe(1)
  })
})
