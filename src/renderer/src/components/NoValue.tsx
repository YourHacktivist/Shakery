import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

/**
 * A value not known yet: a short drawn line, as in the tiles of the home screen, and its
 * words for a screen reader. No dash character is ever written (D-052).
 */
export function NoValue({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center align-middle', className)}>
      <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-fg-muted" />
      <span className="sr-only">{fr.components.display.stat.empty}</span>
    </span>
  )
}
