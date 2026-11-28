/**
 * Sugar and acid of the generic ingredients (D-061). compositions.json keeps each value as its
 * source gives it (per litre, per 100 ml or per 100 g) with that source; this module converts them
 * to grams per litre, the unit of Shakery (section 7), and computes the homemade preparations
 * from their standard recipe.
 */

export type AmountUnit = 'g/L' | 'g/100ml' | 'g/100g'

/** Acid as the source expresses it. Wine acidity in France is often given as sulphuric acid. */
export type AcidBasis =
  'organic_acids_total' | 'citric' | 'tartaric' | 'malic' | 'lactic' | 'acetic' | 'phosphoric' | 'sulfuric'

export type Amount = { value: number; unit: AmountUnit }
export type AcidAmount = Amount & { as: AcidBasis }

export type RecipePart = { ingredient: string; quantity: number; unit: 'g' | 'ml' }

export type CompositionEntry = {
  sugar: Amount | null
  acid: AcidAmount | null
  /** Given by a source for this product; otherwise computed when a value is per 100 g. */
  density_g_per_ml: number | null
  /** Standard recipe of a homemade preparation, computed like a preparation of Shakery. */
  recipe: RecipePart[] | null
  source: 'ciqual' | 'label' | 'reference' | 'computed'
  confidence: 'sourced' | 'estimated'
  refs: Array<{ title: string; url: string }>
  note: string
}

export type CompositionTable = { about: string; values: Record<string, CompositionEntry> }

/**
 * Density of water and ethanol mixtures at 20 °C by mass percent of ethanol (CRC Handbook of
 * Chemistry and Physics, « Concentrative properties of aqueous solutions »).
 */
const ETHANOL_BY_MASS: ReadonlyArray<readonly [number, number]> = [
  [0, 0.9982],
  [5, 0.98938],
  [10, 0.98187],
  [15, 0.97514],
  [20, 0.96864],
  [25, 0.96168],
  [30, 0.95382],
  [35, 0.94494],
  [40, 0.93518],
  [45, 0.92472],
  [50, 0.91384],
  [60, 0.89113],
  [70, 0.86766],
  [80, 0.84344],
  [90, 0.81797],
  [100, 0.78934],
]
const ETHANOL_DENSITY = 0.78934

/** The same table indexed by percent by volume: % vol = % mass × density / ethanol density. */
const ETHANOL_BY_VOLUME = ETHANOL_BY_MASS.map(([mass, density]) => [
  (mass * density) / ETHANOL_DENSITY,
  density,
])

/** Density in g/ml of a water and ethanol mixture of `abv` % vol at 20 °C, by linear interpolation. */
export function hydroalcoholicDensity(abv: number): number {
  const strength = Math.min(Math.max(abv, 0), 100)
  for (let i = 1; i < ETHANOL_BY_VOLUME.length; i += 1) {
    const [v1, d1] = ETHANOL_BY_VOLUME[i] as [number, number]
    const [v0, d0] = ETHANOL_BY_VOLUME[i - 1] as [number, number]
    if (strength <= v1) return d0 + ((strength - v0) / (v1 - v0)) * (d1 - d0)
  }
  return ETHANOL_DENSITY
}

/** Volume of one gram of dissolved sugar, as Shakery counts it (D-031: 1.59 g/ml). */
const DISSOLVED_SOLID_DENSITY = 1.59

/**
 * Density of a drink holding `solids` g/L of dissolved sugar and acid in a water and ethanol
 * mixture, the whole drink at `abv` % vol: the solids take 1/1.59 ml per gram, the rest is the
 * mixture, whose strength rises by as much.
 */
export function solutionDensity(abv: number, solids: number): number {
  const solidShare = Math.min(solids / (DISSOLVED_SOLID_DENSITY * 1000), 0.95)
  const strength = abv / (1 - solidShare)
  return solids / 1000 + (1 - solidShare) * hydroalcoholicDensity(strength)
}

/** g/L for an amount; `density` converts the values per 100 g. */
function perLitre(amount: Amount, density: number): number {
  if (amount.unit === 'g/L') return amount.value
  if (amount.unit === 'g/100ml') return amount.value * 10
  return amount.value * 10 * density
}

/** Tartaric acid equivalent of sulphuric acid: 75.04 g against 49.04 g per equivalent. */
const SULFURIC_TO_TARTARIC = 75.04 / 49.04

export type Converted = { sugar: number | null; acid: number | null; density: number }

/**
 * Sugar and acid in g/L. A value per 100 g is multiplied by 10 times the density: the one the
 * source gives, else the one of the drink, found by a few rounds since it depends on the sugar
 * and acid it holds.
 */
export function convert(
  entry: Pick<CompositionEntry, 'sugar' | 'acid' | 'density_g_per_ml'>,
  abv: number,
): Converted {
  let density = entry.density_g_per_ml ?? solutionDensity(abv, 0)
  let sugar = entry.sugar === null ? null : perLitre(entry.sugar, density)
  let acid = entry.acid === null ? null : perLitre(entry.acid, density)
  if (entry.density_g_per_ml === null) {
    for (let round = 0; round < 30; round += 1) {
      density = solutionDensity(abv, (sugar ?? 0) + (acid ?? 0))
      sugar = entry.sugar === null ? null : perLitre(entry.sugar, density)
      acid = entry.acid === null ? null : perLitre(entry.acid, density)
    }
  }
  if (acid !== null && entry.acid?.as === 'sulfuric') acid *= SULFURIC_TO_TARTARIC
  return { sugar: sugar === null ? null : round(sugar), acid: acid === null ? null : round(acid), density }
}

/** Two decimals under 10 g/L, one above: more would only be noise of the sources. */
export function round(value: number): number {
  return value < 10 ? Math.round(value * 100) / 100 : Math.round(value * 10) / 10
}

export type Facts = { sugar: number | null; acid: number | null; density: number | null }

/**
 * Sugar and acid of a standard recipe, as core/composition.ts computes a preparation without
 * yield: lines in ml count their volume, lines in grams count `g / density` ml, a line in
 * grams of an ingredient without density counts for nothing (a zest, a leaf).
 */
export function computeRecipe(
  parts: readonly RecipePart[],
  facts: (name: string) => Facts | undefined,
): Facts {
  let volume = 0
  let sugar = 0
  let acid = 0
  for (const part of parts) {
    const fact = facts(part.ingredient)
    if (!fact) throw new Error(`Recipe with an unknown ingredient: ${part.ingredient}`)
    let ml = part.quantity
    if (part.unit === 'g') {
      if (fact.density === null) continue
      ml = part.quantity / fact.density
    }
    if (fact.sugar === null || fact.acid === null) {
      throw new Error(`Recipe with an ingredient without composition: ${part.ingredient}`)
    }
    volume += ml
    sugar += (ml * fact.sugar) / 1000
    acid += (ml * fact.acid) / 1000
  }
  if (volume <= 0) throw new Error('Recipe without volume')
  return { sugar: round((sugar / volume) * 1000), acid: round((acid / volume) * 1000), density: null }
}
