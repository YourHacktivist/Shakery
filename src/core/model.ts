/**
 * Shared vocabulary of the calculation modules of core/ (sections 7 and 8 of the spec).
 *
 * Pure types and constants: no Electron, Node or DOM. The main process builds these
 * inputs from the database; the renderer and the future phone app call the same
 * functions on the same inputs.
 *
 * Rule of section 8: a missing value never becomes 0. Every result says whether it is
 * complete, estimated (some input is an estimate) or incomplete, and names the lines at
 * fault.
 */
import type { AllergenCode } from '../shared/domain/allergens'

export const UNITS = [
  'ml',
  'cl',
  'oz',
  'dash',
  'drop',
  'barspoon',
  'tsp',
  'g',
  'piece',
  'leaf',
  'slice',
  'wedge',
  'top',
  'to_taste',
] as const
export type Unit = (typeof UNITS)[number]

export const METHODS = ['shake', 'dry_shake', 'stir', 'build', 'throw', 'blend', 'swizzle', 'other'] as const
export type Method = (typeof METHODS)[number]

/** Units of a counted article bought by the piece (D-016); `serving` is a flat cost per drink. */
export const PACK_UNITS = ['piece', 'leaf', 'slice', 'wedge', 'barspoon', 'tsp', 'g', 'serving'] as const
export type PackUnit = (typeof PACK_UNITS)[number]

export type Confidence = 'sourced' | 'estimated'
export type PriceBasis = 'ht' | 'ttc'

/** complete: every input known; estimated: some input is an estimate; incomplete: something is missing. */
export type Completeness = 'complete' | 'estimated' | 'incomplete'

export type IssueReason =
  | 'missing_quantity'
  | 'not_volumetric'
  | 'top_without_estimate'
  | 'missing_abv'
  | 'missing_sugar'
  | 'missing_acid'
  | 'missing_price'
  | 'mixed_price_basis'
  | 'missing_yield'
  | 'cycle'
  | 'unknown_ingredient'

/** A line (or a nested preparation) that prevents a complete result, with the reason. */
export type Issue = {
  readonly lineId: string
  readonly reason: IssueReason
  /** Ingredient concerned, so the interface can name it. */
  readonly ingredientId?: string
}

/** Generic ingredient, as the calculations see it. */
export type IngredientFacts = {
  readonly id: string
  readonly abv: number | null
  readonly sugarGPerL: number | null
  readonly acidGPerL: number | null
  readonly compositionConfidence: Confidence | null
  /** Mass per millilitre: a line in grams of this ingredient counts as g / density millilitres. */
  readonly densityGPerMl: number | null
  readonly allergens: readonly AllergenCode[]
  /** Set when the ingredient is a homemade preparation: its facts come from that recipe. */
  readonly prepRecipeId: string | null
  readonly isStaple: boolean
}

/** Branded bottle (or counted article). Its values take precedence over the ingredient's. */
export type ProductFacts = {
  readonly id: string
  readonly ingredientId: string
  readonly abv: number | null
  readonly volumeMl: number | null
  readonly sugarGPerL: number | null
  readonly acidGPerL: number | null
  readonly purchasePriceCents: number | null
  readonly purchasePriceBasis: PriceBasis | null
  readonly packQuantity: number | null
  readonly packUnit: PackUnit | null
  readonly owned: boolean
  readonly allergens: readonly AllergenCode[]
}

export type LineInput = {
  readonly id: string
  readonly ingredientId: string
  readonly preferredProductId: string | null
  readonly quantity: number | null
  readonly unit: Unit
  readonly topEstimateMl: number | null
  readonly isOptional: boolean
  readonly isGarnish: boolean
  /** Free text of the line; an allergen it names counts (D-040). */
  readonly note?: string | null
  /** The lab can switch a line off without deleting it (section 8, « Atelier »). Default true. */
  readonly enabled?: boolean
}

export type RecipeInput = {
  readonly id: string
  readonly kind: 'cocktail' | 'prep'
  readonly method: Method | null
  readonly dilutionOverridePct: number | null
  readonly yieldMl: number | null
  readonly garnishCostHtCents: number | null
  readonly lines: readonly LineInput[]
}

/** Read access to the notebook, provided by the caller (repository in the main process, or a test). */
export interface FactsResolver {
  ingredient(id: string): IngredientFacts | undefined
  product(id: string): ProductFacts | undefined
  recipe(id: string): RecipeInput | undefined
  /** Bottles of an ingredient, used for the median price of owned bottles (section 8, « Coût »). */
  productsOfIngredient(ingredientId: string): readonly ProductFacts[]
}

/** Worst of two completeness levels. */
export function worst(a: Completeness, b: Completeness): Completeness {
  if (a === 'incomplete' || b === 'incomplete') return 'incomplete'
  if (a === 'estimated' || b === 'estimated') return 'estimated'
  return 'complete'
}
