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
import { SearchRepository, toMatchQuery, toPhraseQuery } from './search'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

let db: Db
let ids: Ids
let clock: number
let repo: SearchRepository
let recipesRepo: RecipeRepository
const made: Record<string, string> = {}

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  db = createDb(sqlite)
  clock = 1_000
  ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(5),
    ),
  }
  loadSeedData(db, ids, { ...BUNDLED_SEED, ingredients: [], recipes: [] })
  const cat = new Map(
    db
      .select()
      .from(categories)
      .all()
      .map((c) => [c.seedKey, c.id]),
  )
  const ingredientsRepo = new IngredientRepository(db, ids)
  recipesRepo = new RecipeRepository(db, ids, ingredientsRepo)
  const gin = ingredientsRepo.create({
    name: 'Gin',
    categoryId: cat.get('cat.spirits.gin') ?? '',
    aliases: ['Genièvre anglais'],
  })
  const tripleSec = ingredientsRepo.create({
    name: 'Triple sec',
    categoryId: cat.get('cat.liqueurs.orange') ?? '',
  })
  const product = new ProductRepository(db, ids).create({ ingredientId: tripleSec.id, name: 'Cointreau' })
  made['gin'] = gin.id
  made['cointreau'] = product.id
  made['negroni'] = recipesRepo.create({
    name: 'Negroni',
    status: 'final',
    lines: [{ ingredientId: gin.id, quantity: 30, unit: 'ml' }],
  }).id
  made['sbagliato'] = recipesRepo.create({ name: 'Negroni Sbagliato', status: 'testing', lines: [] }).id
  made['nectar'] = recipesRepo.create({ name: 'Nectar du soir', lines: [] }).id
  repo = new SearchRepository(db)
})

const titles = (text: string) => repo.search(text, 20, clock).map((hit) => hit.title)

describe('SearchRepository', () => {
  it('finds a substring with the trigram index: « groni » finds Negroni', () => {
    expect(titles('groni')).toEqual(['Negroni Sbagliato', 'Negroni'])
  })

  it('ranks the exact name before a longer one, accents and case ignored', () => {
    const hits = repo.search('NÉGRONI')
    expect(hits.map((hit) => hit.match)).toEqual(['exact', 'prefix'])
    expect(hits[0]?.id).toBe(made['negroni'])
  })

  it('searches by prefix under three characters', () => {
    // Same tier: recipes in progress (draft, testing) first, then by name.
    expect(titles('ne')).toEqual(['Nectar du soir', 'Negroni Sbagliato', 'Negroni'])
    expect(titles('n%')).toEqual([])
  })

  it('finds an ingredient by its alias and a bottle by its name', () => {
    const [gin] = repo.search('genievre')
    expect(gin).toMatchObject({
      entityType: 'ingredient',
      id: made['gin'],
      match: 'alias',
      detail: 'Gin et genièvre',
    })
    const [bottle] = repo.search('cointreau')
    expect(bottle).toMatchObject({ entityType: 'product', title: 'Cointreau', detail: 'Triple sec' })
  })

  it('falls back on approximate matching: « cointrau » finds Cointreau', () => {
    const hits = repo.search('cointrau')
    expect(hits[0]).toMatchObject({ id: made['cointreau'], match: 'fuzzy' })
  })

  it('neutralizes the FTS5 syntax of the typed text', () => {
    expect(() => repo.search('" OR *')).not.toThrow()
    expect(() => repo.search('negroni" OR * NEAR(^gin)')).not.toThrow()
    expect(toMatchQuery('negroni or *')).toBe('"negroni"')
    expect(toMatchQuery('a "b"')).toBeNull()
    expect(toPhraseQuery('say "hi"')).toBe('"say ""hi"""')
  })

  it('finds a name made of short words or punctuation among many recipes sharing a word', () => {
    // 400 recipes containing « tie » push « My Tie » out of the first rows of the term query.
    for (let i = 0; i < 400; i += 1) recipesRepo.create({ name: `Tie Break ${i}`, lines: [] })
    const myTie = recipesRepo.create({ name: 'My Tie', lines: [] }).id
    const att = recipesRepo.create({ name: 'AT&T', lines: [] }).id
    const daisy = recipesRepo.create({ name: 'Whiskey Daisy No.2', lines: [] }).id
    expect(repo.search('My Tie', 5)[0]).toMatchObject({ id: myTie, match: 'exact' })
    expect(repo.search('AT&T', 5)[0]).toMatchObject({ id: att, match: 'exact' })
    expect(repo.search('whiskey daisy no.2', 5)[0]).toMatchObject({ id: daisy, match: 'exact' })
  })

  it('leaves deleted recipes out and favours recently viewed items', () => {
    recipesRepo.delete(made['nectar'] ?? '')
    expect(titles('ne')).toEqual(['Negroni Sbagliato', 'Negroni'])
    repo.recordView('recipe', made['negroni'] ?? '', ids)
    expect(titles('ne')).toEqual(['Negroni', 'Negroni Sbagliato'])
  })

  it('lists what each recipe misses tonight, until a bottle of it is owned', () => {
    const negroni = () => recipesRepo.list().find((recipe) => recipe.id === made['negroni'])
    expect(negroni()?.missingIngredientIds).toEqual([made['gin']])
    const products = new ProductRepository(db, ids)
    const bottle = products.create({ ingredientId: made['gin'] ?? '', name: 'Gin de la maison' })
    products.setOwned(bottle.id, true)
    expect(negroni()?.missingIngredientIds).toEqual([])
  })
})
