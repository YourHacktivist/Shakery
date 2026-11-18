import { Info } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { AllergenBadge } from '@renderer/components/AllergenBadge'
import { Card } from '@renderer/components/Card'
import { fr } from '@renderer/i18n/fr'
import { formatNumber } from '@renderer/lib/format'
import { useRecipeComputation } from '@renderer/lib/queries'
import type { RecipeComputation, RecipeInput } from '@shared/domain/catalog'

const t = fr.recipes.panel

type Metric = RecipeComputation['abv']
type Issue = Metric['issues'][number]

const VOLUME_REASONS = new Set(['missing_quantity', 'top_without_estimate'])

/** « ligne 2, Citron vert (dose manquante) ; ligne 3, Sirop (sucre inconnu, acidité inconnue) ». */
function describeIssues(issues: readonly Issue[], names: ReadonlyMap<string, string>): string {
  const byLine = new Map<string, { line: number | null; name: string | null; reasons: Set<string> }>()
  for (const issue of issues) {
    const match = /^line-(\d+)$/.exec(issue.lineId)
    const line = match?.[1] === undefined ? null : Number(match[1]) + 1
    const name = issue.ingredientId === undefined ? null : (names.get(issue.ingredientId) ?? null)
    const reason = (t.reasons as Record<string, string>)[issue.reason] ?? issue.reason
    const key = `${issue.lineId}|${name ?? ''}`
    const entry = byLine.get(key) ?? { line, name, reasons: new Set<string>() }
    entry.reasons.add(reason)
    byLine.set(key, entry)
  }
  return [...byLine.values()]
    .sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
    .map((entry) => t.issue(entry.line, entry.name, [...entry.reasons].join(', ')))
    .join(' ; ')
}

function Marker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-4 items-center rounded-full border border-border-strong px-1.5 text-[10px] font-semibold text-fg-secondary">
      {children}
    </span>
  )
}

function statusMarker(status: Metric['status']): ReactNode {
  if (status === 'estimated') return <Marker>{t.estimated}</Marker>
  if (status === 'incomplete') return <Marker>{t.incomplete}</Marker>
  return null
}

/** One line of the panel: label on the left, value and unit on the right, a marker when needed. */
function Row({
  label,
  value,
  decimals = 1,
  unit,
  marker,
  hint,
}: {
  label: string
  value: number | null
  decimals?: number
  unit: string
  marker?: ReactNode
  hint?: ReactNode
}) {
  const empty = value === null || !Number.isFinite(value)
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="flex min-w-0 items-center gap-2 text-small text-fg-secondary">
          <span className="truncate">{label}</span>
          {marker}
        </dt>
        <dd className="m-0 flex shrink-0 items-baseline gap-1">
          {empty ? (
            <>
              <span aria-hidden="true" className="text-lead text-fg-muted">
                –
              </span>
              <span className="sr-only">{fr.components.display.stat.empty}</span>
            </>
          ) : (
            <span className="nums text-lead font-medium text-fg">{formatNumber(value, decimals)}</span>
          )}
          <span className="text-caption text-fg-muted">{unit}</span>
        </dd>
      </div>
      {hint ? <div className="text-right text-caption text-fg-muted">{hint}</div> : null}
    </div>
  )
}

type ComputedPanelProps = {
  /** Recipe to compute (saved or draft); null when it has no line yet. */
  data: RecipeInput | null
  /** Ingredient names, to say which lines are missing something. */
  names: ReadonlyMap<string, string>
  className?: string
}

/**
 * Calculated panel (section 10.4): displays what recipes.compute returns, nothing more.
 * An incomplete value names the lines at fault; an estimated one is marked as such.
 */
export function ComputedPanel({ data, names, className }: ComputedPanelProps) {
  const computation = useRecipeComputation(data)
  const titleId = useId()

  return (
    <Card className={className} aria-labelledby={titleId}>
      <h2 id={titleId} className="m-0 text-body font-semibold text-fg">
        {t.title}
      </h2>
      {data === null ? (
        <p className="m-0 text-small text-fg-secondary">{t.empty}</p>
      ) : computation.isError ? (
        <p role="alert" className="m-0 text-small text-status-danger">
          {t.error}
        </p>
      ) : computation.data === undefined ? (
        <p className="m-0 text-small text-fg-muted" aria-busy="true">
          {t.loading}
        </p>
      ) : (
        <PanelContent result={computation.data} names={names} />
      )}
    </Card>
  )
}

function PanelContent({ result, names }: { result: RecipeComputation; names: ReadonlyMap<string, string> }) {
  const volumeIssues = result.abv.issues.filter((issue) => VOLUME_REASONS.has(issue.reason))
  const volumeIncomplete = volumeIssues.length > 0
  const costValue =
    result.costStatus === 'incomplete' || result.costCents === null ? null : result.costCents / 100
  const costUnit = result.costBasis ? `€ ${t.costBasis[result.costBasis]}` : '€'
  const missing = describeIssues(
    [result.abv, result.sugarPer100Ml, result.acidPer100Ml, result.ratio].flatMap((metric) =>
      metric.status === 'incomplete' ? metric.issues : [],
    ),
    names,
  )

  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 flex flex-col divide-y divide-border">
        <Row
          label={t.abv}
          value={result.abv.value}
          unit={t.units.abv}
          marker={statusMarker(result.abv.status)}
        />
        <Row
          label={t.volume}
          value={volumeIncomplete ? null : result.finalVolumeMl}
          decimals={0}
          unit={t.units.ml}
          marker={
            volumeIncomplete ? (
              <Marker>{t.incomplete}</Marker>
            ) : result.approximate ? (
              <Marker>{t.approximate}</Marker>
            ) : null
          }
          hint={volumeIncomplete ? null : t.initialVolume(formatNumber(result.initialVolumeMl, 0))}
        />
        <Row
          label={t.sugar}
          value={result.sugarPer100Ml.value}
          unit={t.units.per100}
          marker={statusMarker(result.sugarPer100Ml.status)}
        />
        <Row
          label={t.acid}
          value={result.acidPer100Ml.value}
          decimals={2}
          unit={t.units.per100}
          marker={statusMarker(result.acidPer100Ml.status)}
        />
        <Row
          label={t.ratio}
          value={result.ratio.value}
          decimals={0}
          unit={t.units.ratio}
          marker={statusMarker(result.ratio.status)}
        />
        <Row label={t.dilution} value={result.dilution * 100} decimals={0} unit={t.units.pct} />
        <Row
          label={t.cost}
          value={costValue}
          decimals={2}
          unit={costUnit}
          marker={result.costStatus === 'complete' ? null : statusMarker(result.costStatus)}
          hint={result.costStatus === 'incomplete' ? t.costMissing : null}
        />
      </dl>

      {missing === '' ? null : (
        <p className="m-0 rounded-nested bg-surface-2 px-3 py-2 text-caption leading-snug text-fg-muted">
          {t.missing(missing)}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{t.allergens}</span>
        {result.allergens.length === 0 && result.optionalAllergens.length === 0 ? (
          <p className="m-0 text-small text-fg-secondary">{t.noAllergen}</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {result.allergens.map((code) => (
              <li key={code} className="max-w-full">
                <AllergenBadge code={code} />
              </li>
            ))}
            {result.optionalAllergens.map((code) => (
              <li key={`optional-${code}`} className="max-w-full">
                <AllergenBadge code={code} optional />
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 flex items-start gap-1.5 text-caption leading-snug text-fg-muted">
          <Info size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t.allergenNote}
        </p>
      </div>

      {result.approximate ? <p className="m-0 text-caption text-fg-muted">{t.approximateNote}</p> : null}
    </div>
  )
}
