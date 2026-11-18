/**
 * Reference zones (section 8, « Zones de référence »). No norm is written in the code: for each
 * family, the zone of an indicator is the interval between the 25th and the 75th percentile of
 * the final recipes and the classics whose value is complete. A zone exists only from five
 * recipes, and lists the recipes it is made of.
 */

export const ZONE_MINIMUM = 5

export type ZoneMetric = 'abv' | 'sugar' | 'acid' | 'ratio'

export type ZoneSource = {
  readonly id: string
  readonly family: string | null
  readonly status: string
  readonly origin: string
  /** Value of each indicator, null when incomplete. */
  readonly values: Readonly<Record<ZoneMetric, number | null>>
}

export type Zone = {
  readonly from: number
  readonly to: number
  readonly recipeIds: readonly string[]
}

export type FamilyZones = Partial<Record<ZoneMetric, Zone>>

/** Percentile by linear interpolation between the closest ranks (values sorted ascending). */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error('No value')
  const rank = (sorted.length - 1) * p
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  const a = sorted[low] ?? 0
  const b = sorted[high] ?? a
  return a + (b - a) * (rank - low)
}

const METRICS: readonly ZoneMetric[] = ['abv', 'sugar', 'acid', 'ratio']

export function referenceZones(sources: readonly ZoneSource[]): Record<string, FamilyZones> {
  const eligible = sources.filter(
    (source) => source.family !== null && (source.status === 'final' || source.origin === 'classic'),
  )
  const out: Record<string, FamilyZones> = {}
  for (const family of new Set(eligible.map((source) => source.family ?? ''))) {
    const members = eligible.filter((source) => source.family === family)
    const zones: FamilyZones = {}
    for (const metric of METRICS) {
      const withValue = members.filter((source) => source.values[metric] !== null)
      if (withValue.length < ZONE_MINIMUM) continue
      const sorted = withValue.map((source) => source.values[metric] ?? 0).sort((a, b) => a - b)
      zones[metric] = {
        from: percentile(sorted, 0.25),
        to: percentile(sorted, 0.75),
        recipeIds: withValue.map((source) => source.id),
      }
    }
    if (Object.keys(zones).length > 0) out[family] = zones
  }
  return out
}
