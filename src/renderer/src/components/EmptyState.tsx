import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type EmptyStateProps = {
  title: string
  /** What to do next: an empty block always explains it (section 10.3). */
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** An empty list: its title, what to do next and the action, without any decorative badge (D-053). */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-border-strong bg-bg-base/90 p-4 text-center',
        className,
      )}
    >
      <span className="text-body font-semibold text-fg">{title}</span>
      {description ? <p className="m-0 max-w-sm text-small text-fg-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
