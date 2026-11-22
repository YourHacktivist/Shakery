import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { familyOf, typicalSteps, type Classic, type ClassicLine } from './classics'

type SeedLine = {
  ingredient: string
  quantity: number | null
  unit: string
  note: string | null
  is_garnish: boolean
  is_optional: boolean
}
type SeedRecipe = {
  seed_key: string
  name: string
  kind: string
  family: string | null
  method: Classic['method']
  glass: string | null
  garnish: string | null
  steps: string[]
  category: string | null
  ingredient_key: string | null
  lines: SeedLine[]
}

const read = (file: string): unknown =>
  JSON.parse(readFileSync(path.resolve(__dirname, '../..', file), 'utf8'))

const ingredients = read('data/seed/ingredients.json') as Array<{
  seed_key: string
  name: string
  category: string
  default_abv: number | null
}>
const bundled = read('data/seed/recipes.json') as SeedRecipe[]
const classics = read('resources/seed/recipes-24c.json') as SeedRecipe[]

const facts = new Map(
  ingredients.map((item) => [
    item.seed_key,
    { name: item.name, category: item.category, abv: item.default_abv },
  ]),
)
for (const prep of bundled) {
  if (prep.ingredient_key && prep.category) {
    facts.set(prep.ingredient_key, {
      name: prep.name,
      category: prep.category,
      abv: prep.lines.every((line) => facts.get(line.ingredient)?.abv === 0) ? 0 : null,
    })
  }
}

function classic(recipe: SeedRecipe, sourceMethod?: string): Classic {
  return {
    name: recipe.name,
    method: recipe.method,
    ...(sourceMethod === undefined ? {} : { sourceMethod }),
    glass: recipe.glass,
    garnish: recipe.garnish,
    lines: recipe.lines.map((line) => ({
      name: facts.get(line.ingredient)?.name ?? '',
      category: facts.get(line.ingredient)?.category ?? '',
      abv: facts.get(line.ingredient)?.abv ?? null,
      quantity: line.quantity,
      unit: line.unit,
      note: line.note,
      isGarnish: line.is_garnish,
      isOptional: line.is_optional,
    })),
  }
}

function line(name: string, category: string, abv: number | null, unit = 'ml'): ClassicLine {
  return {
    name,
    category,
    abv,
    quantity: unit === 'top' ? null : 30,
    unit,
    note: null,
    isGarnish: false,
    isOptional: false,
  }
}

describe('familyOf (D-039)', () => {
  it('finds at least 95 % of the families of the IBA classics read by hand', () => {
    const known = bundled.filter((recipe) => recipe.kind === 'cocktail' && recipe.family !== 'other')
    const missed = known
      .filter((recipe) => familyOf(classic(recipe)) !== recipe.family)
      .map((recipe) => recipe.name)
    expect(known.length).toBeGreaterThan(90)
    expect(missed.length, missed.join(', ')).toBeLessThanOrEqual(known.length * 0.05)
  })

  it('never files a classic of 24cocktails under « other », shown as « Autre »', () => {
    expect(classics.filter((recipe) => recipe.family === 'other')).toEqual([])
  })

  it('says « non alcoholic » only when every line is known to hold no alcohol', () => {
    const juice = line("Jus d'orange", 'cat.juices.citrus', 0)
    const base = { name: 'Essai', method: 'shake', glass: null, garnish: null } as const
    expect(familyOf({ ...base, lines: [juice] })).toBe('non_alcoholic')
    const unknown = line('Liqueur de pin', 'cat.liqueurs.herbal', null)
    expect(familyOf({ ...base, lines: [juice, unknown] })).not.toBe('non_alcoholic')
    for (const recipe of classics.filter((item) => item.family === 'non_alcoholic')) {
      for (const item of recipe.lines) {
        const fact = facts.get(item.ingredient)
        expect(fact?.abv === 0 || fact?.category.startsWith('cat.alcohol_free'), recipe.name).toBe(true)
      }
    }
  })
})

describe('typicalSteps (D-039)', () => {
  it('never shakes the bubbles and dry shakes the egg', () => {
    const steps = typicalSteps({
      name: 'Fizz',
      method: 'shake',
      glass: 'glass.highball',
      garnish: null,
      lines: [
        line('Gin', 'cat.spirits.gin', 37.5),
        line("Blanc d'œuf", 'cat.dairy.eggs', 0),
        line('Eau gazeuse', 'cat.mixers.sparkling_water', 0, 'top'),
      ],
    })
    expect(steps[0]).toBe('Verser tous les ingrédients, sauf Eau gazeuse, dans le shaker.')
    expect(steps[1]).toContain('sans glace')
    expect(steps.at(-2)).toContain('Compléter avec')
    expect(steps.at(-2)).toContain('Eau gazeuse')
  })

  it('puts no ice in a hot drink and does not mix a layered one', () => {
    const lines = [line('Café chaud', 'cat.coffee_tea.coffee', 0), line('Cognac', 'cat.spirits.cognac', 40)]
    const base = { name: 'Essai', method: 'build', garnish: null, lines } as const
    const hot = typicalSteps({ ...base, glass: 'glass.toddy' }).join(' ')
    expect(hot).toContain('Préchauffer')
    expect(hot).not.toMatch(/glaçons|Rafraîchir/)
    const layered = typicalSteps({ ...base, glass: 'glass.shot', sourceMethod: 'layered' }).join(' ')
    expect(layered).toContain('Ne pas mélanger')
    expect(layered).not.toContain('cuillère.')
  })

  it('gives every classic a short course that the seed accepts', () => {
    for (const recipe of classics) {
      expect(recipe.steps.length, recipe.name).toBeGreaterThanOrEqual(2)
      expect(recipe.steps.length, recipe.name).toBeLessThanOrEqual(10)
    }
  })
})
