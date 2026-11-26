import { FlaskConical } from 'lucide-react'
import { useId } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLink } from '@renderer/components/ArrowLink'
import { Button } from '@renderer/components/Button'
import { expiryState, expiryText, type ExpiryState } from '@renderer/components/ExpiryPill'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { useTonight } from '@renderer/features/shared/tonight'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { daysLeftFromNow } from '@renderer/lib/format'
import { usePreps, useSetting, useTastings } from '@renderer/lib/queries'

/*
 * The three blocks of the former sidebar, now sections of the home screen (D-057): the next
 * steps to test in the main column, tonight and the preparations in the calmer side column.
 */

const t = fr.home

/** Next steps still to test, from the tasting journal: one row each, with the way to the lab. */
export function RetestSection() {
  const id = useId()
  const navigate = useNavigate()
  const tastings = useTastings({ toRetest: true })
  const steps = (tastings.data ?? [])
    .filter((note) => note.nextStep !== null && !note.nextStepDone)
    .slice(0, 3)
  return (
    <section aria-labelledby={id} className="@container flex flex-col gap-1">
      <SectionTitle id={id} action={<ArrowLink to="/journal">{t.retest.journal}</ArrowLink>}>
        {t.retest.title}
      </SectionTitle>
      {steps.length === 0 ? (
        <p className="m-0 pt-2 text-small text-fg-secondary">{t.retest.empty}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {steps.map((note) => (
            <li
              key={note.id}
              className="grid min-h-14 grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-x-4 py-2 @min-[40rem]:grid-cols-[13rem_minmax(0,1fr)_auto]"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <Link
                  to={`/recipes/${note.recipeId}`}
                  className="truncate rounded-sm text-body font-medium text-fg transition-colors duration-150 hover:text-accent-soft"
                >
                  {note.recipeName}
                </Link>
                <span className="text-caption text-fg-muted">{t.retest.from(note.recipeVersion)}</span>
              </span>
              <span className="line-clamp-2 text-lead break-words text-fg">{note.nextStep}</span>
              <Button
                variant="ghost"
                size="sm"
                icon={<FlaskConical size={14} strokeWidth={1.75} aria-hidden="true" />}
                aria-label={t.retest.actionLabel(note.recipeName)}
                onClick={() => void navigate(`/lab/${note.recipeId}`)}
              >
                {t.retest.action}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** What the bar can make tonight, and the bottle that unlocks the most. */
export function TonightSection() {
  const id = useId()
  const tonight = useTonight()
  const best = tonight.unlockers[0]
  const known = tonight.makeable > 0 || tonight.unlockers.length > 0
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <SectionTitle id={id} tone="muted">
        {t.tonight.title}
      </SectionTitle>
      {!tonight.ready ? null : known ? (
        <>
          {tonight.makeable > 0 ? (
            <p className="m-0 mt-3.5 mb-3.5 flex items-baseline gap-2.5">
              <span className="nums text-metric leading-none font-medium text-copper">
                {tonight.makeable}
              </span>
              <span className="text-lead text-fg">{t.tonight.makeable(tonight.makeable)}</span>
            </p>
          ) : (
            <p className="m-0 mt-3 mb-3 text-body text-fg-secondary">{t.tonight.none}</p>
          )}
          {best ? (
            <div className="mb-3 flex items-end justify-between gap-3 border-t border-border pt-2.5">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-caption text-fg-muted">{t.tonight.firstToBuy}</span>
                <span className="truncate text-body font-medium text-fg">{best.name}</span>
              </span>
              <span className="nums shrink-0 text-body text-fg-secondary">
                {t.tonight.unlocks(best.recipes.length)}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <p className="m-0 mt-3 mb-3 text-small leading-normal text-fg-secondary">{t.tonight.empty}</p>
      )}
      <ArrowLink to="/bar" className="self-start">
        {t.tonight.action}
      </ArrowLink>
    </section>
  )
}

/** Colour of the time left, in words only: no pill in the calm column (D-053). */
const EXPIRY_TONE: Record<ExpiryState, string> = {
  ok: 'text-fg-secondary',
  expiring: 'font-semibold text-accent-soft',
  expired: 'font-semibold text-status-danger',
  none: 'text-fg-muted',
}

/** Batches in use, the soonest to expire first. */
export function PrepsSection() {
  const id = useId()
  const preps = usePreps()
  const warningDays = useSetting('preps.warningDays')
  const active = (preps.data ?? [])
    .flatMap((prep) =>
      prep.batches
        .filter((batch) => batch.status === 'active')
        .map((batch) => ({ prep, batch, days: daysLeftFromNow(batch.bestBefore) })),
    )
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity))
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <SectionTitle id={id} tone="muted">
        {t.preps.title}
      </SectionTitle>
      {active.length === 0 ? (
        <>
          <p className="m-0 mt-3 text-body text-fg-secondary">{t.preps.empty}</p>
          <p className="m-0 mt-1 mb-3 text-caption leading-snug text-fg-muted">{t.preps.hint}</p>
        </>
      ) : (
        <ul className="m-0 mt-1.5 mb-3 list-none divide-y divide-border p-0">
          {active.slice(0, 4).map(({ prep, batch, days }) => (
            <li key={batch.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5">
              <span className="truncate text-body text-fg">{prep.name}</span>
              <span
                className={cn(
                  'nums shrink-0 text-small whitespace-nowrap',
                  EXPIRY_TONE[expiryState(days, warningDays)],
                )}
              >
                {expiryText(days, warningDays)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ArrowLink to="/preps" className="self-start">
        {t.preps.action}
      </ArrowLink>
    </section>
  )
}
