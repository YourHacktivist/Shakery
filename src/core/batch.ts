/**
 * Batch calculator (section 10.13): one recipe multiplied for a number of drinks.
 *
 * Each line keeps its unit and is multiplied; a volume is also given in millilitres. The
 * category of an ingredient says when it goes in (`batch_hint`): in the bottle ahead of time,
 * fresh on the day, or at service (sparkling, egg white). The dilution water of a stirred or
 * built drink can be added to the bottle, so the batch is served straight from the fridge.
 */
import type { Unit } from './model'
import { DEFAULT_EQUIVALENCES, lineVolumeMl, type UnitEquivalences } from './units'

export type BatchHint = 'ok' | 'add_at_service' | 'fresh'

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
  /** Millilitres for the batch, rounded to the millilitre; null for a count, a garnish, « à goût ». */
  readonly ml: number | null
  readonly isGarnish: boolean
  readonly isOptional: boolean
}

export type BatchResult = {
  readonly servings: number
  readonly lines: readonly BatchLine[]
  /** Water to add to the bottle for the dilution, 0 when the drink is diluted at service. */
  readonly waterMl: number
  /** Volume of the bottle: lines added ahead of time and fresh ones, plus the water. */
  readonly bottleMl: number
  /** Volume added at service, for all the drinks. */
  readonly serviceMl: number
}

export type BatchOptions = {
  readonly servings: number
  /** Dilution rate of the recipe (0.2 = 20 %), from `dilutionFor`. */
  readonly dilution: number
  /** Add the dilution water to the bottle (stirred or built drinks served without ice work). */
  readonly includeWater: boolean
  readonly equivalences?: UnitEquivalences
}

/** Rounds a count or a weight to a readable value: whole units, or tenths under 10. */
function readable(value: number): number {
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}

export function scaleBatch(lines: readonly BatchLineInput[], options: BatchOptions): BatchResult {
  if (!Number.isInteger(options.servings) || options.servings < 1) {
    throw new RangeError('A batch is made for one drink or more')
  }
  const eq = options.equivalences ?? DEFAULT_EQUIVALENCES
  const n = options.servings
  let bottle = 0
  let service = 0
  let counted = 0
  const scaled = lines.map((line): BatchLine => {
    const volume = lineVolumeMl(line, eq, line.densityGPerMl ?? null)
    const ml = volume.ok && !line.isGarnish ? Math.round(volume.ml * n) : null
    if (volume.ok && !line.isGarnish && !line.isOptional) {
      counted += volume.ml * n
      if (line.hint === 'add_at_service') service += volume.ml * n
      else bottle += volume.ml * n
    }
    // A « top » becomes its estimate in millilitres; without one it stays unmeasured.
    const quantity = line.unit === 'top' ? line.topEstimateMl : line.quantity
    return {
      id: line.id,
      label: line.label,
      hint: line.hint,
      quantity: quantity === null ? null : readable(quantity * n),
      unit: line.unit === 'top' ? 'ml' : line.unit,
      ml,
      isGarnish: line.isGarnish,
      isOptional: line.isOptional,
    }
  })
  const waterMl = options.includeWater ? Math.round(counted * options.dilution) : 0
  return {
    servings: n,
    lines: scaled,
    waterMl,
    bottleMl: Math.round(bottle) + waterMl,
    serviceMl: Math.round(service),
  }
}
