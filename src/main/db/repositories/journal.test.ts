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
import { JournalRepository } from './journal'
import { RecipeRepository } from './recipes'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

let db: Db
let ids: Ids
let clock: number
let journal: JournalRepository
let recipes: RecipeRepository
let recipeId: string
let ginId: string

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  clock = 1_000
  ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(7),
    ),
  }
  loadSeedData(db, ids, { ...BUNDLED_SEED, ingredients: [], recipes: [] })
  const gin = db
    .select()
    .from(categories)
    .all()
    .find((c) => c.seedKey === 'cat.spirits.gin')
  const ingredientRepo = new IngredientRepository(db, ids)
  ginId = ingredientRepo.create({ name: 'Gin', categoryId: gin?.id ?? '' }).id
  recipes = new RecipeRepository(db, ids, ingredientRepo)
  const recipe = recipes.create({
    name: 'Martinez',
    lines: [{ ingredientId: ginId, quantity: 45, unit: 'ml' }],
  })
  recipeId = recipe.id
  recipes.update(recipeId, { name: 'Martinez', lines: [{ ingredientId: ginId, quantity: 50, unit: 'ml' }] })
  journal = new JournalRepository(db, ids)
})

describe('JournalRepository, tastings', () => {
  it('ties a note to the version tasted and refuses a version that does not exist', () => {
    const note = journal.createTasting({
      recipeId,
      recipeVersion: 1,
      tastedAt: 5_000,
      overall: 4,
      scores: { sweetness: 1, acidity: -1 },
      comment: '  trop sucré  ',
      nextStep: 'Moins de vermouth',
    })
    expect(note).toMatchObject({
      recipeName: 'Martinez',
      recipeVersion: 1,
      overall: 4,
      comment: 'trop sucré',
    })
    expect(() => journal.createTasting({ recipeId, recipeVersion: 3, tastedAt: 1 })).toThrow(/version/)
    expect(() =>
      journal.createTasting({ recipeId, recipeVersion: 1, tastedAt: 1, scores: { sweetness: 3 } }),
    ).toThrow()
  })

  it('lists notes to retest until their next step is ticked', () => {
    const a = journal.createTasting({ recipeId, recipeVersion: 2, tastedAt: 2, nextStep: 'Zeste de citron' })
    journal.createTasting({ recipeId, recipeVersion: 2, tastedAt: 3, comment: 'Parfait' })
    expect(journal.listTastings({ toRetest: true }).map((note) => note.id)).toEqual([a.id])
    journal.setNextStepDone(a.id, true)
    expect(journal.listTastings({ toRetest: true })).toEqual([])
    expect(journal.listTastings({ recipeId })).toHaveLength(2)
    journal.deleteTasting(a.id)
    expect(journal.listTastings()).toHaveLength(1)
  })
})

describe('JournalRepository, notebook', () => {
  it('keeps links by id, so they survive renaming, and shows deleted items as null', () => {
    const entry = journal.createEntry({
      title: 'Gin et rhubarbe',
      body: 'À essayer avec @Martinez',
      tags: ['association'],
      links: [
        { entityType: 'recipe', entityId: recipeId },
        { entityType: 'ingredient', entityId: ginId },
        { entityType: 'recipe', entityId: recipeId },
      ],
    })
    expect(entry.links).toHaveLength(2)
    recipes.update(recipeId, {
      name: 'Martinez maison',
      lines: [{ ingredientId: ginId, quantity: 50, unit: 'ml' }],
    })
    const [renamed] = journal.listEntries()
    expect(renamed?.links.find((link) => link.entityType === 'recipe')?.name).toBe('Martinez maison')
    recipes.delete(recipeId)
    expect(journal.listEntries()[0]?.links.find((link) => link.entityType === 'recipe')?.name).toBeNull()
  })

  it('lists pinned entries first and replaces links on update', () => {
    const first = journal.createEntry({ title: 'Première' })
    const pinned = journal.createEntry({ title: 'Épinglée', isPinned: true })
    journal.createEntry({ title: 'Dernière' })
    expect(journal.listEntries()[0]?.id).toBe(pinned.id)
    const updated = journal.updateEntry(first.id, {
      title: 'Première',
      links: [{ entityType: 'ingredient', entityId: ginId }],
    })
    expect(updated.links.map((link) => link.entityType)).toEqual(['ingredient'])
    journal.deleteEntry(first.id)
    expect(journal.listEntries().map((entry) => entry.title)).not.toContain('Première')
  })
})
