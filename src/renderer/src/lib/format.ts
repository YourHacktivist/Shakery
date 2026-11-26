import { daysLeft } from '@core/shelf-life'
/**
 * French number formatting for the interface: decimal comma and narrow no-break space as
 * thousands separator. Tabular figures come from the `nums` utility on the element.
 */
const cache = new Map<string, Intl.NumberFormat>()

function formatter(minimumFractionDigits: number, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits, maximumFractionDigits })
    cache.set(key, f)
  }
  return f
}

/** 24.6 becomes « 24,6 »; `decimals` fixes the number of digits after the comma. */
export function formatNumber(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '?'
  return decimals === undefined ? formatter(0, 2).format(value) : formatter(decimals, decimals).format(value)
}

/** A served volume as a bar writes it: to the nearest 5 ml (126 becomes 125), to the millilitre under 20 ml. */
export function roundServedVolume(ml: number): number {
  return ml < 20 ? Math.round(ml) : Math.round(ml / 5) * 5
}

const MINUS = '\u2212'

/** Signed difference: « +0,6 », « \u22121,2 » (true minus sign), « = » when it rounds to zero. */
export function formatDelta(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals))
  if (rounded === 0) return '='
  const text = formatNumber(Math.abs(rounded), decimals)
  return rounded > 0 ? `+${text}` : `${MINUS}${text}`
}

/** Integer cents to « 9,50 € ». */
export function formatEuros(cents: number): string {
  return `${formatNumber(cents / 100, 2)}\u00a0€`
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** « 12 nov. 2026 ». */
export function formatDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

/** « il y a 5 minutes », « hier », then the date after a week. */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - timestamp)
  if (elapsed < MINUTE) return relativeFormatter.format(0, 'second')
  if (elapsed < HOUR) return relativeFormatter.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return relativeFormatter.format(-Math.floor(elapsed / HOUR), 'hour')
  if (elapsed < 7 * DAY) return relativeFormatter.format(-Math.floor(elapsed / DAY), 'day')
  return formatDate(timestamp)
}

/** Signed calendar days before a best-before date, counted from now (core/shelf-life). */
export function daysLeftFromNow(bestBefore: number | null): number | null {
  return daysLeft(bestBefore, Date.now())
}
