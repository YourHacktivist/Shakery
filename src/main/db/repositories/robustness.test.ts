import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeName } from '../../../core/normalize'
import { createUuidV7Generator } from '../../../core/uuid'
import { BUNDLED_SEED } from '../../seed/bundled'
import { recipeFacets } from '../../services/facets'
import { loadSeedData } from '../../seed/load'
import { createDb, type Db, type Ids } from '../client'
import { openDatabase } from '../connection'
import { runMigrations } from '../migrate'
import { categories } from '../schema'
import { IngredientRepository } from './ingredients'
import { JournalRepository } from './journal'
import { RecipeRepository } from './recipes'
import { SearchRepository } from './search'
import { WorkshopRepository } from './workshop'

/**
 * Names and texts that break careless code: SQL and FTS5 syntax, LIKE wildcards, HTML,
 * Markdown, CSV formulas, Windows device names, emoji sequences, right-to-left scripts,
 * invisible characters, decomposed accents, the longest names allowed. Each one must be
 * written, read back as typed, and found whatever its case or accents.
 */
const char = (...codes: number[]) => String.fromCharCode(...codes)
const ZWSP = char(0x200b)
const SOFT_HYPHEN = char(0xad)
const BOM = char(0xfeff)
const RLO = char(0x202e)
const NBSP = char(0xa0)
const LIME = String.fromCodePoint(0x1f34b, 0x200d, 0x1f7e9)
const FAMILY = String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467)

const NASTY_NAMES: readonly string[] = [
  "Ti' Punch",
  'L’Œil de « Bœuf »',
  '"Quoted" Sour',
  'Back\\slash',
  'Percent 100% _under_',
  'Semi;colon, comma',
  '<script>alert(1)</script>',
  "' OR 1=1 --",
  "Robert'); DROP TABLE recipes;--",
  'NEAR(gin tonic) AND * OR "x"',
  '^caret* star',
  '=SUM(A1)+cmd|calc',
  '[[lien]] (paren) {brace}',
  '**gras** _italique_',
  '# Titre',
  '%s %d %n ${x}',
  '../../etc/passwd',
  'C:\\Windows\\con',
  'CON',
  'nul.txt',
  `${String.fromCodePoint(0x1f378)} Martini ${LIME}`,
  `${FAMILY} Famille`,
  'Ｆｕｌｌｗｉｄｔｈ Gin',
  'İstanbul Sour',
  'STRASSE ẞ',
  'ﬁzz royal',
  'مارتيني',
  'שייקר',
  'カクテル',
  `Zero${ZWSP}width`,
  `Soft${SOFT_HYPHEN}hyphen`,
  `${BOM}BOM first`,
  `RTL${RLO}override`,
  `Tab\tinside`,
  `Nbsp${NBSP}inside`,
  'x'.repeat(120),
  'é'.repeat(120),
  'e\u0301'.normalize('NFD').repeat(60),
]

let db: Db
let ids: Ids
let clock: number
let recipes: RecipeRepository
let ingredients: IngredientRepository
let search: SearchRepository
let category: string

beforeEach(() => {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, path.resolve(__dirname, '../../../../resources/migrations'))
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
  category =
    db
      .select()
      .from(categories)
      .all()
      .find((c) => c.seedKey === 'cat.spirits.gin')?.id ?? ''
  ingredients = new IngredientRepository(db, ids)
  recipes = new RecipeRepository(db, ids, ingredients)
  search = new SearchRepository(db)
})

/** The same name as another person would type it: other case, no accent. */
function variants(name: string): string[] {
  const plain = name.normalize('NFD').replace(/\p{M}+/gu, '')
  return [...new Set([name.toUpperCase(), name.toLowerCase(), plain])]
}

describe('nasty names', () => {
  it.each(NASTY_NAMES)('a recipe named %j is kept as typed and found in any case', (name) => {
    const created = recipes.create({
      name,
      notes: name,
      garnish: name,
      steps: [name],
      tags: [name.slice(0, 40)],
    })
    const read = recipes.get(created.id)
    expect(read.name).toBe(name.trim())
    expect(read.notes).toBe(name)
    expect(read.garnish).toBe(name)
    expect(read.steps).toEqual([name])

    for (const typed of [name, ...variants(name)]) {
      if (normalizeName(typed) === '') continue
      const hits = search.search(typed, 20, clock)
      expect(
        hits.map((hit) => hit.id),
        `${JSON.stringify(typed)} finds ${JSON.stringify(name)}`,
      ).toContain(created.id)
    }
  })

  it.each(NASTY_NAMES)('an ingredient named %j is kept and refused twice, whatever the case', (name) => {
    const created = ingredients.create({ name, categoryId: category, aliases: [name.slice(0, 80)] })
    expect(ingredients.get(created.id).name).toBe(name.trim())
    for (const typed of variants(name)) {
      if (normalizeName(typed) !== normalizeName(name)) continue
      expect(() => ingredients.create({ name: typed, categoryId: category }), typed).toThrow()
    }
  })

  it.each(NASTY_NAMES)('a collection, a note and a tasting keep %j', (name) => {
    const workshop = new WorkshopRepository(db, ids)
    const journal = new JournalRepository(db, ids)
    const recipe = recipes.create({ name: 'Support' })
    const collection = workshop.createCollection({ name, description: name })
    expect(workshop.getCollection(collection.id)).toMatchObject({
      name: name.trim(),
      description: name.trim(),
    })

    const entry = journal.createEntry({ title: name, body: `${name}\n@${name}`, tags: [name.slice(0, 40)] })
    expect(journal.listEntries().find((e) => e.id === entry.id)).toMatchObject({ title: name.trim() })
    const tasting = journal.createTasting({
      recipeId: recipe.id,
      recipeVersion: 1,
      tastedAt: 5,
      comment: name,
      nextStep: name,
      context: name.slice(0, 300),
    })
    expect(tasting.comment).toBe(name.trim())
    expect(() => search.searchNotes(name)).not.toThrow()
  })
})

describe('nasty queries', () => {
  const QUERIES = [
    '',
    ' ',
    '"',
    '""',
    "'",
    '*',
    '(',
    ')',
    'AND',
    'OR',
    'NOT',
    'NEAR',
    'NEAR/2',
    '-',
    '^',
    ':',
    '%',
    '_',
    '\\',
    '\\%',
    '[',
    '{',
    'gin OR',
    'gin AND NOT',
    '"gin',
    'gin"',
    'col:gin',
    'title:*',
    char(0),
    char(0xd800),
    char(0xdc00, 0xd800),
    `${char(0xd83c)}x`,
    ZWSP,
    BOM,
    RLO,
    String.fromCodePoint(0x1f378).repeat(50),
    'a'.repeat(5000),
    'é'.repeat(2000),
    ...NASTY_NAMES,
  ]

  it.each(QUERIES.map((query) => [JSON.stringify(query).slice(0, 60), query] as const))(
    'search %s never throws',
    (_label, query) => {
      recipes.create({ name: 'Negroni' })
      expect(Array.isArray(search.search(query, 20, clock))).toBe(true)
      expect(Array.isArray(search.searchNotes(query))).toBe(true)
    },
  )
})

describe('case of tags', () => {
  it('keeps one spelling of a tag typed twice in another case', () => {
    const created = recipes.create({ name: 'Été', tags: ['Été', 'été', 'ÉTÉ', 'Agrumes', `agrumes${ZWSP}`] })
    expect(recipes.get(created.id).tags).toEqual(['Été', 'Agrumes'])
  })

  it('offers one filter for a tag spelled differently in two recipes', () => {
    const first = recipes.create({ name: 'Un', tags: ['Agrumes'] })
    const second = recipes.create({ name: 'Deux', tags: ['AGRUMES', 'amer'] })
    const facets = new Map(recipeFacets(db).map((facet) => [facet.id, facet.tags]))
    expect(facets.get(first.id)).toEqual(['Agrumes'])
    expect(facets.get(second.id)).toEqual(['Agrumes', 'amer'])
  })
})
