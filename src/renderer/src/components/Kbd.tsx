import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type KbdProps = {
  children: ReactNode
  /** `onAccent` for a hint inside a solid (copper) button. */
  tone?: 'default' | 'onAccent'
  className?: string
}

/** Keyboard shortcut hint, e.g. <Kbd>Ctrl K</Kbd>. */
export function Kbd({ children, tone = 'default', className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded-md border px-1.5 font-sans text-[11px] font-semibold',
        tone === 'onAccent'
          ? 'border-accent-ink/35 text-accent-ink'
          : 'border-border-strong text-fg-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
