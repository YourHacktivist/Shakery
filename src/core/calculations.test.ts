import { describe, expect, it } from 'vitest'
import { servedAbv, socleAbv } from './abv'
import { recipeAllergens } from './allergens'
import { computeComposition } from './composition'
import { costRatio, recipeCost, salePrice } from './cost'
import { DEFAULT_DILUTION, dilutionFor } from './dilution'
import { ingredient, line, product, recipe, resolver } from './testing'
import { DEFAULT_EQUIVALENCES, EXACT_OZ_ML, fromMl, lineVolumeMl, ozFraction } from './units'

const gin = ingredient('gin', { abv: 40, sugarGPerL: 0, acidGPerL: 0 })
const vermouth = ingredient('vermouth', {
  abv: 14.5,
  sugarGPerL: 150,
  acidGPerL: 5,
  compositionConfidence: 'estimated',
})
const campari = ingredient('campari', { abv: 25, sugarGPerL: 240, acidGPerL: 0 })
const lemon = ingredient('lemon', { abv: 0, sugarGPerL: 25, acidGPerL: 60, compositionConfidence: 'sourced' })
const sugar = ingredient('sugar', { abv: 0, sugarGPerL: 1000, acidGPerL: 0 })
const water = ingredient('water', { abv: 0, sugarGPerL: 0, acidGPerL: 0, isStaple: true })

describe('units', () => {
  it('converts volumetric units, with approximations flagged', () => {
    expect(lineVolumeMl(line('a', 'gin', 4, 'cl'))).toEqual({ ok: true, ml: 40, approximate: false })
    expect(lineVolumeMl(line('a', 'gin', 1, 'oz'))).toEqual({ ok: true, ml: 30, approximate: false })
    expect(
      lineVolumeMl(line('a', 'gin', 1, 'oz'), { ...DEFAULT_EQUIVALENCES, ozMl: EXACT_OZ_ML }),
    ).toMatchObject({
      ml: EXACT_OZ_ML,
    })
    expect(lineVolumeMl(line('a', 'gin', 2, 'dash'))).toEqual({ ok: true, ml: 0.5, approximate: true })
    expect(lineVolumeMl(line('a', 'gin', 3, 'drop'))).toMatchObject({ ml: 0.15000000000000002 })
    expect(lineVolumeMl(line('a', 'gin', 1, 'barspoon'))).toMatchObject({ ml: 5, approximate: true })
    expect(lineVolumeMl(line('a', 'gin', 1, 'tsp'))).toMatchObject({ ml: 5 })
  })

  it('leaves non-volumetric units out and flags what is missing', () => {
    expect(lineVolumeMl(line('a', 'mint', 10, 'leaf'))).toEqual({ ok: false, reason: 'not_volumetric' })
    expect(lineVolumeMl(line('a', 'gin', null, 'ml'))).toEqual({ ok: false, reason: 'missing_quantity' })
    expect(lineVolumeMl(line('a', 'soda', null, 'top'))).toEqual({
      ok: false,
      reason: 'top_without_estimate',
    })
    expect(lineVolumeMl(line('a', 'soda', null, 'top', { topEstimateMl: 60 }))).toEqual({
      ok: true,
      ml: 60,
      approximate: true,
    })
  })

  it('rounds for display to readable steps', () => {
    expect(fromMl(22.4, 'ml')).toBe(22.5)
    expect(fromMl(22.4, 'cl')).toBe(2)
    expect(fromMl(45, 'oz')).toBe(1.5)
    expect(ozFraction(1.75)).toBe('1 ¾')
    expect(ozFraction(0.25)).toBe('¼')
    expect(ozFraction(2)).toBe('2')
    expect(ozFraction(0)).toBe('0')
  })
})

describe('dilution', () => {
  it('uses the override first, then the method, and never dilutes a preparation', () => {
    expect(dilutionFor({ kind: 'cocktail', method: 'shake', dilutionOverridePct: null })).toBe(0.25)
    expect(dilutionFor({ kind: 'cocktail', method: 'shake', dilutionOverridePct: 30 })).toBe(0.3)
    expect(dilutionFor({ kind: 'cocktail', method: null, dilutionOverridePct: null })).toBe(
      DEFAULT_DILUTION.other,
    )
    expect(dilutionFor({ kind: 'prep', method: 'stir', dilutionOverridePct: 10 })).toBe(0)
    expect(dilutionFor({ kind: 'cocktail', method: 'stir', dilutionOverridePct: -5 })).toBe(0)
  })
})

describe('composition and served ABV', () => {
  const negroni = recipe('negroni', [
    line('l1', 'gin', 30),
    line('l2', 'vermouth', 30),
    line('l3', 'campari', 30),
  ])
  const context = { resolver: resolver({ ingredients: [gin, vermouth, campari] }) }

  it('computes the served ABV of a Negroni with stir dilution', () => {
    const result = computeComposition(negroni, context)
    expect(result.initialVolumeMl).toBe(90)
    expect(result.finalVolumeMl).toBeCloseTo(108)
    // (30×40 + 30×14.5 + 30×25) / 100 = 23.85 ml of alcohol in 108 ml
    expect(result.abv.value).toBeCloseTo(22.083, 2)
    expect(result.abv.status).toBe('complete')
  })

  it('marks sugar estimated when one input is an estimate, and computes the ratio', () => {
    const result = computeComposition(negroni, context)
    expect(result.sugarPer100Ml.status).toBe('estimated')
    expect(result.sugarPer100Ml.value).toBeCloseTo(((30 * 150 + 30 * 240) / 1000 / 108) * 100, 5)
    expect(result.ratio.value).toBeCloseTo((30 * 150 + 30 * 240) / (30 * 5), 3)
  })

  it('never turns a missing value into zero and names the line', () => {
    const unknownAbv = ingredient('liqueur')
    const r = recipe('r', [line('l1', 'gin', 40), line('l2', 'liqueur', 20)])
    const result = servedAbv(r, { resolver: resolver({ ingredients: [gin, unknownAbv] }) })
    expect(result.value).toBeNull()
    expect(result.status).toBe('incomplete')
    expect(result.issues).toEqual([{ lineId: 'l2', reason: 'missing_abv', ingredientId: 'liqueur' }])
  })

  it('prefers the bottle values, skips optional, garnish and disabled lines', () => {
    const r = recipe(
      'r',
      [
        line('l1', 'gin', 50, 'ml', { preferredProductId: 'navy' }),
        line('l2', 'campari', 50, 'ml', { isOptional: true }),
        line('l3', 'gin', 1, 'slice', { isGarnish: true }),
        line('l4', 'campari', 30, 'ml', { enabled: false }),
      ],
      { method: 'build', dilutionOverridePct: 0 },
    )
    const result = computeComposition(r, {
      resolver: resolver({ ingredients: [gin, campari], products: [product('navy', 'gin', { abv: 57 })] }),
    })
    expect(result.initialVolumeMl).toBe(50)
    expect(result.abv.value).toBeCloseTo(57)
  })

  it('makes the result incomplete for a top without estimate and an unknown ingredient', () => {
    const r = recipe('r', [line('l1', 'gin', 40), line('l2', 'soda', null, 'top'), line('l3', 'ghost', 10)])
    const result = computeComposition(r, { resolver: resolver({ ingredients: [gin, water] }) })
    expect(result.abv.status).toBe('incomplete')
    expect(result.abv.issues.map((i) => i.reason)).toEqual(['top_without_estimate', 'unknown_ingredient'])
  })

  it('computes a homemade preparation from its recipe, per its yield, recursively', () => {
    const syrupIngredient = ingredient('syrup', { prepRecipeId: 'syrup-recipe' })
    // 1:1 simple syrup: 500 g sugar (counted as 500 ml of sugar at 1000 g/l) + 500 ml water, yield 750 ml
    const syrup = recipe('syrup-recipe', [line('s1', 'sugar', 500), line('s2', 'water', 500)], {
      kind: 'prep',
      yieldMl: 750,
    })
    const sour = recipe('sour', [line('l1', 'gin', 50), line('l2', 'lemon', 25), line('l3', 'syrup', 20)], {
      method: 'shake',
    })
    const ctx = {
      resolver: resolver({ ingredients: [gin, lemon, sugar, water, syrupIngredient], recipes: [syrup] }),
    }
    const prep = computeComposition(syrup, ctx)
    expect(prep.dilution).toBe(0)
    expect(prep.sugarPer100Ml.value).toBeCloseTo(((500 * 1000) / 1000 / 750) * 100, 5)
    const result = computeComposition(sour, ctx)
    expect(result.sugarPer100Ml.status).toBe('complete')
    const syrupSugarPerL = (500 / 750) * 1000
    expect(result.sugarPer100Ml.value).toBeCloseTo(
      ((25 * 25 + 20 * syrupSugarPerL) / 1000 / (95 * 1.25)) * 100,
      5,
    )
    expect(result.abv.value).toBeCloseTo(((50 * 40) / 100 / (95 * 1.25)) * 100, 5)
  })

  it('detects a preparation that uses itself through a chain', () => {
    const a = ingredient('a', { prepRecipeId: 'ra' })
    const b = ingredient('b', { prepRecipeId: 'rb' })
    const ra = recipe('ra', [line('x', 'b', 10)], { kind: 'prep' })
    const rb = recipe('rb', [line('y', 'a', 10)], { kind: 'prep' })
    const drink = recipe('drink', [line('z', 'a', 20)])
    const result = computeComposition(drink, {
      resolver: resolver({ ingredients: [a, b], recipes: [ra, rb] }),
    })
    expect(result.abv.status).toBe('incomplete')
    expect(result.abv.issues.some((i) => i.reason === 'cycle')).toBe(true)
  })

  it('flags approximate volumes', () => {
    const r = recipe('r', [line('l1', 'gin', 60), line('l2', 'campari', 2, 'dash')])
    expect(computeComposition(r, context).approximate).toBe(true)
  })
})

describe('socle ABV (MAF method)', () => {
  it('reproduces the Americano example of the socle: 1 540 / 120 = 12,8', () => {
    const result = socleAbv([
      { id: 'a', quantity: 20, unit: 'ml', abvPct: 14.5, countedInAbv: true },
      { id: 'b', quantity: 50, unit: 'ml', abvPct: 25, countedInAbv: true },
      { id: 'c', quantity: 50, unit: 'ml', abvPct: 0, countedInAbv: true },
    ])
    expect(result).toEqual({ ok: true, volumeMl: 120, volumeTimesAbv: 1540, abvPct: 12.8 })
  })

  it('reproduces the Negroni (26,5) and leaves dashes out', () => {
    const result = socleAbv([
      { id: 'a', quantity: 3, unit: 'cl', abvPct: 14.5, countedInAbv: true },
      { id: 'b', quantity: 30, unit: 'ml', abvPct: 25, countedInAbv: true },
      { id: 'c', quantity: 1, unit: 'oz', abvPct: 40, countedInAbv: true },
      { id: 'd', quantity: 2, unit: 'dash', abvPct: 44.7, countedInAbv: false },
    ])
    expect(result).toMatchObject({ ok: true, volumeMl: 90, abvPct: 26.5 })
  })

  it('names the counted lines without ABV', () => {
    expect(socleAbv([{ id: 'a', quantity: 30, unit: 'ml', abvPct: null, countedInAbv: true }])).toEqual({
      ok: false,
      missing: ['a'],
    })
    expect(socleAbv([])).toEqual({ ok: false, missing: [] })
  })
})

describe('allergens', () => {
  it('unions the lines recursively and keeps optional-only allergens apart', () => {
    const egg = ingredient('egg', { allergens: ['eggs'] })
    const orgeatIngredient = ingredient('orgeat', { prepRecipeId: 'orgeat-recipe' })
    const almonds = ingredient('almonds', { allergens: ['nuts'] })
    const orgeat = recipe('orgeat-recipe', [line('o1', 'almonds', 200, 'g'), line('o2', 'sugar', 200)], {
      kind: 'prep',
    })
    const sour = recipe('sour', [
      line('l1', 'gin', 50, 'ml', { preferredProductId: 'gin-p' }),
      line('l2', 'orgeat', 15),
      line('l3', 'egg', 1, 'piece', { isOptional: true }),
    ])
    const result = recipeAllergens(
      sour,
      resolver({
        ingredients: [gin, egg, orgeatIngredient, almonds, sugar],
        products: [product('gin-p', 'gin', { allergens: ['sulphites'] })],
        recipes: [orgeat],
      }),
    )
    expect(result).toEqual({ required: ['nuts', 'sulphites'], optional: ['eggs'], unresolvedLineIds: [] })
  })

  it('reports unknown ingredients and cycles instead of hiding them', () => {
    const a = ingredient('a', { prepRecipeId: 'ra' })
    const ra = recipe('ra', [line('x', 'a', 10)], { kind: 'prep' })
    const r = recipe('r', [
      line('l1', 'a', 10),
      line('l2', 'ghost', 10),
      line('l3', 'gin', 10, 'ml', { enabled: false }),
    ])
    expect(recipeAllergens(r, resolver({ ingredients: [a, gin], recipes: [ra] })).unresolvedLineIds).toEqual([
      'l1',
      'l2',
    ])
  })
})

describe('cost and sale price', () => {
  const ht = (cents: number, volumeMl: number) => ({
    purchasePriceCents: cents,
    purchasePriceBasis: 'ht' as const,
    volumeMl,
  })

  it('reproduces the Aviation of the MAF notebook: 1,83 € HT, 9,14 €, 9,50 €, 23 %', () => {
    const lemonJuice = ingredient('lemon')
    const maraschino = ingredient('maraschino')
    const violet = ingredient('violet')
    const r = recipe(
      'aviation',
      [
        line('l1', 'lemon', 10, 'ml', { preferredProductId: 'p-lemon' }),
        line('l2', 'maraschino', 15, 'ml', { preferredProductId: 'p-mara' }),
        line('l3', 'violet', 5, 'ml', { preferredProductId: 'p-violet' }),
        line('l4', 'gin', 40, 'ml', { preferredProductId: 'p-gin' }),
      ],
      { garnishCostHtCents: 15 },
    )
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [lemonJuice, maraschino, violet, gin],
        products: [
          product('p-lemon', 'lemon', ht(1200, 1000)),
          product('p-mara', 'maraschino', ht(2200, 700)),
          product('p-violet', 'violet', ht(2400, 700)),
          product('p-gin', 'gin', ht(1600, 700)),
        ],
      }),
    })
    expect(result.status).toBe('complete')
    expect(result.basis).toBe('ht')
    expect(Math.round(result.cents ?? 0)).toBe(183)
    const price = salePrice(result.cents ?? 0)
    expect(price.suggestedTtcCents).toBe(914)
    expect(price.menuTtcCents).toBe(950)
    expect(Math.round(price.costRatioPct)).toBe(23)
  })

  it('prices counted articles and flat servings', () => {
    const mint = ingredient('mint')
    const lime = ingredient('lime')
    const seasoning = ingredient('seasoning')
    const r = recipe('r', [
      line('l1', 'mint', 10, 'leaf', { preferredProductId: 'p-mint' }),
      line('l2', 'lime', 0.5, 'piece', { preferredProductId: 'p-lime' }),
      line('l3', 'seasoning', null, 'to_taste', { preferredProductId: 'p-season' }),
    ])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [mint, lime, seasoning],
        products: [
          product('p-mint', 'mint', {
            purchasePriceCents: 25,
            purchasePriceBasis: 'ht',
            packQuantity: 10,
            packUnit: 'leaf',
          }),
          product('p-lime', 'lime', {
            purchasePriceCents: 36,
            purchasePriceBasis: 'ht',
            packQuantity: 1,
            packUnit: 'piece',
          }),
          product('p-season', 'seasoning', {
            purchasePriceCents: 10,
            purchasePriceBasis: 'ht',
            packQuantity: 1,
            packUnit: 'serving',
          }),
        ],
      }),
    })
    expect(result.cents).toBeCloseTo(25 + 18 + 10)
  })

  it('falls back on the median of owned bottles, then on the preparation', () => {
    const syrupIngredient = ingredient('syrup', { prepRecipeId: 'syrup-recipe' })
    const syrup = recipe('syrup-recipe', [line('s1', 'sugar', 500), line('s2', 'water', 500)], {
      kind: 'prep',
      yieldMl: 1000,
    })
    const r = recipe('r', [line('l1', 'gin', 50), line('l2', 'syrup', 20)])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [gin, sugar, water, syrupIngredient],
        products: [
          product('g1', 'gin', { ...ht(1000, 1000), owned: true }),
          product('g2', 'gin', { ...ht(3000, 1000), owned: true }),
          product('g3', 'gin', { ...ht(9000, 1000), owned: false }),
          product('s', 'sugar', { ...ht(100, 1000), owned: true }),
          product('w', 'water', { ...ht(0, 1000), owned: true }),
        ],
        recipes: [syrup],
      }),
    })
    // gin: median of 1 and 3 cents per ml = 2 → 100 ; syrup: 50 cents per litre → 1 cent for 20 ml
    expect(result.cents).toBeCloseTo(100 + 1)
  })

  it('refuses to mix HT and TTC prices, and names missing prices', () => {
    const r = recipe('r', [
      line('l1', 'gin', 50, 'ml', { preferredProductId: 'a' }),
      line('l2', 'campari', 20, 'ml', { preferredProductId: 'b' }),
      line('l3', 'lemon', 20),
    ])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [gin, campari, lemon],
        products: [
          product('a', 'gin', ht(1600, 700)),
          product('b', 'campari', { purchasePriceCents: 1800, purchasePriceBasis: 'ttc', volumeMl: 700 }),
        ],
      }),
    })
    expect(result.cents).toBeNull()
    expect(result.basis).toBeNull()
    expect(result.issues.map((i) => i.reason).sort()).toEqual(['missing_price', 'mixed_price_basis'])
  })

  it('rounds the menu price up to the step, never past an exact step', () => {
    expect(salePrice(190).menuTtcCents).toBe(950)
    expect(salePrice(191).menuTtcCents).toBe(1000)
    expect(
      salePrice(191, { multiplier: 5, vatRateBp: 2000, roundingStepCents: 50, rounding: 'nearest' })
        .menuTtcCents,
    ).toBe(950)
    expect(costRatio(100, 0, 2000)).toBeNaN()
  })

  it('detects a cost cycle through preparations', () => {
    const a = ingredient('a', { prepRecipeId: 'ra' })
    const ra = recipe('ra', [line('x', 'a', 10)], { kind: 'prep', yieldMl: 10 })
    const result = recipeCost(recipe('r', [line('l1', 'a', 10)]), {
      resolver: resolver({ ingredients: [a], recipes: [ra] }),
    })
    expect(result.issues.map((i) => i.reason)).toEqual(['cycle'])
  })
})

describe('edge cases', () => {
  const syrupIngredient = ingredient('syrup', { prepRecipeId: 'syrup-recipe' })
  const syrup = recipe(
    'syrup-recipe',
    [line('s1', 'sugar', 500), line('s2', 'water', 500), line('s3', 'egg', 1, 'piece', { isOptional: true })],
    { kind: 'prep' },
  )
  const egg = ingredient('egg', { allergens: ['eggs'] })

  it('reuses a preparation computed once for two lines', () => {
    const r = recipe('r', [line('l1', 'syrup', 10), line('l2', 'syrup', 10), line('l3', 'gin', 40)])
    const result = computeComposition(r, {
      resolver: resolver({ ingredients: [gin, sugar, water, syrupIngredient], recipes: [syrup] }),
    })
    expect(result.sugarPer100Ml.status).toBe('complete')
    const allergens = recipeAllergens(
      r,
      resolver({ ingredients: [gin, sugar, water, syrupIngredient, egg], recipes: [syrup] }),
    )
    expect(allergens.required).toEqual([])
  })

  it('treats a preparation whose recipe is missing as unknown data', () => {
    const orphan = ingredient('orphan', { prepRecipeId: 'gone' })
    const r = recipe('r', [line('l1', 'orphan', 10)])
    const res = resolver({ ingredients: [orphan] })
    expect(computeComposition(r, { resolver: res }).abv.issues[0]?.reason).toBe('missing_abv')
    expect(recipeCost(r, { resolver: res }).issues[0]?.reason).toBe('missing_price')
    expect(recipeAllergens(r, res).required).toEqual([])
  })

  it('costs a preparation without yield over its counted volume', () => {
    const r = recipe('r', [line('l1', 'syrup', 100)])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [sugar, water, syrupIngredient],
        products: [
          product('s', 'sugar', {
            purchasePriceCents: 200,
            purchasePriceBasis: 'ht',
            volumeMl: 1000,
            owned: true,
          }),
          product('w', 'water', {
            purchasePriceCents: 0,
            purchasePriceBasis: 'ht',
            volumeMl: 1000,
            owned: true,
          }),
        ],
        recipes: [syrup],
      }),
    })
    // 500 ml of sugar at 0.2 c/ml = 100 c for 1000 ml → 10 c for 100 ml
    expect(result.cents).toBeCloseTo(10)
  })

  it('refuses a counted article measured in another unit, and lines without volume', () => {
    const mint = ingredient('mint')
    const r = recipe('r', [
      line('l1', 'mint', 5, 'g', { preferredProductId: 'p-mint' }),
      line('l2', 'gin', null),
    ])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [mint, gin],
        products: [
          product('p-mint', 'mint', {
            purchasePriceCents: 25,
            purchasePriceBasis: 'ht',
            packQuantity: 10,
            packUnit: 'leaf',
          }),
        ],
      }),
    })
    expect(result.lines).toEqual([
      { lineId: 'l1', cents: null },
      { lineId: 'l2', cents: null },
    ])
  })

  it('ignores owned bottles with mixed bases and without price', () => {
    const r = recipe('r', [line('l1', 'gin', 10)])
    const result = recipeCost(r, {
      resolver: resolver({
        ingredients: [gin],
        products: [
          product('a', 'gin', {
            purchasePriceCents: 1000,
            purchasePriceBasis: 'ht',
            volumeMl: 1000,
            owned: true,
          }),
          product('b', 'gin', {
            purchasePriceCents: 1200,
            purchasePriceBasis: 'ttc',
            volumeMl: 1000,
            owned: true,
          }),
          product('c', 'gin', { owned: true }),
        ],
      }),
    })
    expect(result.status).toBe('incomplete')
  })

  it('reports a zero ABV preparation yield as unknown, and a zero acid ratio as missing', () => {
    const r = recipe('r', [line('l1', 'sugar', 10)], { kind: 'prep', yieldMl: 0 })
    const result = computeComposition(r, { resolver: resolver({ ingredients: [sugar] }) })
    expect(result.abv.value).toBeNull()
    expect(result.ratio.value).toBeNull()
  })
})
