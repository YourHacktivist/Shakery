import { Clock } from 'lucide-react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

export type ExpiryState = 'ok' | 'expiring' | 'expired' | 'none'

const t = fr.components.display.expiry

/** Days left before a preparation expires at or under which it is flagged (setting of section 10.14). */
export const DEFAULT_EXPIRY_WARNING_DAYS = 2

/**
 * State of a preparation from the signed number of days before its best-before date:
 * positive = days left, 0 = expires today, negative = expired for that many days, null = no date.
 */
export function expiryState(days: number | null, warningDays = DEFAULT_EXPIRY_WARNING_DAYS): ExpiryState {
  if (days === null || !Number.isFinite(days)) return 'none'
  const rounded = Math.round(days)
  if (rounded < 0) return 'expired'
  if (rounded <= warningDays) return 'expiring'
  return 'ok'
}

/** Text of the pill: « Encore 4 jours », « Expire demain », « Expiré depuis 1 jour », « Sans date limite ». */
export function expiryText(days: number | null, warningDays = DEFAULT_EXPIRY_WARNING_DAYS): string {
  const state = expiryState(days, warningDays)
  if (state === 'none' || days === null) return t.none
  const rounded = Math.round(days)
  if (state === 'expired') return t.expiredSince(-rounded)
  if (state === 'ok') return t.remaining(rounded)
  if (rounded === 0) return t.today
  if (rounded === 1) return t.tomorrow
  return t.inDays(rounded)
}

const STYLES: Record<ExpiryState, string> = {
  ok: 'bg-status-ok/12 text-status-ok',
  expiring: 'bg-status-warning/12 text-status-warning',
  expired: 'bg-status-danger/12 text-status-danger',
  none: 'border border-border-strong bg-transparent text-fg-muted',
}

type ExpiryPillProps = {
  /** Signed days before the best-before date (computed by core/shelf-life), or null without a date. */
  days: number | null
  /** Days left at or under which the pill turns to « expiring ». */
  warningDays?: number
  className?: string
}

/** Shelf-life pill of a home-made preparation: clock icon, word and colour. */
export function ExpiryPill({ days, warningDays = DEFAULT_EXPIRY_WARNING_DAYS, className }: ExpiryPillProps) {
  const state = expiryState(days, warningDays)
  return (
    <span
      data-state={state}
      className={cn(
        'nums inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold whitespace-nowrap',
        STYLES[state],
        className,
      )}
    >
      <Clock size={12} strokeWidth={2.2} aria-hidden="true" />
      {expiryText(days, warningDays)}
    </span>
  )
}
