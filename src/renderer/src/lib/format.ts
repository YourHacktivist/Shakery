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
