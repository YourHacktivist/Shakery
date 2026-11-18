/**
 * Units (section 8, « Unités »). Quantities are stored as entered; conversion to millilitres
 * happens here. dash, drop, barspoon and tsp use adjustable equivalences shown as
 * approximations; piece, leaf, slice, wedge and to_taste are not volumes and stay out of
 * the calculations; g counts as g / density when the ingredient has a density (D-031); `top` counts for its estimate, or makes the result incomplete.
 *
 * Default values and their sources: docs/DATA_SOURCES.md (to be validated by the user).
 */
import type { LineInput, Unit } from './model'

export type UnitEquivalences = {
  /** 30 (bar rounding) or 29.5735 (exact US fluid ounce). */
  readonly ozMl: number
  readonly dashMl: number
  readonly dropMl: number
  readonly barspoonMl: number
  readonly tspMl: number
}

export const DEFAULT_EQUIVALENCES: UnitEquivalences = {
  ozMl: 30,
  dashMl: 0.25,
  dropMl: 0.05,
  barspoonMl: 5,
  tspMl: 5,
}

export const EXACT_OZ_ML = 29.5735295625

/** Units whose millilitre value is an approximation, to be shown as such. */
export const APPROXIMATE_UNITS: ReadonlySet<Unit> = new Set(['dash', 'drop', 'barspoon', 'tsp'])

export const NON_VOLUMETRIC_UNITS: ReadonlySet<Unit> = new Set([
  'g',
  'piece',
  'leaf',
  'slice',
  'wedge',
  'to_taste',
])

export type VolumeResult =
  | { readonly ok: true; readonly ml: number; readonly approximate: boolean }
  | { readonly ok: false; readonly reason: 'missing_quantity' | 'not_volumetric' | 'top_without_estimate' }

/**
 * Millilitres of one line, or why there are none. A line in grams counts as a volume only
 * when the ingredient's density (g/ml) is given: crystal sugar dissolved at 1.59 g/ml.
 */
export function lineVolumeMl(
  line: Pick<LineInput, 'quantity' | 'unit' | 'topEstimateMl'>,
  eq: UnitEquivalences = DEFAULT_EQUIVALENCES,
  densityGPerMl: number | null = null,
): VolumeResult {
  if (line.unit === 'g' && densityGPerMl !== null && densityGPerMl > 0) {
    if (line.quantity === null) return { ok: false, reason: 'missing_quantity' }
    return { ok: true, ml: line.quantity / densityGPerMl, approximate: false }
  }
  if (line.unit === 'top') {
    return line.topEstimateMl === null
      ? { ok: false, reason: 'top_without_estimate' }
      : { ok: true, ml: line.topEstimateMl, approximate: true }
  }
  if (NON_VOLUMETRIC_UNITS.has(line.unit)) return { ok: false, reason: 'not_volumetric' }
  if (line.quantity === null) return { ok: false, reason: 'missing_quantity' }
  const factor = mlPerUnit(line.unit, eq)
  return { ok: true, ml: line.quantity * factor, approximate: APPROXIMATE_UNITS.has(line.unit) }
}

function mlPerUnit(unit: Unit, eq: UnitEquivalences): number {
  switch (unit) {
    case 'ml':
      return 1
    case 'cl':
      return 10
    case 'oz':
      return eq.ozMl
    case 'dash':
      return eq.dashMl
    case 'drop':
      return eq.dropMl
    case 'barspoon':
      return eq.barspoonMl
    case 'tsp':
      return eq.tspMl
    default:
      return Number.NaN
  }
}

export type DisplayUnit = 'ml' | 'cl' | 'oz'

/** Readable rounding steps: 0,5 ml, 0,5 cl, 1/4 oz (section 8). */
const DISPLAY_STEP: Record<DisplayUnit, number> = { ml: 0.5, cl: 0.5, oz: 0.25 }

/** Converts millilitres to the display unit, rounded to a readable step. */
export function fromMl(ml: number, unit: DisplayUnit, eq: UnitEquivalences = DEFAULT_EQUIVALENCES): number {
  const raw = unit === 'ml' ? ml : unit === 'cl' ? ml / 10 : ml / eq.ozMl
  const step = DISPLAY_STEP[unit]
  return Math.round(raw / step) * step
}

/** « 1 ¾ » for 1.75 oz: quarters written as vulgar fractions. */
export function ozFraction(oz: number): string {
  const quarters = Math.round(oz * 4)
  const whole = Math.floor(quarters / 4)
  const rest = quarters % 4
  const fraction = ['', '¼', '½', '¾'][rest] ?? ''
  if (whole === 0) return fraction === '' ? '0' : fraction
  return fraction === '' ? String(whole) : `${String(whole)} ${fraction}`
}
