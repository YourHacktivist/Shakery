import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type CardProps = HTMLAttributes<HTMLElement> & {
  /** Small muted label above the content. */
  eyebrow?: ReactNode
  /** A card inside a card: surface-2, radius 9, padding 12. */
  nested?: boolean
  as?: 'section' | 'div' | 'article'
}

/** Layered surface with a 1 px border; no blur on regular surfaces (section 11). */
export function Card({
  eyebrow,
  nested = false,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        'flex flex-col border border-border',
        nested ? 'gap-2 rounded-nested bg-surface-2 p-3' : 'gap-3 rounded-card bg-card p-4 shadow-card',
        className,
      )}
      {...rest}
    >
      {eyebrow ? <span className="text-caption font-medium text-fg-muted">{eyebrow}</span> : null}
      {children}
    </Tag>
  )
}
