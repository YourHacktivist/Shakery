import { ChevronRight, FlaskConical, NotebookPen, Plus } from 'lucide-react'
import { Fragment, useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { ArrowLink } from '@renderer/components/ArrowLink'
import { Button } from '@renderer/components/Button'
import { HeroCard } from '@renderer/components/HeroCard'
import { Kbd } from '@renderer/components/Kbd'
import { NoValue } from '@renderer/components/NoValue'
import { RangeGauge } from '@renderer/components/RangeGauge'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { StatusBadge, type RecipeStatus } from '@renderer/components/StatusBadge'
import { PrepsSection, RetestSection, TonightSection } from '@renderer/features/home/HomeSections'
import { detailToInput } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate, formatNumber, formatRelative } from '@renderer/lib/format'
import {
  useRecipe,
  useRecipeComputation,
  useRecipeVersion,
  useRecipes,
  useReferenceZones,
  useTastings,
} from '@renderer/lib/queries'
import { ariaKeyShortcut, shortcutText } from '@renderer/lib/shortcuts'
import type { RecipeComputation, RecipeSummary } from '@shared/domain/catalog'
import type { TastingNote } from '@shared/domain/journal'

const t = fr.home
const IN_PROGRESS = new Set(['idea', 'draft', 'testing'])
/** The home shows a few creations; the page Fiches lists the others. */
const SHOWN = 5
/** The tab of the classics on the page Fiches. */
const CLASSICS_PATH = '/recipes?vue=classiques'
const WEEK = 7 * 24 * 60 * 60 * 1000

const METRICS = ['abv', 'sugar', 'acid', 'ratio'] as const
type Metric = (typeof METRICS)[number]
const DECIMALS: Record<Metric, number> = { abv: 1, sugar: 1, acid: 1, ratio: 0 }
/** The indicators named when unknown; the ratio follows from the sugar and the acidity. */
const NAMED = ['abv', 'sugar', 'acid'] as const

/** Small capitals of a label, as in the preparation mode (D-057). */
const CAPS = 'text-[10.5px] font-semibold tracking-[0.09em] text-fg-muted uppercase'

/** The status in words, in its colour, without the pill of the lists. */
const STATUS_TONE: Record<RecipeStatus, string> = {
  idea: 'text-status-warning',
  draft: 'text-fg-secondary',
  testing: 'text-accent-soft',
  final: 'text-status-ok',
  archived: 'text-fg-muted',
}

/** Mean overall rating of the last tasted version, or null before any rating. */
function lastRating(notes: readonly TastingNote[]): number | null {
  let version = -1
  let values: number[] = []
  for (const note of notes) {
    if (note.overall === null) continue
    if (note.recipeVersion > version) {
      version = note.recipeVersion
      values = [note.overall]
    } else if (note.recipeVersion === version) values.push(note.overall)
  }
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
}

function metricValue(data: RecipeComputation | undefined, metric: Metric): number | null {
  if (!data) return null
  if (metric === 'abv') return data.abv.value
  if (metric === 'sugar') return data.sugarPer100Ml.value
  if (metric === 'acid') return data.acidPer100Ml.value
  return data.ratio.value
}

/** « 4,0 /5 », or the drawn line before any rating. */
function Rating({ value }: { value: number | null }) {
  if (value === null) return <NoValue />
  return (
    <span className="nums whitespace-nowrap">
      {formatNumber(value, 1)}
      <span className="ml-[3px] text-small font-normal text-fg-muted">{t.focus.outOf}</span>
    </span>
  )
}

/**
 * Home screen (section 10.3, D-057): the creation in focus, the next steps to test and the
 * creations in progress in the main column; the lab, tonight and the preparations in the calmer
 * side column. No card but the hero, which holds the only solid button of the screen.
 */
export function HomePage() {
  const navigate = useNavigate()
  const recipes = useRecipes()
  const tastings = useTastings()
  // Relative times are computed once per visit of the home screen: no timer while idle.
  const [now] = useState(() => Date.now())

  const notesByRecipe = useMemo(() => {
    const map = new Map<string, TastingNote[]>()
    for (const note of tastings.data ?? []) map.set(note.recipeId, [...(map.get(note.recipeId) ?? []), note])
    return map
  }, [tastings.data])

  const activity = (recipe: RecipeSummary) =>
    Math.max(recipe.updatedAt, ...(notesByRecipe.get(recipe.id) ?? []).map((note) => note.tastedAt))

  const inProgress = (recipes.data ?? [])
    .filter((recipe) => recipe.kind === 'cocktail' && IN_PROGRESS.has(recipe.status))
    .sort((a, b) => activity(b) - activity(a))
  const focus = inProgress.find((recipe) => recipe.status === 'testing') ?? inProgress[0]

  if (recipes.isPending) return null

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(inProgress.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
        <div className="flex min-w-0 flex-col gap-9">
          {focus ? (
            <FocusSection recipe={focus} notes={notesByRecipe.get(focus.id) ?? []} now={now} />
          ) : (
            <EmptyFocus />
          )}
          <RetestSection />
          {inProgress.length > 0 ? (
            <InProgressSection
              recipes={inProgress.slice(0, SHOWN)}
              rating={(recipe) => lastRating(notesByRecipe.get(recipe.id) ?? [])}
              activity={activity}
              now={now}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <HeroCard
            title={t.hero.title}
            description={t.hero.description}
            actions={
              <>
                <Button
                  icon={<FlaskConical size={15} strokeWidth={1.75} aria-hidden="true" />}
                  onClick={() => void navigate('/lab')}
                >
                  {t.hero.openLab}
                </Button>
                <ArrowLink to={CLASSICS_PATH} className="justify-center">
                  {t.hero.fromClassic}
                </ArrowLink>
              </>
            }
          />
          <TonightSection />
          <PrepsSection />
        </div>
      </div>
    </div>
  )
}

/** Without any creation in progress: the same section, with the way to a first idea. */
function EmptyFocus() {
  const id = useId()
  const openOverlay = useOverlayStore((state) => state.open)
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <SectionTitle id={id}>{t.focus.title}</SectionTitle>
      <h3 className="m-0 mt-5 text-title leading-tight font-light tracking-tight text-fg">{t.empty.title}</h3>
      <p className="m-0 mt-2 max-w-xl text-body leading-relaxed text-fg-secondary">{t.empty.description}</p>
      <div className="mt-5 flex">
        <Button
          variant="outline"
          icon={<Plus size={15} strokeWidth={1.75} aria-hidden="true" />}
          aria-keyshortcuts={ariaKeyShortcut('quickIdea')}
          onClick={() => {
            openOverlay('quickIdea')
          }}
        >
          {t.empty.firstIdea}
          <Kbd>{shortcutText('quickIdea')}</Kbd>
        </Button>
      </div>
    </section>
  )
}

/**
 * The creation in focus, in the typography of the preparation mode: family and last tasting,
 * the name, its status, version and last rating, then a gauge for each indicator already known.
 */
function FocusSection({
  recipe,
  notes,
  now,
}: {
  recipe: RecipeSummary
  notes: readonly TastingNote[]
  now: number
}) {
  const id = useId()
  const navigate = useNavigate()
  const openTasting = useOverlayStore((state) => state.openTasting)
  const detail = useRecipe(recipe.id).data
  const zones = useReferenceZones()
  const current = useRecipeComputation(detail ? detailToInput(detail) : null)
  const previousVersion = recipe.version > 1 ? recipe.version - 1 : null
  const previousDetail = useRecipeVersion(recipe.id, previousVersion)
  const previous = useRecipeComputation(previousDetail.data ? detailToInput(previousDetail.data) : null)

  const familyLabel = recipe.family ? fr.recipes.families[recipe.family] : null
  const familyZones = recipe.family ? zones.data?.[recipe.family] : undefined
  const lastTasted = notes.reduce<number | null>(
    (latest, note) => (latest === null || note.tastedAt > latest ? note.tastedAt : latest),
    null,
  )
  const known = METRICS.filter((metric) => metricValue(current.data, metric) !== null)
  const unknown = current.data
    ? NAMED.filter((metric) => metricValue(current.data, metric) === null).map(
        (metric) => t.focus.unknown[metric],
      )
    : []
  const note = [
    unknown.length > 0 ? t.focus.missing(unknown) : null,
    known.length > 0 && zones.isSuccess && !familyZones ? t.focus.noZone : null,
  ].filter((sentence) => sentence !== null)

  // Every item but the first opens with a hairline; side by side with the name, the first too.
  const metaItem =
    'ml-5 flex flex-col gap-1.5 border-l border-border-strong py-0.5 pl-5 first:ml-0 first:border-l-0 first:pl-0 @min-[42rem]:first:ml-5 @min-[42rem]:first:border-l @min-[42rem]:first:pl-5'
  const metaValue = 'm-0 text-title leading-[1.15] font-light whitespace-nowrap text-fg'

  return (
    <section aria-labelledby={id} className="@container flex flex-col">
      <SectionTitle id={id}>{t.focus.title}</SectionTitle>
      <div className="flex flex-col gap-4 pt-4 pb-5 @min-[42rem]:flex-row @min-[42rem]:items-end @min-[42rem]:justify-between @min-[42rem]:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="m-0 flex flex-wrap items-baseline gap-x-2.5">
            {familyLabel ? (
              <span className="text-[11px] font-semibold tracking-[0.1em] text-accent-soft uppercase">
                {familyLabel}
              </span>
            ) : null}
            <span className="text-small text-fg-muted">
              {lastTasted === null
                ? t.focus.neverTasted
                : now - lastTasted < WEEK
                  ? t.focus.lastTasting(formatRelative(lastTasted, now), false)
                  : t.focus.lastTasting(formatDate(lastTasted), true)}
            </span>
          </p>
          <h3 className="m-0 line-clamp-2 text-[44px] leading-tight font-light tracking-tight break-words text-fg">
            <Link
              to={`/recipes/${recipe.id}`}
              className="rounded-sm transition-colors duration-150 hover:text-accent-soft"
            >
              {recipe.name}
            </Link>
          </h3>
        </div>
        <dl className="m-0 mb-1.5 flex shrink-0">
          <div className={metaItem}>
            <dt className={CAPS}>{t.focus.meta.status}</dt>
            <dd className={cn(metaValue, STATUS_TONE[recipe.status])}>
              {fr.components.display.status[recipe.status]}
            </dd>
          </div>
          <div className={metaItem}>
            <dt className={CAPS}>{t.focus.meta.version}</dt>
            <dd className={cn(metaValue, 'nums')}>{fr.components.display.version(recipe.version)}</dd>
          </div>
          <div className={metaItem}>
            <dt className={CAPS}>{t.focus.meta.rating}</dt>
            <dd className={metaValue}>
              <Rating value={lastRating(notes)} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex min-h-15 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border py-2.5">
        {known.length > 0 ? (
          <dl className="m-0 flex min-w-0 flex-1 flex-col">
            {known.map((metric) => {
              const value = metricValue(current.data, metric) ?? 0
              const reference = previousVersion === null ? null : metricValue(previous.data, metric)
              const zone = familyZones?.[metric]
              return (
                <div key={metric} className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1">
                  <dt className={CAPS}>{t.focus[metric]}</dt>
                  <dd className="nums m-0 text-heading whitespace-nowrap text-fg">
                    {formatNumber(value, DECIMALS[metric])}
                    <span className="ml-[3px] text-small text-fg-muted">{t.focus.units[metric]}</span>
                  </dd>
                  <dd className="m-0 w-[168px] shrink-0">
                    <RangeGauge
                      label={t.focus[metric]}
                      value={value}
                      decimals={DECIMALS[metric]}
                      zone={zone ? { from: zone.from, to: zone.to, count: zone.recipeIds.length } : undefined}
                      saved={
                        reference !== null && previousVersion !== null
                          ? { value: reference, version: fr.components.display.version(previousVersion) }
                          : undefined
                      }
                    />
                  </dd>
                  {zone && familyLabel ? (
                    <dd className="m-0 text-caption text-fg-muted">
                      {t.focus.zone(
                        familyLabel,
                        formatNumber(zone.from, DECIMALS[metric]),
                        formatNumber(zone.to, DECIMALS[metric]),
                      )}
                    </dd>
                  ) : null}
                </div>
              )
            })}
          </dl>
        ) : null}
        <div className={cn('flex items-center gap-2', known.length > 0 && 'ml-auto')}>
          <Button
            variant="outline"
            icon={<FlaskConical size={15} strokeWidth={1.75} aria-hidden="true" />}
            onClick={() => void navigate(`/lab/${recipe.id}`)}
          >
            {t.focus.lab}
          </Button>
          <Button
            variant="outline"
            icon={<NotebookPen size={15} strokeWidth={1.75} aria-hidden="true" />}
            onClick={() => {
              openTasting(recipe.id, recipe.version)
            }}
          >
            {t.focus.taste}
          </Button>
        </div>
      </div>
      {note.length > 0 ? (
        <p className="m-0 text-caption leading-normal text-fg-muted">
          {note.map((sentence, index) => (
            <Fragment key={sentence}>
              {index > 0 ? ' ' : null}
              <span>{sentence}</span>
            </Fragment>
          ))}
        </p>
      ) : null}
    </section>
  )
}

/** Columns of the list; the family joins them once the column is wide enough. */
const COLUMNS =
  'grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem_6.5rem_1rem] items-center gap-x-3 @min-[46rem]:grid-cols-[6.5rem_minmax(0,1fr)_8.5rem_5.75rem_7.25rem_1.25rem] @min-[46rem]:gap-x-4'
const FAMILY_CELL = 'hidden @min-[46rem]:block'

/** The creations in progress, in rows split by hairlines, as on the page Fiches. */
function InProgressSection({
  recipes,
  rating,
  activity,
  now,
}: {
  recipes: readonly RecipeSummary[]
  rating: (recipe: RecipeSummary) => number | null
  activity: (recipe: RecipeSummary) => number
  now: number
}) {
  const id = useId()
  const tc = t.inProgress.columns
  return (
    <section aria-labelledby={id} className="@container flex flex-col gap-1">
      <SectionTitle id={id} action={<ArrowLink to="/recipes">{t.inProgress.all}</ArrowLink>}>
        {t.inProgress.title}
      </SectionTitle>
      <div role="table" aria-label={t.inProgress.label}>
        <div role="rowgroup">
          <div role="row" className={cn(COLUMNS, 'h-7 border-b border-border text-caption text-fg-muted')}>
            <span role="columnheader">{tc.status}</span>
            <span role="columnheader">{tc.name}</span>
            <span role="columnheader" className={FAMILY_CELL}>
              {tc.family}
            </span>
            <span role="columnheader">{tc.rating}</span>
            <span role="columnheader" className="text-right">
              {tc.activity}
            </span>
            <span aria-hidden="true" />
          </div>
        </div>
        <div role="rowgroup" className="divide-y divide-border">
          {recipes.map((recipe) => {
            const at = activity(recipe)
            return (
              <div
                key={recipe.id}
                role="row"
                className={cn(
                  COLUMNS,
                  'relative min-h-11 py-1.5 transition-colors duration-150 hover:bg-tint/4',
                )}
              >
                <span role="cell">
                  <StatusBadge status={recipe.status} />
                </span>
                <span role="cell" className="flex min-w-0 items-baseline gap-2">
                  {/* The link covers the whole row; its own outline stays on the name. */}
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="truncate rounded-sm text-body font-medium text-fg after:absolute after:inset-0 after:content-['']"
                  >
                    {recipe.name}
                  </Link>
                  {recipe.version >= 2 ? (
                    <span className="nums shrink-0 text-caption font-semibold text-fg-muted">
                      <span aria-hidden="true">{fr.components.display.version(recipe.version)}</span>
                      <span className="sr-only">{fr.components.display.versionLong(recipe.version)}</span>
                    </span>
                  ) : null}
                </span>
                <span role="cell" className={cn(FAMILY_CELL, 'truncate text-body text-fg-secondary')}>
                  {recipe.family ? fr.recipes.families[recipe.family] : <NoValue />}
                </span>
                <span role="cell" className="text-body text-fg">
                  <Rating value={rating(recipe)} />
                </span>
                <span role="cell" className="truncate text-right text-body text-fg-secondary">
                  <time dateTime={new Date(at).toISOString()}>{formatRelative(at, now)}</time>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="justify-self-end text-fg-muted" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
