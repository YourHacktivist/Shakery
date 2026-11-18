import { describe, expect, it } from 'vitest'
import { validateSeedData, type SeedData } from './load'

const base: SeedData = {
  categories: [
    { seed_key: 'cat.a', name: 'A', slug: 'a', parent: null, sort_order: 1, batch_hint: 'ok' },
    { seed_key: 'cat.b', name: 'B', slug: 'b', parent: 'cat.a', sort_order: 1, batch_hint: 'fresh' },
  ],
  glasses: [{ seed_key: 'glass.coupe', name: 'Coupe', capacity_ml: null, sort_order: 1 }],
  ice: [{ seed_key: 'ice.cubes', name: 'Glaçons', sort_order: 1 }],
  ingredients: [
    {
      seed_key: 'ing.q1',
      name: 'Gin',
      category: 'cat.b',
      aliases: ['Genièvre anglais'],
      default_abv: null,
      sugar_g_per_l: null,
      acid_g_per_l: null,
      composition_source: null,
      composition_confidence: null,
      density_g_per_ml: null,
      allergens: [],
      is_staple: false,
      source: 'wikidata',
      external_ref: 'Q1',
    },
  ],
  recipes: [],
}

describe('validateSeedData', () => {
  it('accepts a consistent set', () => {
    expect(validateSeedData(base).categories).toHaveLength(2)
  })

  it('refuses an ingredient outside a leaf, or twice in a category', () => {
    const [gin] = base.ingredients
    if (!gin) throw new Error('fixture')
    expect(() => validateSeedData({ ...base, ingredients: [{ ...gin, category: 'cat.a' }] })).toThrow(/leaf/)
    expect(() =>
      validateSeedData({ ...base, ingredients: [gin, { ...gin, seed_key: 'ing.q2', name: 'GIN' }] }),
    ).toThrow(/Duplicate/)
  })

  it('refuses an entry still marked for review (section 9)', () => {
    const data = {
      ...base,
      ice: [{ seed_key: 'ice.x', name: 'X', sort_order: 1, needs_review: true }],
    } as unknown as SeedData
    expect(() => validateSeedData(data)).toThrow()
  })

  it('refuses duplicates, unknown parents and cycles', () => {
    const dupSlug: SeedData = {
      ...base,
      categories: [
        ...base.categories,
        { ...base.categories[0], seed_key: 'cat.c' } as SeedData['categories'][0],
      ],
    }
    expect(() => validateSeedData(dupSlug)).toThrow(/slug/)

    const orphan: SeedData = {
      ...base,
      categories: [
        { seed_key: 'cat.x', name: 'X', slug: 'x', parent: 'cat.missing', sort_order: 1, batch_hint: 'ok' },
      ],
    }
    expect(() => validateSeedData(orphan)).toThrow(/Unknown parent/)

    const cycle: SeedData = {
      ...base,
      categories: [
        { seed_key: 'cat.x', name: 'X', slug: 'x', parent: 'cat.y', sort_order: 1, batch_hint: 'ok' },
        { seed_key: 'cat.y', name: 'Y', slug: 'y', parent: 'cat.x', sort_order: 1, batch_hint: 'ok' },
      ],
    }
    expect(() => validateSeedData(cycle)).toThrow(/cycle/)

    const sameGlass: SeedData = {
      ...base,
      glasses: [
        ...base.glasses,
        { seed_key: 'glass.coupe2', name: 'COUPE', capacity_ml: null, sort_order: 2 },
      ],
    }
    expect(() => validateSeedData(sameGlass)).toThrow(/glass name/)
  })

  it('refuses unknown fields and bad slugs', () => {
    const extra = {
      ...base,
      glasses: [{ seed_key: 'glass.x', name: 'X', capacity_ml: null, sort_order: 1, color: 'red' }],
    } as unknown as SeedData
    expect(() => validateSeedData(extra)).toThrow()
    const badSlug: SeedData = {
      ...base,
      categories: [
        { seed_key: 'cat.x', name: 'X', slug: 'Crème', parent: null, sort_order: 1, batch_hint: 'ok' },
      ],
    }
    expect(() => validateSeedData(badSlug)).toThrow()
  })
})
