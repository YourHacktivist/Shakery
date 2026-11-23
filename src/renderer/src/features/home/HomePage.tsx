import { ArrowRight, ArrowUpRight, FlaskConical, Info, NotebookPen, Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { FilterPill } from '@renderer/components/FilterPill'
import { HeroCard, heroSecondaryActionClass } from '@renderer/components/HeroCard'
import { Kbd } from '@renderer/components/Kbd'
import { RangeGauge } from '@renderer/components/RangeGauge'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Sparkline } from '@renderer/components/Sparkline'
import { StatTile } from '@renderer/components/StatTile'
import { StatusBadge, VersionBadge } from '@renderer/components/StatusBadge'
import { detailToInput } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber, formatRelative } from '@renderer/lib/format'
import {
  useRecipe,
  useRecipeComputation,
  useRecipeVersion,
  useRecipes,
  useReferenceZones,
  useTastings,
} from '@renderer/lib/queries'
import { FAMILY_VALUES, type RecipeSummary } from '@shared/domain/catalog'
import type { TastingNote } from '@shared/domain/journal'

type View = 'current' | 'favorites'
type FamilyFilter = 'all' | (typeof FAMILY_VALUES)[number]

const t = fr.home
const IN_PROGRESS = new Set(['idea', 'draft', 'testing'])
const METRICS = ['abv', 'sugar', 'acid', 'ratio'] as const

/** Mean overall rating of each tasted version, oldest first. */
function ratingsByVersion(notes: readonly TastingNote[]): Array<{ version: number; mean: number }> {
  const byVersion = new Map<number, number[]>()
  for (const note of notes) {
    if (note.overall === null) continue
    byVersion.set(note.recipeVersion, [...(byVersion.get(note.recipeVersion) ?? []), note.overall])
  }
  return [...byVersion.entries()]
    .sort(([a], [b]) => a - b)
    .map(([version, values]) => ({ version, mean: values.reduce((sum, v) => sum + v, 0) / values.length }))
}

/**
 * Home screen (section 10.3): « où en sont mes créations ? ». Three creations by last
 * activity with their rating curve, the hero card, and the creation in focus with its
 * indicators against the reference zone of its family. Every block has its empty state.
 */
export function HomePage() {
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const recipes = useRecipes()
  const tastings = useTastings()
  const [view, setView] = useState<View>('current')
  const [family, setFamily] = useState<FamilyFilter>('all')

  const notesByRecipe = useMemo(() => {
    const map = new Map<string, TastingNote[]>()
    for (const note of tastings.data ?? []) map.set(note.recipeId, [...(map.get(note.recipeId) ?? []), note])
    return map
  }, [tastings.data])

  const activity = (recipe: RecipeSummary) =>
    Math.max(recipe.updatedAt, ...(notesByRecipe.get(recipe.id) ?? []).map((note) => note.tastedAt))

  const cocktails = (recipes.data ?? []).filter((recipe) => recipe.kind === 'cocktail')
  const inProgress = cocktails.filter((recipe) => IN_PROGRESS.has(recipe.status))
  const pool = view === 'current' ? inProgress : cocktails.filter((recipe) => recipe.isFavorite)
  const shown = pool
    .filter((recipe) => family === 'all' || recipe.family === family)
    .sort((a, b) => activity(b) - activity(a))
    .slice(0, 3)
  const focus =
    [...inProgress].sort((a, b) => activity(b) - activity(a)).find((recipe) => recipe.status === 'testing') ??
    [...inProgress].sort((a, b) => activity(b) - activity(a))[0]

  const hero = (
    <HeroCard
      title={t.hero.title}
      description={t.hero.description}
      actions={
        <>
          <Button
            className="w-full"
            icon={<FlaskConical size={16} aria-hidden="true" />}
            onClick={() => void navigate('/lab')}
          >
            {t.hero.openLab}
          </Button>
          <Button
            variant="outline"
            className={cn('w-full', heroSecondaryActionClass)}
            onClick={() => {
              openOverlay('quickIdea')
            }}
          >
            {t.hero.noteIdea}
          </Button>
        </>
      }
    />
  )

  if (recipes.isPending) return null
  const empty = inProgress.length === 0 && view === 'current'

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">
            {view === 'current' ? t.count(inProgress.length) : t.favoritesCount(pool.length)}
          </span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl<View>
            label={t.viewsLabel}
            value={view}
            onChange={setView}
            options={[
              { value: 'current', label: t.views.current },
              { value: 'favorites', label: t.views.favorites },
            ]}
          />
          <FilterPill<FamilyFilter>
            label={t.families}
            align="end"
            value={family}
            onChange={setFamily}
            options={[
              { value: 'all', label: t.allFamilies },
              ...FAMILY_VALUES.map((value) => ({ value, label: fr.recipes.families[value] })),
            ]}
          />
        </div>
      </header>

      {empty ? (
        <div className="grid grid-cols-[minmax(0,1fr)_356px] gap-4">
          <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border-strong bg-bg-base/90 px-5 py-14 text-center">
            <h2 className="m-0 text-heading font-normal text-fg">{t.empty.title}</h2>
            <p className="m-0 max-w-md text-body leading-relaxed text-fg-secondary">{t.empty.description}</p>
            <div className="mt-3 flex flex-col items-center gap-3">
              <Button
                icon={<Plus size={16} aria-hidden="true" />}
                onClick={() => {
                  openOverlay('quickIdea')
                }}
              >
                {t.empty.firstIdea}
                <Kbd tone="onAccent">Ctrl N</Kbd>
              </Button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-body font-semibold text-accent-soft hover:text-accent"
                onClick={() => void navigate('/recipes')}
              >
                {t.empty.classics}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {hero}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_300px] gap-4">
          {shown.map((recipe, index) => (
            <div key={recipe.id} className="animate-rise" style={{ '--rise-index': index } as CSSProperties}>
              <CreationCard recipe={recipe} notes={notesByRecipe.get(recipe.id) ?? []} />
            </div>
          ))}
          {shown.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-bg-base/90 p-8 text-center">
              <span className="text-body font-semibold text-fg">
                {view === 'favorites' && pool.length === 0 ? t.noFavorite.title : t.noMatch}
              </span>
              {view === 'favorites' && pool.length === 0 ? (
                <span className="text-small text-fg-secondary">{t.noFavorite.description}</span>
              ) : null}
            </div>
          ) : (
            Array.from({ length: 3 - shown.length }, (_, index) => (
              <button
                key={`slot-${String(index)}`}
                type="button"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-bg-base/90 text-small font-semibold text-fg-muted transition-colors duration-150 hover:border-accent/50 hover:text-accent-soft"
                onClick={() => {
                  openOverlay('quickIdea')
                }}
              >
                <Plus size={18} aria-hidden="true" />
                {t.hero.noteIdea}
              </button>
            ))
          )}
          {hero}
        </div>
      )}

      {focus ? (
        <FocusPanel recipeId={focus.id} notes={notesByRecipe.get(focus.id) ?? []} />
      ) : (
        <Card className="gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-small text-fg-muted">{t.focus.eyebrow}</span>
            <p className="m-0 text-body text-fg">{t.focus.empty}</p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {METRICS.map((metric) => (
              <StatTile
                key={metric}
                label={t.focus[metric]}
                value={null}
                unit={t.focus.units[metric]}
                gauge={<RangeGauge label={t.focus[metric]} value={null} />}
              />
            ))}
          </div>
          <p className="m-0 flex items-center gap-2 text-small text-fg-muted">
            <Info size={14} aria-hidden="true" />
            {t.focus.zoneNote}
          </p>
        </Card>
      )}
    </div>
  )
}

/** One creation: status, name, last rating in large figures, change and curve over versions. */
function CreationCard({ recipe, notes }: { recipe: RecipeSummary; notes: readonly TastingNote[] }) {
  const ratings = ratingsByVersion(notes)
  const last = ratings.at(-1)
  const previous = ratings.at(-2)
  return (
    <Card
      as="article"
      className="group/card h-full gap-3 transition-[border-color,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong"
    >
      <div className="flex items-center gap-2">
        <StatusBadge status={recipe.status} />
        <VersionBadge version={recipe.version} />
        <Link
          to={`/recipes/${recipe.id}`}
          aria-label={t.card.open(recipe.name)}
          className="ml-auto flex size-8 items-center justify-center rounded-field border border-border-strong text-fg-secondary transition-colors duration-150 group-hover/card:border-accent/50 group-hover/card:text-accent"
        >
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="m-0 line-clamp-2 text-lead font-semibold break-words text-fg">{recipe.name}</h2>
        <span className="text-caption text-fg-muted">
          {recipe.family ? fr.recipes.families[recipe.family] : ' '}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-fg-muted">{t.card.lastRating}</span>
        {last ? (
          <>
            <span className="nums flex items-baseline gap-1">
              <span className="text-display leading-none font-light text-fg">
                {formatNumber(last.mean, 1)}
              </span>
              <span className="text-small text-fg-muted">{t.card.outOf}</span>
            </span>
            {previous ? (
              <span
                className={cn(
                  'nums text-caption font-semibold',
                  last.mean >= previous.mean ? 'text-status-ok' : 'text-status-danger',
                )}
              >
                {`${last.mean >= previous.mean ? '▲' : '▼'} ${formatNumber(last.mean - previous.mean, 1)} vs v${String(previous.version)}`}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-body text-fg-secondary">{t.card.noRating}</span>
        )}
      </div>
      {ratings.length >= 2 ? (
        <Sparkline
          values={ratings.map((rating) => rating.mean)}
          label={t.card.curve}
          min={1}
          max={5}
          height={64}
          className="mt-auto"
          formatValue={(value) => formatNumber(value, 1)}
        />
      ) : null}
    </Card>
  )
}

/** The creation in focus: its indicators against the family zone and its next step. */
function FocusPanel({ recipeId, notes }: { recipeId: string; notes: readonly TastingNote[] }) {
  const navigate = useNavigate()
  const openTasting = useOverlayStore((state) => state.openTasting)
  const recipe = useRecipe(recipeId)
  const zones = useReferenceZones()
  const detail = recipe.data
  const current = useRecipeComputation(detail ? detailToInput(detail) : null)
  const previousVersion = detail && detail.version > 1 ? detail.version - 1 : null
  const previousDetail = useRecipeVersion(recipeId, previousVersion)
  const previous = useRecipeComputation(previousDetail.data ? detailToInput(previousDetail.data) : null)
  if (!detail) return null

  const familyZones = detail.family ? zones.data?.[detail.family] : undefined
  const familyLabel = detail.family ? fr.recipes.families[detail.family] : null
  const lastNote = [...notes].sort((a, b) => b.tastedAt - a.tastedAt)[0]
  const step = [...notes]
    .sort((a, b) => b.tastedAt - a.tastedAt)
    .find((note) => note.nextStep !== null && !note.nextStepDone)
  const values = {
    abv: current.data?.abv.value ?? null,
    sugar: current.data?.sugarPer100Ml.value ?? null,
    acid: current.data?.acidPer100Ml.value ?? null,
    ratio: current.data?.ratio.value ?? null,
  }
  const before = previousVersion
    ? {
        abv: previous.data?.abv.value ?? null,
        sugar: previous.data?.sugarPer100Ml.value ?? null,
        acid: previous.data?.acidPer100Ml.value ?? null,
        ratio: previous.data?.ratio.value ?? null,
      }
    : null
  const decimals = { abv: 1, sugar: 1, acid: 1, ratio: 0 }

  return (
    <Card className="animate-rise gap-5 p-6" style={{ '--rise-index': 3 } as CSSProperties}>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-small text-fg-muted">
            {`${t.focus.eyebrow} · ${lastNote ? t.focus.lastTasting(formatRelative(lastNote.tastedAt)) : t.focus.neverTasted}`}
          </span>
          <h2 className="m-0 line-clamp-2 text-[44px] leading-tight break-words font-light tracking-tight text-fg">
            {detail.name}
          </h2>
          <div className="flex items-center gap-2">
            <StatusBadge status={detail.status} />
            <VersionBadge version={detail.version} />
            {familyLabel ? <span className="text-small text-fg-secondary">{familyLabel}</span> : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<FlaskConical size={16} aria-hidden="true" />}
              onClick={() => void navigate(`/lab/${detail.id}`)}
            >
              {t.focus.lab}
            </Button>
            <Button
              variant="outline"
              icon={<NotebookPen size={16} aria-hidden="true" />}
              onClick={() => {
                openTasting(detail.id, detail.version)
              }}
            >
              {t.focus.taste}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-nested border border-border bg-surface-2 p-4">
          <span className="flex items-center gap-1.5 text-caption font-medium text-fg-muted">
            <ArrowRight size={13} aria-hidden="true" className="text-accent" />
            {t.focus.nextStep}
          </span>
          {step?.nextStep ? (
            <>
              <p className="m-0 text-lead leading-snug text-fg">{step.nextStep}</p>
              <span className="mt-auto text-caption text-fg-muted">
                {t.focus.nextStepFrom(step.recipeVersion)}
              </span>
            </>
          ) : (
            <p className="m-0 text-small text-fg-secondary">{t.focus.noNextStep}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const value = values[metric]
          const reference = before?.[metric] ?? null
          const zone = familyZones?.[metric]
          return (
            <StatTile
              key={metric}
              label={t.focus[metric]}
              value={value}
              decimals={decimals[metric]}
              unit={t.focus.units[metric]}
              deltaPlacement="top"
              deltaTone="neutral"
              delta={
                value !== null && reference !== null && previousVersion !== null
                  ? {
                      value: value - reference,
                      reference: `v${String(previousVersion)}`,
                      decimals: decimals[metric],
                    }
                  : undefined
              }
              gauge={
                <RangeGauge
                  label={t.focus[metric]}
                  value={value}
                  decimals={decimals[metric]}
                  zone={zone ? { from: zone.from, to: zone.to, count: zone.recipeIds.length } : undefined}
                  saved={
                    reference !== null && previousVersion !== null
                      ? { value: reference, version: `v${String(previousVersion)}` }
                      : undefined
                  }
                />
              }
            >
              {zone && familyLabel ? (
                <span className="text-caption text-fg-muted">
                  {t.focus.zone(
                    familyLabel,
                    formatNumber(zone.from, decimals[metric]),
                    formatNumber(zone.to, decimals[metric]),
                  )}
                </span>
              ) : null}
            </StatTile>
          )
        })}
      </div>
      {familyZones ? null : (
        <p className="m-0 flex items-center gap-2 text-small text-fg-muted">
          <Info size={14} aria-hidden="true" />
          {t.focus.zoneNote}
        </p>
      )}
    </Card>
  )
}
