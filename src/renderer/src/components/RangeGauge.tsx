import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'

const t = fr.components.display

export type GaugeZone = {
  from: number
  to: number
  /** Number of recipes the zone is computed from, shown in the legend. */
  count?: number
}

export type GaugeSaved = {
  value: number
  /** Saved version, e.g. « v3 ». */
  version: string
}

type RangeGaugeProps = {
  /** Name of the indicator, e.g. « Degré »; starts the accessible description. */
  label: string
  /** Current value (round cursor); null shows only the track. */
  value: number | null
  /** Bounds of the track; derived from the values when left out. */
  min?: number
  max?: number
  /** Reference zone of the family, drawn as a band. */
  zone?: GaugeZone
  /** Saved version, drawn as a hollow marker. */
  saved?: GaugeSaved
  unit?: string
  decimals?: number
  /** Number of fine graduations along the track. */
  ticks?: number
  /** Row under the track: min, zone and max. */
  showScale?: boolean
  /** Annotated legend: zone, current value, saved version. */
  showLegend?: boolean
  className?: string
}

function finite(values: readonly (number | undefined | null)[]): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

/** Track bounds: the given ones, or the known values with half their spread on each side. */
function domain(
  min: number | undefined,
  max: number | undefined,
  known: readonly number[],
): { low: number; high: number } {
  if (known.length === 0) return { low: min ?? 0, high: max ?? 1 }
  const smallest = Math.min(...known)
  const largest = Math.max(...known)
  const spread = largest - smallest || Math.abs(largest) || 1
  let low = min ?? smallest - spread / 2
  const high = max ?? largest + spread / 2
  if (min === undefined && smallest >= 0) low = Math.max(0, low)
  return high > low ? { low, high } : { low, high: low + 1 }
}

const ZONE_BAND = 'rounded-full border border-accent/35 bg-accent/18'
const SAVED_MARK = 'rounded-full border-2 border-fg-secondary bg-surface-2'
const VALUE_MARK = 'rounded-full border-2 border-surface-1 bg-accent shadow-[0_0_0_3px_rgb(239_120_43/0.25)]'

/**
 * Workshop gauge (section 11): horizontal track with fine graduations, reference zone as a
 * band, current value as a filled round cursor, saved version as a hollow marker.
 */
export function RangeGauge({
  label,
  value,
  min,
  max,
  zone,
  saved,
  unit,
  decimals = 1,
  ticks = 25,
  showScale = false,
  showLegend = false,
  className,
}: RangeGaugeProps) {
  const current = value !== null && Number.isFinite(value) ? value : null
  const { low, high } = domain(min, max, finite([current, zone?.from, zone?.to, saved?.value]))
  const percent = (v: number) => Math.min(Math.max(((v - low) / (high - low)) * 100, 0), 100)
  const number = (v: number) => formatNumber(v, decimals)
  const withUnit = (v: number) => t.withUnit(number(v), unit)
  const zoneRange = zone ? t.gauge.range(number(zone.from), number(zone.to), unit) : null
  const zoneStart = zone ? percent(Math.min(zone.from, zone.to)) : 0
  const zoneEnd = zone ? percent(Math.max(zone.from, zone.to)) : 0

  const description = t.gauge.describe(
    label,
    current === null ? null : withUnit(current),
    zone ? { from: number(zone.from), to: withUnit(zone.to) } : null,
    saved ? { version: saved.version, value: withUnit(saved.value) } : null,
  )

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {/* The cursor layer slides to the left of its end position, which never widens the page. */}
      <div
        role="img"
        aria-label={description}
        className="relative h-7 overflow-clip [overflow-clip-margin:12px]"
      >
        <div className="absolute inset-x-0 top-2.5 flex h-2 items-center justify-between">
          {Array.from({ length: Math.max(ticks, 2) }, (_, index) => (
            <span key={index} className="h-2 w-px shrink-0 bg-border-strong" />
          ))}
        </div>
        {zone ? (
          <div
            data-part="zone"
            className={cn('absolute top-2.5 h-2', ZONE_BAND)}
            style={{ left: `${zoneStart}%`, width: `${zoneEnd - zoneStart}%` }}
          />
        ) : null}
        {saved && Number.isFinite(saved.value) ? (
          <div
            data-part="saved"
            className={cn('absolute top-[9px] size-2.5', SAVED_MARK)}
            style={{ left: `calc(${percent(saved.value)}% - 5px)` }}
          />
        ) : null}
        {current === null ? null : (
          // Moved with transform only, so a dose change slides the cursor without layout work. The
          // layer carries the cursor inside its right edge, shifted by half a cursor to centre it on
          // the value: what it leaves outside is on the left, which is never scrollable overflow.
          <div
            data-part="value"
            className="pointer-events-none absolute top-[7px] -right-[7px] left-[7px] h-3.5 transition-transform duration-200 ease-out-soft"
            style={{ transform: `translateX(${percent(current) - 100}%)` }}
          >
            <span className={cn('absolute top-0 right-0 size-3.5', VALUE_MARK)} />
          </div>
        )}
      </div>
      {showScale ? (
        <div aria-hidden="true" className="nums flex justify-between gap-2 text-[11px] text-fg-muted">
          <span>{withUnit(low)}</span>
          {zoneRange ? <span>{t.gauge.scaleZone(zoneRange)}</span> : null}
          <span>{withUnit(high)}</span>
        </div>
      ) : null}
      {showLegend ? (
        <ul aria-label={t.gauge.legend} className="m-0 flex list-none flex-col gap-2 p-0 pt-1">
          {zoneRange ? (
            <li className="nums flex items-center gap-2.5 text-caption text-fg-secondary">
              <span aria-hidden="true" className={cn('h-2 w-6 flex-none', ZONE_BAND)} />
              {t.gauge.legendZone(zoneRange, zone?.count)}
            </li>
          ) : null}
          {current === null ? null : (
            <li className="nums flex items-center gap-2.5 text-caption text-fg-secondary">
              <span aria-hidden="true" className="flex w-6 flex-none justify-center">
                <span className={cn('size-3.5', VALUE_MARK)} />
              </span>
              {t.gauge.legendValue(withUnit(current))}
            </li>
          )}
          {saved ? (
            <li className="nums flex items-center gap-2.5 text-caption text-fg-secondary">
              <span aria-hidden="true" className="flex w-6 flex-none justify-center">
                <span className={cn('size-2.5', SAVED_MARK)} />
              </span>
              {t.gauge.legendSaved(saved.version, withUnit(saved.value))}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
