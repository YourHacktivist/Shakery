import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useHelpStore } from '@renderer/app/help'
import { HelpDialog } from '@renderer/features/help/HelpDialog'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { useDisplayUnit, useGlasses, useIceTypes, useIngredients, useRecipe } from '@renderer/lib/queries'
import { formatDose } from '@renderer/features/recipes/model'
import { InlineText } from '@renderer/components/RichText'
import { Button } from '@renderer/components/Button'
import { SceneBackdrop } from '@renderer/app/scenes'
import logoUrl from '@renderer/assets/logo-512.png'

const t = fr.recipes.prepare

/**
 * Preparation mode (section 10.12): full screen on an opaque background, doses of at least
 * 32 px to be read from a metre away, steps to tick, arrows to the next recipe of a list
 * (`?ids=a,b,c`), screen kept awake. Escape leaves.
 */
export function PrepModePage() {
  const display = useDisplayUnit()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const openHelp = useHelpStore((state) => state.open)
  const recipe = useRecipe(id)
  const ingredients = useIngredients()
  const glasses = useGlasses()
  const ice = useIceTypes()
  // By recipe and step: the ticks of one recipe are not those of the next one.
  const [done, setDone] = useState<ReadonlySet<string>>(new Set())

  const sequence = (params.get('ids') ?? '').split(',').filter(Boolean)
  const position = sequence.indexOf(id)
  const previous = position > 0 ? sequence[position - 1] : undefined
  const next = position >= 0 && position < sequence.length - 1 ? sequence[position + 1] : undefined
  const query = sequence.length > 0 ? `?ids=${sequence.join(',')}` : ''

  // Full screen and screen kept awake while the mode is open.
  useEffect(() => {
    void window.shakery.app.setPrepMode({ active: true })
    return () => {
      void window.shakery.app.setPrepMode({ active: false })
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'F1') {
        event.preventDefault()
        const help = useHelpStore.getState()
        if (help.place) help.close()
        else help.open({ topic: 'prepare', section: null })
        return
      }
      // The help, above, has the keys: the Escape that closes it does not leave the mode.
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return
      if (event.key === 'Escape' || event.key === 'F11') {
        event.preventDefault()
        void navigate(-1)
      } else if (event.key === 'ArrowRight' && next) {
        void navigate(`/prepare/${next}${query}`, { replace: true })
      } else if (event.key === 'ArrowLeft' && previous) {
        void navigate(`/prepare/${previous}${query}`, { replace: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate, next, previous, query])

  const names = new Map((ingredients.data ?? []).map((item) => [item.id, item.name]))
  const data = recipe.data
  const glass = glasses.data?.find((item) => item.id === data?.glassId)?.name
  const iceName = ice.data?.find((item) => item.id === data?.iceId)?.name
  const allFacts: ReadonlyArray<{ label: string; value: string | null }> = [
    { label: t.method, value: data?.method ? fr.recipes.methods[data.method] : null },
    { label: t.glass, value: glass ?? null },
    { label: t.ice, value: iceName ?? null },
  ]
  const facts = allFacts.flatMap((fact) =>
    fact.value === null ? [] : [{ label: fact.label, value: fact.value }],
  )
  // The first step not done yet stands out; the ones done fade away.
  const current = data?.steps.findIndex((_step, index) => !done.has(`${id}:${String(index)}`)) ?? -1

  return (
    <div className="fixed inset-0 z-40 isolate overflow-y-auto bg-bg-base text-fg">
      <SceneBackdrop scene="prepare" />
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 px-10 py-8">
        <header className="window-drag flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="logo-halo flex size-10 shrink-0 items-center justify-center rounded-full">
              <img src={logoUrl} alt="" className="size-8" />
            </span>
            <span className="flex flex-col">
              <span className="text-body font-semibold text-fg">{fr.app.name}</span>
              <span className="text-caption text-fg-muted">{t.eyebrow}</span>
            </span>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <Button
              variant="outline"
              aria-keyshortcuts="F1"
              icon={<CircleHelp size={15} aria-hidden="true" />}
              onClick={() => {
                openHelp({ topic: 'prepare', section: null })
              }}
            >
              {fr.shell.topbar.help}
            </Button>
            <Button
              variant="outline"
              icon={<X size={15} aria-hidden="true" />}
              onClick={() => void navigate(-1)}
            >
              {t.exit}
            </Button>
          </div>
        </header>

        {data ? (
          <article className="flex flex-col rounded-card border border-border bg-card shadow-card">
            <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-border px-10 pt-9 pb-8">
              <div className="flex min-w-0 flex-col gap-2">
                {data.family ? (
                  <span className="text-caption font-semibold tracking-[0.14em] text-accent-soft uppercase">
                    {fr.recipes.families[data.family]}
                  </span>
                ) : null}
                <h1 className="m-0 text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] break-words min-[1440px]:text-[48px]">
                  {data.name}
                </h1>
              </div>
              {facts.length > 0 ? (
                <dl className="m-0 flex flex-wrap gap-x-8 gap-y-3">
                  {facts.map((fact) => (
                    <div key={fact.label} className="flex flex-col gap-1 border-l border-border-strong pl-4">
                      <dt className="text-caption font-medium tracking-[0.12em] text-fg-muted uppercase">
                        {fact.label}
                      </dt>
                      <dd className="m-0 text-[22px] leading-tight text-fg">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </header>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section
                aria-labelledby="prep-ingredients"
                className="flex flex-col gap-3 border-r border-border px-10 pt-7 pb-9"
              >
                <SectionTitle id="prep-ingredients">{t.ingredients}</SectionTitle>
                {/* One grid for every line: the doses share a column, capped, and the names an edge. */}
                <ul className="m-0 grid list-none grid-cols-[fit-content(40%)_minmax(0,1fr)] gap-x-7 p-0">
                  {data.lines
                    .filter((line) => !line.isGarnish)
                    .map((line) => (
                      <li
                        key={line.id}
                        className={cn(
                          'col-span-2 grid grid-cols-subgrid items-baseline border-b border-border py-3.5 text-[26px] leading-tight last:border-b-0 min-[1440px]:text-[30px]',
                          line.isOptional && 'text-fg-secondary',
                        )}
                      >
                        <span className="nums text-right font-semibold break-words text-accent-soft">
                          {formatDose(line, display)}
                        </span>
                        <span className="min-w-0 break-words">
                          {names.get(line.ingredientId) ?? ''}
                          {line.isOptional ? (
                            <span className="ml-3 text-[20px] text-fg-muted">{t.optional}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                </ul>
                {data.garnish ? (
                  <div className="mt-3 flex flex-col gap-1.5 rounded-nested bg-surface-2 px-5 py-4">
                    <span className="text-caption font-medium tracking-[0.12em] text-fg-muted uppercase">
                      {t.garnish}
                    </span>
                    <span className="text-[22px] leading-snug min-[1440px]:text-[24px]">{data.garnish}</span>
                  </div>
                ) : null}
              </section>

              <section aria-labelledby="prep-steps" className="flex flex-col gap-3 px-10 pt-7 pb-9">
                <SectionTitle id="prep-steps">{t.steps}</SectionTitle>
                {data.steps.length === 0 ? (
                  <p className="m-0 py-3 text-[22px] text-fg-muted">{t.noSteps}</p>
                ) : null}
                <ol className="m-0 flex list-none flex-col p-0">
                  {data.steps.map((step, index) => {
                    const tick = `${id}:${String(index)}`
                    const checked = done.has(tick)
                    return (
                      <li key={index} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => {
                            setDone((currentTicks) => {
                              const copy = new Set(currentTicks)
                              if (copy.has(tick)) copy.delete(tick)
                              else copy.add(tick)
                              return copy
                            })
                          }}
                          className={cn(
                            'grid w-full cursor-pointer grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-4 border-0 bg-transparent py-3.5 text-left text-[22px] leading-snug transition-[color,opacity] duration-200 min-[1440px]:text-[26px]',
                            checked
                              ? 'text-fg-muted opacity-45'
                              : index === current
                                ? 'text-fg'
                                : 'text-fg-secondary hover:text-fg',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'nums text-right font-semibold',
                              !checked && index === current ? 'text-accent-soft' : 'text-fg-muted',
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <InlineText text={step} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
                {data.steps.length > 0 ? (
                  <p className="m-0 mt-1 text-small text-fg-muted">{t.stepsHint}</p>
                ) : null}
              </section>
            </div>
          </article>
        ) : recipe.isError ? (
          <p role="alert" className="m-0 text-[22px] text-status-danger">
            {t.notFound}
          </p>
        ) : null}

        {sequence.length > 1 ? (
          <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-body text-fg-secondary">
            <div>
              <Button
                variant="outline"
                disabled={!previous}
                icon={<ArrowLeft size={15} aria-hidden="true" />}
                onClick={() => void navigate(`/prepare/${previous ?? id}${query}`, { replace: true })}
              >
                {t.previous}
              </Button>
            </div>
            <span className="nums">{t.position(position + 1, sequence.length)}</span>
            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={!next}
                onClick={() => void navigate(`/prepare/${next ?? id}${query}`, { replace: true })}
              >
                {t.next}
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
      <HelpDialog />
    </div>
  )
}

/** The head of a column, as on the printed sheet: small capitals in copper, then a hairline. */
function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="m-0 flex items-center gap-4 text-small font-semibold tracking-[0.14em] text-accent-soft uppercase"
    >
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </h2>
  )
}
