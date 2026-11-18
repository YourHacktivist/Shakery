import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type EmptyStateProps = {
  title: string
  /** What to do next: an empty block always explains it (section 10.3). */
  description?: ReactNode
  /** Icon in the round badge; a plus sign by default. */
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-border-strong p-6 text-center',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-accent-soft">
        {icon ?? <Plus size={18} aria-hidden="true" />}
      </div>
      <span className="text-body font-semibold text-fg">{title}</span>
      {description ? <p className="m-0 max-w-sm text-small text-fg-secondary">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
