import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { useGlasses, useIceTypes, useIngredients, useRecipe } from '@renderer/lib/queries'
import { formatDose } from '@renderer/features/recipes/model'

const t = fr.recipes.prepare

/**
 * Preparation mode (section 10.12): full screen on an opaque background, doses of at least
 * 32 px to be read from a metre away, steps to tick, arrows to the next recipe of a list
 * (`?ids=a,b,c`), screen kept awake. Escape leaves.
 */
export function PrepModePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const recipe = useRecipe(id)
  const ingredients = useIngredients()
  const glasses = useGlasses()
  const ice = useIceTypes()
  const [done, setDone] = useState<ReadonlySet<number>>(new Set())

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
  const service = [
    data?.method ? fr.recipes.methods[data.method] : null,
    glass ?? null,
    iceName ?? null,
  ].filter((part): part is string => part !== null)

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-bg-base px-12 py-8 text-fg">
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-lead text-fg-muted">{t.eyebrow}</span>
          <h1 className="m-0 text-[48px] leading-tight font-normal tracking-[-0.02em]">
            {data?.name ?? t.loading}
          </h1>
          {service.length > 0 ? (
            <p className="m-0 text-[24px] text-fg-secondary">{service.join(' · ')}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-field border border-border-strong px-4 text-lead text-fg hover:bg-surface-2"
        >
          <X size={20} aria-hidden="true" />
          {t.exit}
        </button>
      </header>

      {data ? (
        <div className="mt-8 grid flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-12">
          <section aria-label={t.ingredients}>
            <ul className="m-0 flex list-none flex-col p-0">
              {data.lines
                .filter((line) => !line.isGarnish)
                .map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      'grid grid-cols-[minmax(9rem,auto)_minmax(0,1fr)] items-baseline gap-6 border-b border-border py-4',
                      line.isOptional && 'opacity-70',
                    )}
                  >
                    <span className="nums text-right text-[48px] leading-none font-normal text-accent-soft">
                      {formatDose(line)}
                    </span>
                    <span className="text-[32px] leading-tight">
                      {names.get(line.ingredientId) ?? ''}
                      {line.isOptional ? (
                        <span className="text-[24px] text-fg-muted">{` (${t.optional})`}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
            </ul>
            {data.garnish ? (
              <p className="mt-6 text-[32px] leading-snug">
                <span className="text-fg-muted">{`${t.garnish} `}</span>
                {data.garnish}
              </p>
            ) : null}
          </section>

          <section aria-label={t.steps} className="flex flex-col gap-3">
            {data.steps.length === 0 ? <p className="m-0 text-[32px] text-fg-muted">{t.noSteps}</p> : null}
            {data.steps.map((step, index) => {
              const checked = done.has(index)
              return (
                <button
                  key={index}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => {
                    setDone((current) => {
                      const copy = new Set(current)
                      if (copy.has(index)) copy.delete(index)
                      else copy.add(index)
                      return copy
                    })
                  }}
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-card border p-5 text-left text-[32px] leading-snug transition-colors duration-150',
                    checked
                      ? 'border-border bg-surface-1 text-fg-muted line-through'
                      : 'border-border-strong bg-surface-2 text-fg',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border-2',
                      checked ? 'border-status-ok bg-status-ok text-accent-ink' : 'border-border-strong',
                    )}
                  >
                    {checked ? <Check size={24} /> : <span className="nums text-[20px]">{index + 1}</span>}
                  </span>
                  {step}
                </button>
              )
            })}
          </section>
        </div>
      ) : recipe.isError ? (
        <p role="alert" className="mt-8 text-[32px] text-status-danger">
          {t.notFound}
        </p>
      ) : null}

      {sequence.length > 1 ? (
        <footer className="mt-8 flex items-center justify-between text-lead text-fg-secondary">
          <span className="flex items-center gap-2">
            <ArrowLeft size={20} aria-hidden="true" />
            {t.previous}
          </span>
          <span className="nums">{t.position(position + 1, sequence.length)}</span>
          <span className="flex items-center gap-2">
            {t.next}
            <ArrowRight size={20} aria-hidden="true" />
          </span>
        </footer>
      ) : null}
    </div>
  )
}
