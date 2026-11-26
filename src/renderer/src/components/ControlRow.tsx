import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type ControlRowProps = {
  /** What the row sets. The control keeps its own accessible name. */
  label: ReactNode
  /** A short line of help under the label. */
  hint?: ReactNode
  /** The control, aligned on the right edge shared by every row. */
  children?: ReactNode
  /** A tighter row, for the lines of a list (recent backups). */
  compact?: boolean
  /** The controls go under the label, over the whole width: a row of several buttons. */
  stacked?: boolean
  className?: string
}

/**
 * A setting as a row (D-057): its label and a short help on the left, its control on the right.
 * Rows follow one another separated by hairlines, without any card; the first one of a group has
 * no hairline above it.
 */
export function ControlRow({
  label,
  hint,
  children,
  compact = false,
  stacked = false,
  className,
}: ControlRowProps) {
  return (
    <div
      className={cn(
        'flex border-t border-border first:border-t-0',
        stacked ? 'flex-col items-start gap-y-2' : 'flex-wrap items-center justify-between gap-x-8 gap-y-2',
        compact ? 'min-h-11 py-1.5' : 'min-h-14 py-2.5',
        className,
      )}
    >
      <div className={cn('flex max-w-[560px] min-w-0 flex-col gap-0.5', !stacked && 'flex-1 basis-56')}>
        <span className="text-body text-fg">{label}</span>
        {hint ? <span className="text-small break-words text-fg-muted">{hint}</span> : null}
      </div>
      {children === undefined ? null : (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            stacked ? 'w-full justify-start' : 'shrink-0 justify-end',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
