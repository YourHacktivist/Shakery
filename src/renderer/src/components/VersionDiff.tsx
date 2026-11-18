import { ArrowDown, ArrowRight, ArrowUp, Equal, Minus, Plus, Replace } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDelta, formatNumber } from '@renderer/lib/format'

const t = fr.components.display

export type DiffDose = { amount: number; unit: string }

/** One difference between two versions. The comparison itself is computed elsewhere (core). */
export type VersionChange =
  | { kind: 'added'; ingredient: string; dose?: DiffDose }
  | { kind: 'removed'; ingredient: string; dose?: DiffDose }
  | { kind: 'dose'; ingredient: string; before: number; after: number; unit: string }
  | { kind: 'method'; before: string; after: string }
  | { kind: 'glass'; before: string; after: string }
  | { kind: 'unchanged'; ingredient: string; dose?: DiffDose }

type Tag = keyof typeof t.diff.kinds

const TAGS: Record<Tag, { icon: LucideIcon; color: string }> = {
  added: { icon: Plus, color: 'text-status-ok' },
  removed: { icon: Minus, color: 'text-status-danger' },
  increased: { icon: ArrowUp, color: 'text-accent-soft' },
  decreased: { icon: ArrowDown, color: 'text-accent-soft' },
  changed: { icon: Replace, color: 'text-accent-soft' },
  unchanged: { icon: Equal, color: 'text-fg-muted' },
}

function dose(value: DiffDose | undefined): string {
  return value ? t.withUnit(formatNumber(value.amount), value.unit) : ''
}

/** Digits needed to show a dose difference exactly (0, 1 or 2). */
function deltaDecimals(difference: number): number {
  const hundredths = Math.round(Math.abs(difference) * 100)
  if (hundredths % 100 === 0) return 0
  return hundredths % 10 === 0 ? 1 : 2
}

function tagOf(change: VersionChange): Tag {
  switch (change.kind) {
    case 'dose':
      return change.after >= change.before ? 'increased' : 'decreased'
    case 'method':
    case 'glass':
      return 'changed'
    default:
      return change.kind
  }
}

function Transition({ before, after }: { before: string; after: string }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-1.5">
      <span className="text-fg-muted">{before}</span>
      <ArrowRight size={14} aria-hidden="true" className="text-fg-muted" />
      <span className="sr-only">{` ${t.diff.becomes} `}</span>
      <span className="text-fg">{after}</span>
    </span>
  )
}

function DiffRow({ change }: { change: VersionChange }) {
  const tag = tagOf(change)
  const { icon: Icon, color } = TAGS[tag]
  let name: string
  let detail: ReactNode
  switch (change.kind) {
    case 'added':
    case 'removed':
    case 'unchanged':
      name = change.ingredient
      detail = dose(change.dose)
      break
    case 'dose': {
      const difference = change.after - change.before
      name = change.ingredient
      detail = (
        <span className="inline-flex flex-wrap items-center justify-end gap-x-3">
          <Transition
            before={t.withUnit(formatNumber(change.before), change.unit)}
            after={t.withUnit(formatNumber(change.after), change.unit)}
          />
          <span className={cn('font-semibold', color)}>
            {t.withUnit(formatDelta(difference, deltaDecimals(difference)), change.unit)}
          </span>
        </span>
      )
      break
    }
    case 'method':
    case 'glass':
      name = change.kind === 'method' ? t.diff.method : t.diff.glass
      detail = <Transition before={change.before} after={change.after} />
      break
  }

  return (
    <li
      data-kind={change.kind}
      className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-body"
    >
      <span className={cn('inline-flex items-center gap-1.5 text-caption font-semibold', color)}>
        <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
        {t.diff.kinds[tag]}
      </span>
      <span
        className={cn(
          'min-w-0 truncate',
          change.kind === 'removed'
            ? 'text-fg-secondary line-through decoration-status-danger/60'
            : change.kind === 'unchanged'
              ? 'text-fg-secondary'
              : 'text-fg',
        )}
      >
        {name}
      </span>
      <span className="nums text-right text-small text-fg-secondary">{detail}</span>
    </li>
  )
}

type VersionDiffProps = {
  /** Older version, e.g. « v3 ». */
  from: string
  /** Newer version, e.g. « v4 ». */
  to: string
  changes: readonly VersionChange[]
  className?: string
}

/** Differences between two versions: each change has a colour, an icon and a word. */
export function VersionDiff({ from, to, changes, className }: VersionDiffProps) {
  const titleId = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <span id={titleId} className="text-caption font-medium tracking-[0.01em] text-fg-muted">
        {t.diff.title(from, to)}
      </span>
      {changes.length === 0 ? (
        <p className="m-0 text-small text-fg-secondary">{t.diff.none(from, to)}</p>
      ) : (
        <ul aria-labelledby={titleId} className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {changes.map((change, index) => (
            <DiffRow key={index} change={change} />
          ))}
        </ul>
      )}
    </div>
  )
}
