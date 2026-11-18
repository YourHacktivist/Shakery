/**
 * ABV (section 8). Two methods are shown side by side:
 * - the served ABV of the spec, with dilution (`servedAbv`, from computeComposition);
 * - the MAF « socle » method (D-016): only the lines counted in the notebook (ml, cl, oz),
 *   without dilution, dashes, powders and herbs left out; a theoretical ABV, higher than
 *   the served one, which the jury expects.
 */
import { computeComposition, type CompositionContext, type Metric } from './composition'
import type { RecipeInput, Unit } from './model'
import { DEFAULT_EQUIVALENCES, type UnitEquivalences } from './units'

export function servedAbv(recipe: RecipeInput, context: CompositionContext): Metric {
  return computeComposition(recipe, context).abv
}

export type SocleLine = {
  readonly id: string
  readonly quantity: number | null
  readonly unit: Unit
  readonly abvPct: number | null
  readonly countedInAbv: boolean
}

export type SocleAbv =
  | {
      readonly ok: true
      readonly volumeMl: number
      /** Σ volume × ABV, the intermediate total printed in the notebooks. */
      readonly volumeTimesAbv: number
      /** Rounded to one decimal, as in the notebooks. */
      readonly abvPct: number
    }
  | { readonly ok: false; readonly missing: readonly string[] }

const SOCLE_UNITS: ReadonlySet<Unit> = new Set(['ml', 'cl', 'oz'])

export function socleAbv(lines: readonly SocleLine[], eq: UnitEquivalences = DEFAULT_EQUIVALENCES): SocleAbv {
  let volume = 0
  let product = 0
  const missing: string[] = []
  for (const line of lines) {
    if (!line.countedInAbv || !SOCLE_UNITS.has(line.unit)) continue
    if (line.quantity === null || line.abvPct === null) {
      missing.push(line.id)
      continue
    }
    const ml =
      line.unit === 'ml' ? line.quantity : line.unit === 'cl' ? line.quantity * 10 : line.quantity * eq.ozMl
    volume += ml
    product += ml * line.abvPct
  }
  if (missing.length > 0 || volume <= 0) return { ok: false, missing }
  return {
    ok: true,
    volumeMl: volume,
    volumeTimesAbv: Math.round(product * 100) / 100,
    abvPct: Math.round((product / volume) * 10) / 10,
  }
}
