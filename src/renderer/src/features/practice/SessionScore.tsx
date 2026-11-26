import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.workshop.practice

/** The score of a finished session, « 17 / 20 »: the right answers in copper, then the total. */
export function SessionScore({
  score,
  total,
  className,
}: {
  score: number
  total: number
  className?: string
}) {
  return (
    <span className={cn('nums shrink-0 whitespace-nowrap', className)}>
      <span className="sr-only">{t.result.score(score, total)}</span>
      <span aria-hidden="true">
        <span className="text-heading font-semibold text-accent-soft">{score}</span>
        <span className="text-small text-fg-muted">{t.outOf(total)}</span>
      </span>
    </span>
  )
}
