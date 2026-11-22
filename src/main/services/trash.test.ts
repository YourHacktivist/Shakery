import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb, type Db } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { IngredientRepository } from '../db/repositories/ingredients'
import { rebuildSearchIndex } from '../db/repositories/index-rows'
import { JournalRepository } from '../db/repositories/journal'
import { ProductRepository } from '../db/repositories/products'
import { RecipeRepository } from '../db/repositories/recipes'
import { SearchRepository } from '../db/repositories/search'
import { BUNDLED_SEED } from '../seed/bundled'
import { loadSeedData } from '../seed/load'
import { TrashService } from './trash'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')

let sqlite: ReturnType<typeof openDatabase>
let db: Db
let clock: number
let seed: number
let recipes: RecipeRepository
let ingredients: IngredientRepository
let products: ProductRepository
let journal: JournalRepository
let trash: TrashService

const ids = {
  now: () => (clock += 1),
  newId: createUuidV7Generator(
    () => clock,
    (bytes) => bytes.fill((seed = (seed + 1) % 256)),
  ),
}

beforeEach(() => {
  clock = 1000
  seed = 0
  sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  loadSeedData(db, ids, BUNDLED_SEED)
  ingredients = new IngredientRepository(db, ids)
  recipes = new RecipeRepository(db, ids, ingredients)
  products = new ProductRepository(db, ids)
  journal = new JournalRepository(db, ids)
  trash = new TrashService(db, ids)
})

afterEach(() => {
  sqlite.close()
})

function classicId(seedKey: string): string {
  return (sqlite.prepare('SELECT id FROM recipes WHERE seed_key = ?').get(seedKey) as { id: string }).id
}

function count(sql: string, ...params: unknown[]): number {
  return (sqlite.prepare(sql).get(...params) as { n: number }).n
}

function ownIngredient(name: string) {
  const category = sqlite.prepare("SELECT id FROM categories WHERE seed_key = 'cat.spirits.gin'").get() as {
    id: string
  }
  return ingredients.create({ name, categoryId: category.id })
}

describe('trash (D-043)', () => {
  it('starts empty, even after edits that replace lines and aliases', () => {
    const gin = ownIngredient('Gin du jardin')
    const recipe = recipes.create({
      name: 'Essai',
      lines: [{ ingredientId: gin.id, quantity: 40, unit: 'ml' }],
    })
    recipes.update(recipe.id, {
      name: 'Essai',
      lines: [{ ingredientId: gin.id, quantity: 45, unit: 'ml' }],
    })
    expect(trash.list()).toEqual({ items: [], total: 0 })
  })

  it('restores a recipe with the ingredient deleted after it, found again by the search', () => {
    const gin = ownIngredient('Gin du jardin')
    const recipe = recipes.create({
      name: 'Zinzolin',
      lines: [{ ingredientId: gin.id, quantity: 40, unit: 'ml' }],
    })
    recipes.delete(recipe.id)
    ingredients.delete(gin.id)
    expect(trash.list().items.map((item) => item.kind)).toEqual(['ingredient', 'recipe'])

    trash.restore('recipe', recipe.id)

    expect(trash.list().total).toBe(0)
    expect(ingredients.get(gin.id).name).toBe('Gin du jardin')
    const search = new SearchRepository(db)
    expect(search.search('zinzolin')[0]?.id).toBe(recipe.id)
    expect(search.search('gin du jardin')[0]?.id).toBe(gin.id)
  })

  it('brings the recipe back with one of its tastings', () => {
    const recipe = recipes.create({ name: 'Essai fumé' })
    const note = journal.createTasting({
      recipeId: recipe.id,
      recipeVersion: 1,
      tastedAt: 5,
      comment: 'Tourbe trop présente',
    })
    journal.deleteTasting(note.id)
    recipes.delete(recipe.id)

    trash.restore('tasting_note', note.id)

    expect(recipes.get(recipe.id).name).toBe('Essai fumé')
    expect(new SearchRepository(db).searchNotes('tourbe')[0]?.id).toBe(note.id)
  })

  it('refuses a restore when the name was taken meanwhile', () => {
    const gin = ownIngredient('Gin du jardin')
    ingredients.delete(gin.id)
    ownIngredient('Gin du jardin')
    expect(() => {
      trash.restore('ingredient', gin.id)
    }).toThrow(/same name/)
    expect(trash.list().total).toBe(1)
  })

  it('does not count a merged ingredient as thrown away', () => {
    const from = ownIngredient('Gin du jardin')
    const to = ownIngredient('Gin potager')
    ingredients.merge(from.id, to.id)
    expect(trash.list().total).toBe(0)
  })

  it('removes the recipes of the user for good, their variants and bottles staying whole', () => {
    const gin = ownIngredient('Gin du jardin')
    const bottle = products.create({ ingredientId: gin.id, name: 'Cuvée test', owned: true })
    const parent = recipes.create({
      name: 'Parent',
      lines: [{ ingredientId: gin.id, quantity: 40, unit: 'ml', preferredProductId: bottle.id }],
    })
    const variant = recipes.createVariant(parent.id, 'Variante')
    recipes.delete(parent.id)
    products.delete(bottle.id)

    expect(trash.empty().removed).toBe(2)

    expect(trash.list().total).toBe(0)
    expect(count('SELECT COUNT(*) AS n FROM recipes WHERE id = ?', parent.id)).toBe(0)
    expect(count('SELECT COUNT(*) AS n FROM recipe_history WHERE recipe_id = ?', parent.id)).toBe(0)
    expect(count('SELECT COUNT(*) AS n FROM products WHERE id = ?', bottle.id)).toBe(0)
    const kept = recipes.get(variant.id)
    expect(kept.parentRecipeId).toBeNull()
    expect(kept.lines).toHaveLength(1)
    expect(kept.lines[0]?.preferredProductId).toBeNull()
    expect(sqlite.pragma('foreign_key_check')).toEqual([])
  })

  it('never lets an emptied classic come back at the next start', () => {
    const negroni = classicId('iba.negroni')
    recipes.delete(negroni)
    trash.empty()

    expect(trash.list().total).toBe(0)
    expect(loadSeedData(db, ids, BUNDLED_SEED).recipes).toBe(0)
    expect(() => recipes.get(negroni)).toThrow()
    expect(count('SELECT COUNT(*) AS n FROM recipe_lines WHERE recipe_id = ?', negroni)).toBe(0)
    expect(() => {
      trash.restore('recipe', negroni)
    }).toThrow(/Not in the trash/)
  })

  it('removes nothing alive', () => {
    const alive = () =>
      ['recipes', 'ingredients', 'recipe_lines', 'products'].map((table) =>
        count(`SELECT COUNT(*) AS n FROM ${table} WHERE deleted_at IS NULL`),
      )
    const own = recipes.create({ name: 'À jeter' })
    recipes.delete(own.id)
    const before = alive()
    trash.empty()
    expect(alive()).toEqual(before)
  })

  it('rebuilds the index as the repositories write it', () => {
    journal.createEntry({ title: 'Accords', body: 'Cardamome et pamplemousse', tags: ['été'] })
    const rows = () =>
      sqlite
        .prepare(
          'SELECT entity_type, entity_id, title, aliases, body FROM search_index ORDER BY entity_type, entity_id',
        )
        .all()
    const written = rows()
    expect(rebuildSearchIndex(db)).toBe(written.length)
    expect(rows()).toEqual(written)
  })
})
