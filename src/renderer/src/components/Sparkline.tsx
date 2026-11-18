import { useCallback, useId, useState } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'

const t = fr.components.display.sparkline

export type SparklineTone = 'accent' | 'danger'

type SparklineProps = {
  values: readonly number[]
  /** What the curve shows, e.g. « Notes par version »; starts the accessible description. */
  label: string
  /** danger: the « variant going down » curve, in red. */
  tone?: SparklineTone
  /** Fixed domain (e.g. 1 and 5 for ratings); the data range otherwise. */
  min?: number
  max?: number
  height?: number
  /** Optional dashed line at a reference value (e.g. a target rating). */
  reference?: number
  /** Surface the curve sits on: the inside of the points takes its colour. */
  surface?: 1 | 2
  formatValue?: (value: number) => string
  className?: string
}

const PAD_LEFT = 8
const PAD_Y = 8
/** Approximate width of one character of the 11 px end label. */
const LABEL_CHAR = 6.5
const LABEL_GAP = 8
const FALLBACK_WIDTH = 240

const TONES: Record<
  SparklineTone,
  { stroke: string; stop: string; flood: string; text: string; opacity: number }
> = {
  accent: {
    stroke: 'stroke-accent',
    stop: '[stop-color:var(--color-accent)]',
    flood: '[flood-color:var(--color-accent)]',
    text: 'fill-fg-secondary',
    opacity: 0.18,
  },
  danger: {
    stroke: 'stroke-status-danger',
    stop: '[stop-color:var(--color-status-danger)]',
    flood: '[flood-color:var(--color-status-danger)]',
    text: 'fill-status-danger',
    opacity: 0.16,
  },
}

type MeasureRef = (element: HTMLDivElement | null) => (() => void) | undefined

/** Width of the element, followed with a ResizeObserver (no timer, nothing runs at rest). */
function useMeasuredWidth(fallback: number): [number, MeasureRef] {
  const [width, setWidth] = useState(fallback)
  const ref = useCallback<MeasureRef>((element) => {
    if (!element) return undefined
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width
      if (measured !== undefined && measured > 0) setWidth(Math.round(measured))
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])
  return [width, ref]
}

const defaultFormat = (value: number) => formatNumber(value, 1)

/**
 * Thin evolution curve (section 11): 1.5 px stroke, gradient fill from 18 % to transparent,
 * soft halo, a point on each value and the last value labelled. No axis, no grid.
 */
export function Sparkline({
  values,
  label,
  tone = 'accent',
  min,
  max,
  height = 72,
  reference,
  surface = 1,
  formatValue = defaultFormat,
  className,
}: SparklineProps) {
  // SVG ids must be unique per instance and safe inside url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fillId = `spark-fill-${uid}`
  const haloId = `spark-halo-${uid}`
  const [width, measureRef] = useMeasuredWidth(FALLBACK_WIDTH)
  const data = values.filter((value) => Number.isFinite(value))
  const lastValue = data[data.length - 1]

  if (lastValue === undefined) {
    return (
      <div
        role="img"
        aria-label={t.emptySeries(label)}
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
      >
        <span aria-hidden="true" className="text-caption text-fg-muted">
          {t.empty}
        </span>
      </div>
    )
  }

  const tones = TONES[tone]
  const lastText = formatValue(lastValue)
  // The last value is written to the right of its point, in a gutter kept free of the curve.
  const gutter = Math.ceil(lastText.length * LABEL_CHAR) + LABEL_GAP + 4
  let low = min ?? Math.min(...data)
  let high = max ?? Math.max(...data)
  if (high - low === 0) {
    low -= 1
    high += 1
  }
  const innerWidth = Math.max(width - PAD_LEFT - gutter, 1)
  const innerHeight = height - PAD_Y * 2
  const xAt = (index: number) =>
    data.length === 1 ? PAD_LEFT + innerWidth / 2 : PAD_LEFT + (index * innerWidth) / (data.length - 1)
  const yAt = (value: number) => {
    const ratio = Math.min(Math.max((value - low) / (high - low), 0), 1)
    return PAD_Y + (1 - ratio) * innerHeight
  }
  const points = data.map((value, index) => ({ x: xAt(index), y: yAt(value) }))
  const coords = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
  const firstX = points[0]?.x ?? PAD_LEFT
  const lastPoint = points[points.length - 1] ?? { x: PAD_LEFT, y: PAD_Y }
  const top = Math.min(...points.map((point) => point.y))
  const area =
    points.length > 1
      ? `M${coords.join(' L')} L${lastPoint.x.toFixed(1)},${height} L${firstX.toFixed(1)},${height} Z`
      : null

  return (
    <div ref={measureRef} className={cn('w-full min-w-0', className)}>
      <svg
        role="img"
        aria-label={t.series(label, data.map(formatValue))}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={height}>
            <stop offset="0" className={tones.stop} stopOpacity={tones.opacity} />
            <stop offset="1" className={tones.stop} stopOpacity={0} />
          </linearGradient>
          <filter id={haloId} filterUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity={0.45} className={tones.flood} />
          </filter>
        </defs>
        {reference !== undefined && Number.isFinite(reference) ? (
          <line
            x1={0}
            x2={width}
            y1={yAt(reference)}
            y2={yAt(reference)}
            className="stroke-[rgb(255_235_220/0.10)]"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ) : null}
        {area ? <path d={area} fill={`url(#${fillId})`} /> : null}
        {points.length > 1 ? (
          <polyline
            points={coords.join(' ')}
            fill="none"
            className={tones.stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${haloId})`}
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            className={cn(tones.stroke, surface === 1 ? 'fill-surface-1' : 'fill-surface-2')}
            strokeWidth={1.5}
          />
        ))}
        <text
          x={lastPoint.x + LABEL_GAP}
          y={lastPoint.y}
          dominantBaseline="central"
          className={cn('nums text-[11px] font-semibold', tones.text)}
        >
          {lastText}
        </text>
      </svg>
    </div>
  )
}
