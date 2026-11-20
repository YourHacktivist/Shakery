import { describe, expect, it } from 'vitest'
import { build24c, type Map24c, parseLine, parseQuantity, type Raw24c } from './cocktails24'

describe('24cocktails line reading', () => {
  it('cuts a label, a quantity and a unit', () => {
    expect(parseLine('Rutte Dry Gin 30 ml')).toEqual({
      label: 'rutte dry gin',
      quantity: 30,
      unitWord: 'ml',
      extra: null,
      marker: null,
    })
  })

  it('keeps numbers of the name in the label and takes the last quantity', () => {
    expect(parseLine("Dewar's 12 Year Old Scotch whisky 60 ml")).toMatchObject({
      label: "dewar's 12 year old scotch whisky",
      quantity: 60,
      unitWord: 'ml',
    })
    expect(parseLine('Saline solution (4 parts water to 1 part salt) 2 drop')).toMatchObject({
      label: 'saline solution (4 parts water to 1 part salt)',
      quantity: 2,
      unitWord: 'drop',
    })
  })

  it('reads fractions, mixed numbers and ranges whole', () => {
    expect(parseLine('Sugar syrup 1 1/2 spoon')).toMatchObject({ label: 'sugar syrup', quantity: 1.5 })
    expect(parseLine('Lime (fresh) 1⁄2 fresh')).toMatchObject({ label: 'lime (fresh)', quantity: 0.5 })
    expect(parseLine('Angostura Aromatic Bitters 1-2 dash')).toMatchObject({
      quantity: 1.5,
      unitWord: 'dash',
    })
    expect(parseQuantity('½')).toBe(0.5)
    expect(parseQuantity('1 to 3')).toBe(2)
  })

  it('keeps the text after the unit apart', () => {
    expect(parseLine('Orange Bitters by Angostura 1 dash (4 drops)')).toMatchObject({
      label: 'orange bitters by angostura',
      unitWord: 'dash',
      extra: '(4 drops)',
    })
  })

  it('recognises top-ups, garnishes and lines without quantity', () => {
    expect(parseLine('Brut Champagne Top up with')).toMatchObject({ label: 'brut champagne', marker: 'top' })
    expect(parseLine('Lemon Garnish with')).toMatchObject({ label: 'lemon', marker: 'garnish' })
    expect(parseLine('Maraschino cherry')).toEqual({
      label: 'maraschino cherry',
      quantity: null,
      unitWord: null,
      extra: null,
      marker: null,
    })
    expect(parseLine('Cranberries 2')).toMatchObject({ label: 'cranberries', quantity: 2, unitWord: null })
  })
})

describe('24cocktails recipe build', () => {
  const map: Map24c = {
    units: {
      ml: { unit: 'ml' },
      dash: { unit: 'dash' },
      tbsp: { unit: 'ml', factor: 15, note: 'cuillère à soupe' },
    },
    glasses: { 'Coupe glass': 'glass.coupe' },
    methods: { stirred: 'stir' },
    ingredients: {
      bourbon: { i: 'Bourbon', b: 'Buffalo Trace' },
      campari: { i: 'Campari' },
      'sweet vermouth': { i: 'Vermouth rouge' },
      'ice cubes': null,
      'orange zest': { i: 'Orange', u: 'piece', g: true },
    },
    extras: {},
    lines: {},
  }
  const keys = new Map([
    ['bourbon', 'ing.bourbon'],
    ['campari', 'ing.campari'],
    ['vermouth rouge', 'ing.vermouth-rouge'],
    ['orange', 'ing.orange'],
  ])
  const raw = (name: string, ingredients: string[]): Raw24c => ({
    name,
    url: `https://24cocktails.com/cocktail/${name.toLowerCase()}`,
    abv: 25,
    base: 'whiskey',
    method: 'stirred',
    glass: 'Coupe glass',
    garnish: 'Orange zest',
    ingredients,
  })

  it('turns a recipe into a classic seed with brand notes, garnish and no link', () => {
    const result = build24c(
      [
        raw('Boulevardier', [
          'Bourbon 45 ml',
          'Campari 30 ml',
          'Sweet vermouth 2 tbsp',
          'Ice cubes',
          'Orange zest',
        ]),
      ],
      map,
      { 'Orange zest': "Zeste d'orange" },
      keys,
      new Set(),
    )
    expect(result.problems).toEqual([])
    const [recipe] = result.recipes
    expect(recipe).toMatchObject({
      seed_key: 'c24.boulevardier',
      name: 'Boulevardier',
      source: 'seed',
      credit: null,
      method: 'stir',
      glass: 'glass.coupe',
      garnish: "Zeste d'orange",
    })
    expect(recipe?.lines).toEqual([
      {
        ingredient: 'ing.bourbon',
        quantity: 45,
        unit: 'ml',
        is_optional: false,
        is_garnish: false,
        note: 'Buffalo Trace',
      },
      {
        ingredient: 'ing.campari',
        quantity: 30,
        unit: 'ml',
        is_optional: false,
        is_garnish: false,
        note: null,
      },
      {
        ingredient: 'ing.vermouth-rouge',
        quantity: 30,
        unit: 'ml',
        is_optional: false,
        is_garnish: false,
        note: 'cuillère à soupe',
      },
      {
        ingredient: 'ing.orange',
        quantity: null,
        unit: 'piece',
        is_optional: false,
        is_garnish: true,
        note: null,
      },
    ])
  })

  it('leaves out a name already taken by an IBA classic and reports unknown labels', () => {
    const result = build24c(
      [raw('Negroni', ['Campari 30 ml']), raw('Mystery', ['Unicorn tears 10 ml'])],
      map,
      { 'Orange zest': "Zeste d'orange" },
      keys,
      new Set(['negroni']),
    )
    expect(result.skipped).toEqual(['Negroni'])
    expect(result.problems.some((problem) => problem.includes('unicorn tears'))).toBe(true)
  })
})
