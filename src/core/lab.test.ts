import { describe, expect, it } from 'vitest'
import { percentile, referenceZones, ZONE_MINIMUM, type ZoneSource } from './balance'
import { compareRecipes, metricDelta, type CompareRecipe } from './compare'

const base: CompareRecipe = {
  method: 'stir',
  glassId: 'rocks',
  lines: [
    { ingredientId: 'gin', quantity: 30, unit: 'ml' },
    { ingredientId: 'campari', quantity: 30, unit: 'ml' },
    { ingredientId: 'vermouth', quantity: 30, unit: 'ml' },
  ],
}

describe('compareRecipes', () => {
  it('sees no change between identical versions, nor after a reordering alone', () => {
    expect(compareRecipes(base, base)).toMatchObject({
      identical: true,
      reordered: false,
      method: null,
      glass: null,
    })
    const reordered = { ...base, lines: [...base.lines].reverse() }
    expect(compareRecipes(base, reordered)).toMatchObject({ identical: true, reordered: true })
  })

  it('lists added, removed and changed lines with the gap, and method or glass changes', () => {
    const after: CompareRecipe = {
      method: 'build',
      glassId: 'coupe',
      lines: [
        { ingredientId: 'gin', quantity: 45, unit: 'ml' },
        { ingredientId: 'vermouth', quantity: 1, unit: 'oz' },
        { ingredientId: 'soda', quantity: null, unit: 'top' },
      ],
    }
    const diff = compareRecipes(base, after)
    expect(diff.identical).toBe(false)
    expect(diff.method).toEqual({ before: 'stir', after: 'build' })
    expect(diff.glass).toEqual({ before: 'rocks', after: 'coupe' })
    expect(diff.lines.map((change) => change.kind)).toEqual(['dose', 'dose', 'added', 'removed'])
    expect(diff.lines[0]).toMatchObject({ ingredientId: 'gin', delta: 15 })
    // A change of unit has no gap in numbers.
    expect(diff.lines[1]).toMatchObject({ ingredientId: 'vermouth', delta: null })
    expect(diff.lines[3]).toMatchObject({ kind: 'removed', line: { ingredientId: 'campari' } })
  })

  it('matches a repeated ingredient line by line, and sees optional or garnish flags', () => {
    const twice: CompareRecipe = {
      ...base,
      lines: [...base.lines, { ingredientId: 'gin', quantity: 5, unit: 'ml' }],
    }
    const changed: CompareRecipe = {
      ...twice,
      lines: twice.lines.map((line, index) => (index === 3 ? { ...line, isOptional: true } : line)),
    }
    const diff = compareRecipes(twice, changed)
    expect(diff.lines.filter((change) => change.kind === 'dose')).toHaveLength(1)
    expect(diff.lines[3]).toMatchObject({ kind: 'dose', delta: 0 })
  })

  it('gives the gap of an indicator only when both sides are known', () => {
    expect(metricDelta(20, 22.5)).toBe(2.5)
    expect(metricDelta(null, 3)).toBeNull()
  })
})

function source(id: string, extra: Partial<ZoneSource> & { abv?: number | null }): ZoneSource {
  return {
    id,
    family: 'sour',
    status: 'final',
    origin: 'mine',
    values: { abv: extra.abv ?? null, sugar: null, acid: null, ratio: null },
    ...extra,
  }
}

describe('referenceZones', () => {
  it('computes the interval between the 25th and 75th percentiles', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20)
    expect(percentile([10, 20, 30, 40], 0.75)).toBe(32.5)
    expect(() => percentile([], 0.5)).toThrow()
  })

  it('shows a zone only from five complete recipes, and lists them', () => {
    const four = [10, 12, 14, 16].map((abv, i) => source(`r${i}`, { abv }))
    expect(referenceZones(four)).toEqual({})
    const five = [...four, source('r4', { abv: 18 })]
    expect(ZONE_MINIMUM).toBe(5)
    expect(referenceZones(five)).toEqual({
      sour: { abv: { from: 12, to: 16, recipeIds: ['r0', 'r1', 'r2', 'r3', 'r4'] } },
    })
  })

  it('keeps only final recipes and classics with a family, and only complete values', () => {
    const sources = [
      ...[10, 12, 14, 16].map((abv, i) => source(`r${i}`, { abv })),
      source('draft', { abv: 30, status: 'draft' }),
      source('classic', { abv: 18, status: 'draft', origin: 'classic' }),
      source('nofamily', { abv: 40, family: null }),
      source('unknown', { abv: null }),
    ]
    expect(referenceZones(sources)['sour']?.abv?.recipeIds).toEqual(['r0', 'r1', 'r2', 'r3', 'classic'])
  })
})
