import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type SectionTitleProps = {
  children: ReactNode
  id?: string
  /** `accent` (copper) heads the main content, `muted` (grey) the calmer side column. */
  tone?: 'accent' | 'muted'
  as?: 'h2' | 'h3' | 'h4'
  /** A text link or a discreet action on the same line, after the hairline. */
  action?: ReactNode
  className?: string
}

/**
 * Title of a section in the typography of the preparation mode (D-057): small capitals, then a
 * hairline to the edge. No margin: the parent sets the spacing.
 */
export function SectionTitle({
  children,
  id,
  tone = 'accent',
  as: Tag = 'h2',
  action,
  className,
}: SectionTitleProps) {
  const title = (
    <Tag
      id={id}
      className={cn(
        'm-0 flex min-w-0 items-center gap-3 text-caption font-semibold tracking-[0.1em] uppercase',
        "after:h-px after:min-w-6 after:flex-1 after:bg-border after:content-['']",
        tone === 'accent' ? 'text-accent-soft' : 'text-fg-muted',
        action ? 'flex-1' : className,
      )}
    >
      {children}
    </Tag>
  )
  if (!action) return title
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {title}
      {action}
    </div>
  )
}
