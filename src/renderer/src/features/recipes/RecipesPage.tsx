import { BookOpen, Lightbulb, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { create } from 'zustand'
import { useOverlayStore } from '@renderer/app/stores'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/EmptyState'
import { FilterPill } from '@renderer/components/FilterPill'
import { Kbd } from '@renderer/components/Kbd'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { StatusBadge, VersionBadge } from '@renderer/components/StatusBadge'
import { VirtualTable, type VirtualTableColumn } from '@renderer/components/VirtualTable'
import { fr } from '@renderer/i18n/fr'
import { formatRelative } from '@renderer/lib/format'
import { useRecipes } from '@renderer/lib/queries'
import { shortcutText } from '@renderer/lib/shortcuts'
import { FAMILY_VALUES, ORIGIN_VALUES, STATUS_VALUES, type RecipeSummary } from '@shared/domain/catalog'

const t = fr.recipes
const tl = t.list

type Status = RecipeSummary['status']
type Family = NonNullable<RecipeSummary['family']>
type Origin = RecipeSummary['origin']
type View = 'all' | 'favorites'
type Sort = 'activity' | 'name'

type RecipeFilters = {
  statuses: Status[]
  families: Family[]
  origins: Origin[]
  view: View
  sort: Sort
  set: (patch: Partial<Omit<RecipeFilters, 'set' | 'reset'>>) => void
  reset: () => void
}

const DEFAULT_FILTERS = {
  statuses: [] as Status[],
  families: [] as Family[],
  origins: [] as Origin[],
  view: 'all' as View,
  sort: 'activity' as Sort,
}

/** Filters of the list, kept while the user opens a recipe and comes back. */
export const useRecipeFilters = create<RecipeFilters>()((set) => ({
  ...DEFAULT_FILTERS,
  set: (patch) => {
    set(patch)
  },
  reset: () => {
    set(DEFAULT_FILTERS)
  },
}))

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/** Recipes kept by the filters, in the chosen order. Filters of different kinds combine. */
export function filterRecipes(
  recipes: readonly RecipeSummary[],
  filters: Pick<RecipeFilters, 'statuses' | 'families' | 'origins' | 'view' | 'sort'>,
): RecipeSummary[] {
  const kept = recipes.filter(
    (recipe) =>
      (filters.statuses.length === 0 || filters.statuses.includes(recipe.status)) &&
      (filters.families.length === 0 ||
        (recipe.family !== null && filters.families.includes(recipe.family))) &&
      (filters.origins.length === 0 || filters.origins.includes(recipe.origin)) &&
      (filters.view === 'all' || recipe.isFavorite),
  )
  return kept.sort((a, b) =>
    filters.sort === 'name' ? collator.compare(a.name, b.name) : b.updatedAt - a.updatedAt,
  )
}

const statusOptions = STATUS_VALUES.map((value) => ({ value, label: fr.components.display.status[value] }))
const familyOptions = FAMILY_VALUES.map((value) => ({ value, label: t.families[value] }))
const originOptions = ORIGIN_VALUES.map((value) => ({ value, label: t.origins[value] }))

/** List of the recipes (section 10.4): virtualised, combinable filters, sort by name or activity. */
export function RecipesPage() {
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const recipes = useRecipes()
  const filters = useRecipeFilters()
  const all = recipes.data
  const rows = useMemo(() => filterRecipes(all ?? [], filters), [all, filters])
  const filtered =
    filters.statuses.length > 0 ||
    filters.families.length > 0 ||
    filters.origins.length > 0 ||
    filters.view === 'favorites'
  // Relative times are computed once per visit of the list: no timer while idle.
  const [now] = useState(() => Date.now())

  const columns: VirtualTableColumn<RecipeSummary>[] = [
    {
      id: 'status',
      header: tl.columns.status,
      width: '112px',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'name',
      header: tl.columns.name,
      width: 'minmax(0, 2.4fr)',
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-fg">{row.name}</span>
          {row.isFavorite ? (
            <>
              <Star size={14} aria-hidden="true" className="shrink-0 fill-accent text-accent" />
              <span className="sr-only">{tl.favorite}</span>
            </>
          ) : null}
          {row.kind === 'prep' ? (
            <span className="shrink-0 rounded-full border border-border-strong px-2 text-caption text-fg-muted">
              {t.kinds.prep}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'family',
      header: tl.columns.family,
      width: 'minmax(0, 1fr)',
      cell: (row) =>
        row.family ? t.families[row.family] : <span className="text-fg-muted">{tl.noFamily}</span>,
    },
    {
      id: 'version',
      header: tl.columns.version,
      width: '80px',
      cell: (row) => <VersionBadge version={row.version} />,
    },
    {
      id: 'activity',
      header: tl.columns.activity,
      width: '160px',
      numeric: true,
      cell: (row) => (
        <time dateTime={new Date(row.updatedAt).toISOString()}>{formatRelative(row.updatedAt, now)}</time>
      ),
    },
  ]

  const total = all?.length ?? 0

  return (
    <div className="mx-auto flex h-full max-w-[1120px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">
            {filtered ? tl.shown(rows.length, total) : tl.count(total)}
          </span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{tl.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Lightbulb size={16} aria-hidden="true" />}
            onClick={() => {
              openOverlay('quickIdea')
            }}
          >
            {tl.quickIdea}
          </Button>
          <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => void navigate('/recipes/new')}>
            {tl.newRecipe}
            <Kbd tone="onAccent">{shortcutText('newRecipe')}</Kbd>
          </Button>
        </div>
      </header>

      {total > 0 ? (
        <div role="group" aria-label={tl.filters.label} className="flex flex-wrap items-center gap-2">
          <SegmentedControl<View>
            label={tl.filters.view}
            value={filters.view}
            onChange={(view) => {
              filters.set({ view })
            }}
            options={[
              { value: 'all', label: tl.filters.all },
              { value: 'favorites', label: tl.filters.favorites },
            ]}
          />
          <FilterPill
            multiple
            label={tl.filters.status}
            allLabel={tl.filters.allStatuses}
            options={statusOptions}
            value={filters.statuses}
            onChange={(statuses) => {
              filters.set({ statuses })
            }}
          />
          <FilterPill
            multiple
            label={tl.filters.family}
            allLabel={tl.filters.allFamilies}
            options={familyOptions}
            value={filters.families}
            onChange={(families) => {
              filters.set({ families })
            }}
          />
          <FilterPill
            multiple
            label={tl.filters.origin}
            allLabel={tl.filters.allOrigins}
            options={originOptions}
            value={filters.origins}
            onChange={(origins) => {
              filters.set({ origins })
            }}
          />
          {filtered ? (
            <Button variant="ghost" size="sm" onClick={filters.reset}>
              {tl.filters.reset}
            </Button>
          ) : null}
          <FilterPill<Sort>
            className="ml-auto"
            align="end"
            label={tl.filters.sort}
            options={[
              { value: 'activity', label: tl.filters.sortActivity },
              { value: 'name', label: tl.filters.sortName },
            ]}
            value={filters.sort}
            onChange={(sort) => {
              filters.set({ sort })
            }}
          />
        </div>
      ) : null}

      {recipes.isError ? (
        <p role="alert" className="m-0 text-body text-status-danger">
          {tl.loadError}
        </p>
      ) : recipes.isPending ? null : total === 0 ? (
        <EmptyState
          icon={<BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={tl.empty.title}
          description={tl.empty.description(shortcutText('quickIdea'))}
          className="min-h-[320px] p-10"
          action={
            <div className="flex items-center gap-3">
              <Button
                icon={<Lightbulb size={16} aria-hidden="true" />}
                onClick={() => {
                  openOverlay('quickIdea')
                }}
              >
                {tl.quickIdea}
              </Button>
              <Button variant="outline" onClick={() => void navigate('/recipes/new')}>
                {tl.newRecipe}
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <VirtualTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            label={tl.tableLabel}
            rowHeight={56}
            onOpen={(row) => void navigate(`/recipes/${row.id}`)}
            className="min-h-[320px] flex-1"
            empty={
              <EmptyState
                title={tl.noMatch.title}
                description={tl.noMatch.description}
                className="min-h-[240px] flex-1"
                action={
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    {tl.filters.reset}
                  </Button>
                }
              />
            }
          />
          <p className="m-0 text-caption text-fg-muted">{tl.openHint}</p>
        </>
      )}
    </div>
  )
}
