import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDelta, formatNumber } from '@renderer/lib/format'

const t = fr.components.display

export type DeltaTone = 'semantic' | 'neutral'

export type StatDeltaValue = {
  /** Signed difference with the reference (current minus reference). */
  value: number
  /** What the value is compared with, e.g. « v3 ». */
  reference?: string
  decimals?: number
  /** Unit of the difference, e.g. « pt ». */
  unit?: string
}

type StatDeltaProps = StatDeltaValue & {
  /** semantic: green up, red down (ratings). neutral: no judgement (degree, sugar). */
  tone?: DeltaTone
  className?: string
}

/** Variation with arrow, signed number and a word for screen readers: never colour alone. */
export function StatDelta({
  value,
  reference,
  decimals = 1,
  unit,
  tone = 'semantic',
  className,
}: StatDeltaProps) {
  const signed = formatDelta(value, decimals)
  const direction = signed === '=' ? 'same' : value > 0 ? 'up' : 'down'
  const color =
    tone === 'neutral' || direction === 'same'
      ? 'text-fg-secondary'
      : direction === 'up'
        ? 'text-status-ok'
        : 'text-status-danger'
  return (
    <span
      data-direction={direction}
      className={cn(
        'nums inline-flex items-center gap-1 text-caption font-semibold whitespace-nowrap',
        color,
        className,
      )}
    >
      {direction === 'up' ? <ArrowUp size={12} strokeWidth={2.2} aria-hidden="true" /> : null}
      {direction === 'down' ? <ArrowDown size={12} strokeWidth={2.2} aria-hidden="true" /> : null}
      <span className="sr-only">{`${t.stat.trend[direction]} `}</span>
      {t.stat.delta(signed, unit, reference)}
    </span>
  )
}

type StatTileProps = {
  /** Small muted label at the top. */
  label: string
  /** Null shows the empty state: a long dash and the unit. */
  value: number | null
  decimals?: number
  unit?: string
  delta?: StatDeltaValue
  deltaTone?: DeltaTone
  /** below: under the number (creation cards). top: top right, next to the label (indicator tiles). */
  deltaPlacement?: 'below' | 'top'
  /** Slot for a RangeGauge. */
  gauge?: ReactNode
  /** nested: surface-2 tile with 16 px padding. plain: no background, inside another card. */
  surface?: 'nested' | 'plain'
  /** Footnote under the gauge, e.g. the reference zone. */
  children?: ReactNode
  className?: string
}

/** Key figure: discreet label, large thin number with its unit, variation, optional gauge. */
export function StatTile({
  label,
  value,
  decimals = 1,
  unit,
  delta,
  deltaTone = 'semantic',
  deltaPlacement = 'below',
  gauge,
  surface = 'nested',
  children,
  className,
}: StatTileProps) {
  const isEmpty = value === null || !Number.isFinite(value)
  const deltaNode =
    delta && !isEmpty ? (
      <StatDelta
        value={delta.value}
        reference={delta.reference}
        decimals={delta.decimals}
        unit={delta.unit}
        tone={deltaTone}
      />
    ) : null

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2',
        surface === 'nested' && 'rounded-nested bg-surface-2 p-3',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{label}</span>
        {deltaPlacement === 'top' ? deltaNode : null}
      </div>
      {isEmpty ? (
        <div className="flex h-7 items-center gap-2">
          <span aria-hidden="true" className="block h-0.5 w-7 rounded-full bg-fg-muted" />
          <span className="sr-only">{t.stat.empty}</span>
          {unit ? <span className="text-small text-fg-muted">{unit}</span> : null}
        </div>
      ) : (
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="nums text-metric leading-none font-light tracking-[-0.02em] text-fg">
            {formatNumber(value, decimals)}
          </span>
          {unit ? <span className="text-small whitespace-nowrap text-fg-muted">{unit}</span> : null}
        </div>
      )}
      {deltaPlacement === 'below' && deltaNode ? <div>{deltaNode}</div> : null}
      {gauge}
      {children}
    </div>
  )
}
