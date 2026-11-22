/**
 * Batch calculator (sections 8 and 10.13, D-042): one recipe multiplied for a number of drinks,
 * or for a volume to bottle.
 *
 * The category of an ingredient says when it goes in (`batch_hint`). Only `ok` goes into the
 * bottle prepared ahead. What is `fresh` (juices, egg, cream, herbs) and what is added at service
 * (bubbles) is out of it and listed apart: none of it keeps. The dilution water of a pre-mixed
 * drink is V0 × d × N, on the whole drink, and goes into the bottle.
 */
import type { Unit } from './model'
import { DEFAULT_EQUIVALENCES, lineVolumeMl, type UnitEquivalences } from './units'

export type BatchHint = 'ok' | 'add_at_service' | 'fresh'

/** Rounding steps offered, in millilitres. */
export const BATCH_STEPS_ML = [1, 5, 10, 25, 50] as const

export type BatchLineInput = {
  readonly id: string
  readonly label: string
  readonly quantity: number | null
  readonly unit: Unit
  readonly topEstimateMl: number | null
  readonly densityGPerMl?: number | null
  readonly hint: BatchHint
  readonly isGarnish: boolean
  readonly isOptional: boolean
}

export type BatchLine = {
  readonly id: string
  readonly label: string
  readonly hint: BatchHint
  /** Quantity for the batch in the unit of the recipe, or null when the recipe gives none. */
  readonly quantity: number | null
  readonly unit: Unit
  /** Millilitres for the batch, rounded to the step; null for a count, a garnish, « à goût ». */
  readonly ml: number | null
  readonly isGarnish: boolean
  readonly isOptional: boolean
}

export type BatchResult = {
  readonly servings: number
  readonly lines: readonly BatchLine[]
  /** Water to add to the bottle for the dilution, 0 when the drink is diluted at service. */
  readonly waterMl: number
  /** Volume of the bottle prepared ahead: the lines that keep, plus the water. */
  readonly bottleMl: number
  /** Fresh volume, to add on the day and never to keep in the bottle. */
  readonly freshMl: number
  /** Volume added at service, for all the drinks. */
  readonly serviceMl: number
}

export type BatchOptions = {
  /** Drinks; not a whole number when the batch aims at a volume (`servingsForVolume`). */
  readonly servings: number
  /** Dilution rate of the recipe (0.2 = 20 %), from `dilutionFor`. */
  readonly dilution: number
  /** Add the dilution water to the bottle (stirred or built drinks served without ice work). */
  readonly includeWater: boolean
  /** Rounding step of the volumes, 1 ml by default. */
  readonly stepMl?: number
  /** Garnishes are left out unless asked (section 8). */
  readonly includeGarnish?: boolean
  readonly equivalences?: UnitEquivalences
}

const COUNTED_BY_THE_PIECE: ReadonlySet<Unit> = new Set(['piece', 'leaf', 'slice', 'wedge'])

/** Rounds a weight or a small measure to a readable value: whole units, or tenths under 10. */
function readable(value: number): number {
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}

export function scaleBatch(lines: readonly BatchLineInput[], options: BatchOptions): BatchResult {
  const n = options.servings
  if (!Number.isFinite(n) || n <= 0) throw new RangeError('A batch is made for a positive number of drinks')
  const eq = options.equivalences ?? DEFAULT_EQUIVALENCES
  const step = options.stepMl ?? 1
  if (!(step > 0)) throw new RangeError('The rounding step is positive')
  const toStep = (ml: number) => Math.round(ml / step) * step
  const totals: Record<BatchHint, number> = { ok: 0, fresh: 0, add_at_service: 0 }
  let drink = 0
  const scaled: BatchLine[] = []

  for (const line of lines) {
    const volume = lineVolumeMl(line, eq, line.densityGPerMl ?? null)
    const exact = volume.ok && !line.isGarnish ? volume.ml * n : null
    // A few dashes would round to nothing: kept to the millilitre when under the step.
    const ml = exact === null ? null : exact < step ? Math.round(exact) : toStep(exact)
    if (exact !== null && ml !== null && !line.isOptional) {
      drink += exact
      totals[line.hint] += ml
    }
    if (line.isGarnish && options.includeGarnish !== true) continue

    // A « top » becomes its estimate in millilitres; without one it stays unmeasured.
    const unit: Unit = line.unit === 'top' ? 'ml' : line.unit
    const each = line.unit === 'top' ? line.topEstimateMl : line.quantity
    let quantity: number | null = null
    if (each !== null) {
      // Nobody cuts a third of a slice: pieces go up to the next whole one.
      if (COUNTED_BY_THE_PIECE.has(unit)) quantity = Math.ceil(each * n - 1e-6)
      else if (ml !== null && unit === 'ml') quantity = ml
      else if (ml !== null && unit === 'cl') quantity = ml / 10
      else quantity = readable(each * n)
    }
    scaled.push({
      id: line.id,
      label: line.label,
      hint: line.hint,
      quantity,
      unit,
      ml,
      isGarnish: line.isGarnish,
      isOptional: line.isOptional,
    })
  }

  const waterMl = options.includeWater ? toStep(drink * options.dilution) : 0
  return {
    servings: n,
    lines: scaled,
    waterMl,
    bottleMl: totals.ok + waterMl,
    freshMl: totals.fresh,
    serviceMl: totals.add_at_service,
  }
}

/**
 * Drinks that fill a bottle of `targetMl` with what is prepared ahead, water included; null
 * when nothing of the drink keeps in a bottle.
 */
export function servingsForVolume(
  lines: readonly BatchLineInput[],
  targetMl: number,
  options: Omit<BatchOptions, 'servings'>,
): number | null {
  if (!(targetMl > 0)) return null
  const eq = options.equivalences ?? DEFAULT_EQUIVALENCES
  let drink = 0
  let kept = 0
  for (const line of lines) {
    if (line.isGarnish || line.isOptional) continue
    const volume = lineVolumeMl(line, eq, line.densityGPerMl ?? null)
    if (!volume.ok) continue
    drink += volume.ml
    if (line.hint === 'ok') kept += volume.ml
  }
  if (kept <= 0) return null
  return targetMl / (kept + (options.includeWater ? drink * options.dilution : 0))
}
