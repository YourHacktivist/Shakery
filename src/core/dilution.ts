/**
 * Dilution by the ice (section 8, « Dilution »): water added, as a fraction of the initial
 * volume, per method. Defaults are adjustable in the settings and overridable per recipe;
 * sources in docs/DATA_SOURCES.md, to be validated by the user. The final ABV is always
 * presented as an estimate.
 */
import type { Method } from './model'

export type DilutionRates = Readonly<Record<Method, number>>

export const DEFAULT_DILUTION: DilutionRates = {
  shake: 0.25,
  dry_shake: 0.25,
  stir: 0.2,
  build: 0.1,
  throw: 0.2,
  swizzle: 0.25,
  blend: 0.25,
  other: 0.15,
}

/**
 * Fraction of water added for a recipe: the recipe's override (in %) first, then the rate
 * of its method. A preparation is not diluted; a cocktail without method uses `other`.
 */
export function dilutionFor(
  recipe: {
    readonly kind: 'cocktail' | 'prep'
    readonly method: Method | null
    readonly dilutionOverridePct: number | null
  },
  rates: DilutionRates = DEFAULT_DILUTION,
): number {
  if (recipe.kind === 'prep') return 0
  if (recipe.dilutionOverridePct !== null) return Math.max(0, recipe.dilutionOverridePct) / 100
  return rates[recipe.method ?? 'other']
}
