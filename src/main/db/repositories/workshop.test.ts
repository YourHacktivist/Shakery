import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { generateQuestions, type PracticeStrings } from '../../../core/practice'
import { bestBeforeFrom } from '../../../core/shelf-life'
import { createUuidV7Generator } from '../../../core/uuid'
import { BUNDLED_SEED } from '../../seed/bundled'
import { loadSeedData } from '../../seed/load'
import { createDb, type Db, type Ids } from '../client'
import { openDatabase } from '../connection'
import { runMigrations } from '../migrate'
import { IngredientRepository } from './ingredients'
import { ProductRepository } from './products'
import { RecipeRepository } from './recipes'
import { WorkshopRepository } from './workshop'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

let db: Db
let ids: Ids
let clock: number
let workshop: WorkshopRepository
let recipes: RecipeRepository
let products: ProductRepository

const idOf = (name: string): string => {
  const row = db.$client.prepare('SELECT id FROM recipes WHERE name = ? AND deleted_at IS NULL').get(name) as
    { id: string } | undefined
  if (!row) throw new Error(`fixture: ${name}`)
  return row.id
}

const linesOf = (name: string): Array<{ ingredientId: string; name: string }> =>
  db.$client
    .prepare(
      `SELECT l.ingredient_id AS ingredientId, i.name AS name FROM recipe_lines l
       JOIN ingredients i ON i.id = l.ingredient_id
       WHERE l.recipe_id = ? AND l.deleted_at IS NULL AND l.is_optional = 0 AND l.is_garnish = 0
       ORDER BY l.sort_order`,
    )
    .all(idOf(name)) as Array<{ ingredientId: string; name: string }>

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  clock = 1_800_000_000_000
  ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(5),
    ),
  }
  loadSeedData(db, ids, BUNDLED_SEED)
  const ingredients = new IngredientRepository(db, ids)
  recipes = new RecipeRepository(db, ids, ingredients)
  products = new ProductRepository(db, ids)
  workshop = new WorkshopRepository(db, ids)
})

describe('availability on the seed recipes', () => {
  it('names the one ingredient missing, then nothing once it is owned', () => {
    const negroni = linesOf('Negroni')
    expect(negroni).toHaveLength(3)
    for (const line of negroni.slice(0, 2)) {
      products.create({ ingredientId: line.ingredientId, name: line.name, owned: true })
    }
    const missing = () => recipes.list().find((recipe) => recipe.name === 'Negroni')?.missingIngredientIds
    expect(missing()).toEqual([negroni[2]?.ingredientId])
    products.create({ ingredientId: negroni[2]?.ingredientId ?? '', name: 'Bouteille', owned: true })
    expect(missing()).toEqual([])
  })
})

describe('WorkshopRepository, preparations', () => {
  it('dates a batch from the shelf life, makes the preparation available, then finishes it', () => {
    const syrup = idOf('Sirop simple')
    db.$client.prepare('UPDATE recipes SET shelf_life_days = 14 WHERE id = ?').run(syrup)
    const madeAt = clock
    const batch = workshop.createBatch({ recipeId: syrup, madeAt, quantityMl: 750 })
    expect(batch.bestBefore).toBe(bestBeforeFrom(madeAt, 14))
    expect(batch.status).toBe('active')

    const prep = workshop.listPreps().find((entry) => entry.recipeId === syrup)
    expect(prep?.batches.map((b) => b.id)).toEqual([batch.id])

    // A whiskey sour with its syrup: the syrup line is available while a batch is active.
    const sour = () => recipes.list(clock).find((recipe) => recipe.name === 'Whiskey Sour')
    const syrupIngredient = db.$client
      .prepare('SELECT id FROM ingredients WHERE prep_recipe_id = ?')
      .get(syrup) as { id: string }
    expect(sour()?.missingIngredientIds).not.toContain(syrupIngredient.id)
    workshop.setBatchStatus(batch.id, 'finished')
    expect(sour()?.missingIngredientIds).toContain(syrupIngredient.id)

    workshop.deleteBatch(batch.id)
    expect(workshop.listPreps().find((entry) => entry.recipeId === syrup)?.batches).toEqual([])
    expect(() => workshop.createBatch({ recipeId: idOf('Negroni'), madeAt })).toThrow(/preparation/)
  })
})

describe('WorkshopRepository, collections', () => {
  it('adds recipes once, keeps a free order, a price and a note, and restores a deleted collection', () => {
    const created = workshop.createCollection({ name: 'Carte d’été', kind: 'menu' })
    const negroni = idOf('Negroni')
    const daiquiri = idOf('Daiquiri')
    workshop.addRecipes(created.id, [negroni, daiquiri])
    const summary = workshop.addRecipes(created.id, [negroni])
    expect(summary.recipeIds).toEqual([negroni, daiquiri])

    const [first, second] = workshop.getCollection(created.id).items
    if (!first || !second) throw new Error('fixture')
    workshop.reorder(created.id, [second.id, first.id])
    workshop.updateItem(second.id, { note: 'Signature', salePriceCents: 1200 })
    const detail = workshop.getCollection(created.id)
    expect(detail.items.map((item) => [item.title, item.note, item.salePriceCents])).toEqual([
      ['Daiquiri', 'Signature', 1200],
      ['Negroni', null, null],
    ])
    expect(() => {
      workshop.reorder(created.id, ['unknown'])
    }).toThrow(/item/)

    workshop.removeItem(first.id)
    expect(workshop.getCollection(created.id).items).toHaveLength(1)
    // « Annuler »: back at its place, with its note and its price.
    workshop.restoreItem(first.id)
    expect(workshop.getCollection(created.id).items.map((item) => [item.title, item.note])).toEqual([
      ['Daiquiri', 'Signature'],
      ['Negroni', null],
    ])
    workshop.removeItem(first.id)
    // Added again meanwhile: the undo adds nothing twice.
    workshop.addRecipes(created.id, [negroni])
    workshop.restoreItem(first.id)
    expect(workshop.getCollection(created.id).items).toHaveLength(2)
    expect(() => {
      workshop.restoreItem('unknown')
    }).toThrow(/item/)
    const added = workshop.getCollection(created.id).items.find((item) => item.recipeId === negroni)
    if (!added) throw new Error('fixture')
    workshop.removeItem(added.id)
    workshop.deleteCollection(created.id)
    expect(workshop.listCollections()).toEqual([])
    expect(workshop.restoreCollection(created.id).name).toBe('Carte d’été')
  })
})

const STRINGS: PracticeStrings = {
  dose: (ingredient) => `Dose de ${ingredient} ?`,
  intruder: 'Intrus ?',
  method: 'Méthode ?',
  glass: 'Verre ?',
  ice: 'Glace ?',
  garnish: 'Décor ?',
  length: 'Longueur ?',
  moment: 'Moment ?',
  family: 'Famille ?',
  abv: 'TAV ?',
  recite: 'Récite',
  className: 'Classe ?',
  minAbv: 'TAV minimum ?',
  origin: 'Origine ?',
  takeaway: 'Quel produit ?',
  cell: (column) => `${column} ?`,
}

describe('WorkshopRepository, revision', () => {
  it('builds the questions of a collection without an empty one, then keeps the session and its mistakes', () => {
    const collection = workshop.createCollection({ name: 'Classiques' })
    const names = ['Negroni', 'Daiquiri', 'Margarita', 'Manhattan', 'Mojito', 'Americano']
    workshop.addRecipes(
      collection.id,
      names.map((name) => idOf(name)),
    )
    const corpus = workshop.practiceCorpus(collection.id)
    expect(corpus.recipes.map((recipe) => recipe.name)).toEqual(names)
    expect(corpus.recipes[0]?.lines.length).toBe(3)

    const corpusForCore = {
      recipes: corpus.recipes.map((recipe) => ({
        id: recipe.id,
        subjectType: recipe.subjectType,
        name: recipe.name,
        lines: recipe.lines.map((line) => ({
          id: line.id,
          label: line.label,
          dose: line.quantity === null ? null : `${String(line.quantity)} ${line.unit}`,
        })),
        method: recipe.method,
        glass: recipe.glass,
        ice: recipe.ice,
        garnish: recipe.garnish,
        steps: recipe.steps,
        length: recipe.drinkLength,
        moment: recipe.servingMoment,
        family: recipe.family,
        statedAbv: null,
      })),
      sheets: [],
      rows: [],
    }
    const questions = generateQuestions(corpusForCore, STRINGS, { mode: 'quiz', limit: 1000 })
    expect(questions.length).toBeGreaterThan(20)
    for (const question of questions) {
      expect(question.prompt.trim()).not.toBe('')
      expect(question.answer.trim()).not.toBe('')
      if (question.format === 'choice') expect(question.choices).toContain(question.answer)
    }

    const [right, wrong] = questions
    if (!right || !wrong) throw new Error('fixture')
    const answer = (question: typeof right, isCorrect: boolean) => ({
      questionKey: question.key,
      generator: question.generator,
      subjectType: question.subjectType,
      subjectId: question.subjectId,
      expected: question.answer,
      response: isCorrect ? question.answer : 'autre',
      isCorrect,
      selfGraded: false,
      answeredAt: clock,
    })
    const session = workshop.finishPractice({
      collectionId: collection.id,
      mode: 'quiz',
      answers: [answer(right, true), answer(wrong, false)],
    })
    expect(session).toMatchObject({ score: 1, total: 2, collectionName: 'Classiques', mode: 'quiz' })
    expect(workshop.history().map((entry) => entry.id)).toEqual([session.id])
    expect(workshop.weakKeys()).toEqual([wrong.key])
  })
})
