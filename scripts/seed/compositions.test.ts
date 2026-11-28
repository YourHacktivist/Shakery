import { describe, expect, it } from 'vitest'
import { computeRecipe, convert, hydroalcoholicDensity, round, solutionDensity } from './compositions'

describe('compositions of the seed (D-061)', () => {
  it('reads the density of water and ethanol at 20 °C', () => {
    expect(hydroalcoholicDensity(0)).toBeCloseTo(0.9982, 4)
    // 40 % vol: 0.948 g/ml (OIML tables).
    expect(hydroalcoholicDensity(40)).toBeCloseTo(0.948, 3)
    expect(hydroalcoholicDensity(100)).toBeCloseTo(0.78934, 5)
    expect(hydroalcoholicDensity(120)).toBeCloseTo(0.78934, 5)
  })

  it('finds the density of a sugar solution within half a percent of the sucrose tables', () => {
    // 50 °Brix: 1.2296 g/ml at 20 °C, that is 614.8 g of sugar per litre.
    const syrup = convert({ sugar: { value: 50, unit: 'g/100g' }, acid: null, density_g_per_ml: null }, 0)
    expect(Math.abs(syrup.density - 1.2296) / 1.2296).toBeLessThan(0.005)
    expect(Math.abs((syrup.sugar ?? 0) - 614.8) / 614.8).toBeLessThan(0.005)
    expect(solutionDensity(0, 0)).toBeCloseTo(0.9982, 4)
  })

  it('converts per litre, per 100 ml and per 100 g, with the density of the source when given', () => {
    expect(
      convert({ sugar: { value: 240, unit: 'g/L' }, acid: null, density_g_per_ml: null }, 25),
    ).toMatchObject({
      sugar: 240,
      acid: null,
    })
    expect(
      convert(
        {
          sugar: { value: 16, unit: 'g/100ml' },
          acid: { value: 0.6, unit: 'g/100ml', as: 'tartaric' },
          density_g_per_ml: null,
        },
        16,
      ),
    ).toMatchObject({ sugar: 160, acid: 6 })
    expect(
      convert({ sugar: { value: 80, unit: 'g/100g' }, acid: null, density_g_per_ml: 1.42 }, 0).sugar,
    ).toBeCloseTo(1136, 1)
  })

  it('gives a liqueur per 100 g a density above water and the juice per 100 g a few percent more', () => {
    const liqueur = convert(
      { sugar: { value: 35.3, unit: 'g/100g' }, acid: null, density_g_per_ml: null },
      25,
    )
    expect(liqueur.density).toBeGreaterThan(1.08)
    expect(liqueur.density).toBeLessThan(1.15)
    const juice = convert(
      {
        sugar: { value: 8.4, unit: 'g/100g' },
        acid: { value: 0.8, unit: 'g/100g', as: 'organic_acids_total' },
        density_g_per_ml: null,
      },
      0,
    )
    expect(juice.sugar).toBeGreaterThan(84)
    expect(juice.sugar).toBeLessThan(84 * 1.05)
  })

  it('expresses a sulphuric acidity as tartaric acid', () => {
    const wine = convert(
      { sugar: null, acid: { value: 4, unit: 'g/L', as: 'sulfuric' }, density_g_per_ml: null },
      12,
    )
    expect(wine.acid).toBeCloseTo(6.12, 2)
  })

  it('computes a standard recipe like a preparation of Shakery', () => {
    const facts = new Map([
      ['Sucre blanc', { sugar: 1586.8, acid: 0, density: 1.59 }],
      ['Eau plate', { sugar: 0, acid: 0, density: null }],
      ['Zeste', { sugar: null, acid: null, density: null }],
      ['Jus de citron', { sugar: 21.2, acid: 49.4, density: null }],
    ])
    const simple = computeRecipe(
      [
        { ingredient: 'Sucre blanc', quantity: 500, unit: 'g' },
        { ingredient: 'Eau plate', quantity: 500, unit: 'ml' },
        { ingredient: 'Zeste', quantity: 10, unit: 'g' },
      ],
      (name) => facts.get(name),
    )
    // The simple syrup of the seed: 61.3 g of sugar per 100 ml (D-031).
    expect(simple.sugar).toBeCloseTo(612.7, 1)
    expect(simple.acid).toBe(0)
    const sour = computeRecipe(
      [
        { ingredient: 'Jus de citron', quantity: 100, unit: 'ml' },
        { ingredient: 'Eau plate', quantity: 100, unit: 'ml' },
      ],
      (name) => facts.get(name),
    )
    expect(sour).toEqual({ sugar: 10.6, acid: 24.7, density: null })
    expect(() =>
      computeRecipe([{ ingredient: 'Inconnu', quantity: 1, unit: 'ml' }], (name) => facts.get(name)),
    ).toThrow(/unknown/)
    expect(() =>
      computeRecipe([{ ingredient: 'Zeste', quantity: 1, unit: 'ml' }], (name) => facts.get(name)),
    ).toThrow(/without composition/)
    expect(() =>
      computeRecipe([{ ingredient: 'Zeste', quantity: 1, unit: 'g' }], (name) => facts.get(name)),
    ).toThrow(/without volume/)
  })

  it('rounds to two decimals under 10 g/L and one above', () => {
    expect(round(0.256)).toBe(0.26)
    expect(round(612.74)).toBe(612.7)
  })
})
