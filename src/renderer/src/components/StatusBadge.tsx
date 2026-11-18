import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

/** Same values as RECIPE_STATUSES in src/main/db/schema.ts. */
export type RecipeStatus = 'idea' | 'draft' | 'testing' | 'final' | 'archived'

const t = fr.components.display

const STATUS_STYLES: Record<RecipeStatus, string> = {
  idea: 'bg-status-warning/12 text-status-warning',
  draft: 'bg-[rgb(255_235_220/0.06)] text-fg-secondary',
  testing: 'bg-accent/14 text-accent-soft',
  final: 'bg-status-ok/12 text-status-ok',
  archived: 'border border-border-strong bg-transparent text-fg-muted',
}

type StatusBadgeProps = {
  status: RecipeStatus
  className?: string
}

/** Recipe status pill: the word always carries the state, the colour only supports it. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap',
        STATUS_STYLES[status],
        className,
      )}
    >
      {t.status[status]}
    </span>
  )
}

type VersionBadgeProps = {
  /** Version number, shown as « v4 ». */
  version: number
  className?: string
}

/** Compact version tag (« v4 »), read « Version 4 » by screen readers. */
export function VersionBadge({ version, className }: VersionBadgeProps) {
  return (
    <span
      className={cn(
        'nums inline-flex h-6 shrink-0 items-center rounded-md border border-border-strong bg-surface-2 px-2 text-caption font-semibold text-fg-secondary',
        className,
      )}
    >
      <span aria-hidden="true">{t.version(version)}</span>
      <span className="sr-only">{t.versionLong(version)}</span>
    </span>
  )
}
