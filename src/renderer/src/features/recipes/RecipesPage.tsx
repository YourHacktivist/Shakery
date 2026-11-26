import { ArrowRight, Lightbulb, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/EmptyState'
import { Kbd } from '@renderer/components/Kbd'
import { NoValue } from '@renderer/components/NoValue'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { VirtualTable, type VirtualTableColumn } from '@renderer/components/VirtualTable'
import {
  countByOrigin,
  filterRecipes,
  isFiltered,
  useRecipeFilters,
} from '@renderer/features/recipes/filters'
import { RecipeFilterBar } from '@renderer/features/recipes/RecipeFilterBar'
import { fr } from '@renderer/i18n/fr'
import { formatNumber, formatRelative } from '@renderer/lib/format'
import { useCollections, useRecipeFacets, useRecipes } from '@renderer/lib/queries'
import { shortcutText } from '@renderer/lib/shortcuts'
import type { RecipeSummary } from '@shared/domain/catalog'

const t = fr.recipes
const tl = t.list
const display = fr.components.display

/** List of the recipes (section 10.4, D-057): creations first, the classics in their own view. */
export function RecipesPage() {
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const recipes = useRecipes()
  const facets = useRecipeFacets()
  const collections = useCollections()
  const filters = useRecipeFilters()
  const all = recipes.data
  const byId = useMemo(
    () => (facets.data ? new Map(facets.data.map((facet) => [facet.id, facet])) : undefined),
    [facets.data],
  )
  const rows = useMemo(
    () => filterRecipes(all ?? [], filters, { facets: byId, collections: collections.data }),
    [all, filters, byId, collections.data],
  )
  const counts = useMemo(() => countByOrigin(all ?? []), [all])
  const filtered = isFiltered(filters)
  // What the view holds before the filters: the total of « 3 sur 6 fiches ».
  const inView = useMemo(
    () => (filtered ? filterRecipes(all ?? [], { view: filters.view }).length : rows.length),
    [all, filtered, filters.view, rows.length],
  )
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
          {/* The version only once the recipe has moved on: a column of « v1 » said nothing. */}
          {row.version > 1 ? (
            <span className="nums shrink-0 text-caption font-semibold text-fg-muted">
              <span aria-hidden="true">{display.version(row.version)}</span>
              <span className="sr-only">{`, ${display.versionLong(row.version)}`}</span>
            </span>
          ) : null}
          {row.kind === 'prep' ? (
            <span className="shrink-0 text-caption text-fg-muted">{t.kinds.prep}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'family',
      header: tl.columns.family,
      width: 'minmax(0, 1fr)',
      cell: (row) => (row.family ? t.families[row.family] : <NoValue />),
    },
    ...(filters.sort === 'rating'
      ? [
          {
            id: 'rating',
            header: tl.columns.rating,
            width: '80px',
            numeric: true,
            cell: (row: RecipeSummary) => {
              const rating = byId?.get(row.id)?.rating
              return rating === null || rating === undefined ? (
                <span className="text-fg-muted">{tl.noRating}</span>
              ) : (
                tl.rating(formatNumber(rating, 1))
              )
            },
          },
        ]
      : []),
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
  const quickIdea = shortcutText('quickIdea')
  const view = filters.view
  const emptyView =
    view === 'mine' || view === 'all'
      ? { title: tl.emptyView.mine.title, description: tl.emptyView.mine.description(quickIdea) }
      : tl.emptyView[view]

  return (
    <div className="mx-auto flex h-full max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">
            {filtered ? tl.shown(rows.length, inView) : tl.count(total)}
          </span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{tl.title}</h1>
        </div>
        {/* The one solid button of the screen; Idée rapide lives in the top bar (D-057). */}
        <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => void navigate('/recipes/new')}>
          {tl.newRecipe}
          <Kbd tone="onAccent">{shortcutText('newRecipe')}</Kbd>
        </Button>
      </header>

      {total > 0 ? <RecipeFilterBar facets={byId} counts={counts} /> : null}

      {recipes.isError ? (
        <p role="alert" className="m-0 text-body text-status-danger">
          {tl.loadError}
        </p>
      ) : recipes.isPending ? null : total === 0 ? (
        <EmptyState
          title={tl.empty.title}
          description={tl.empty.description(quickIdea)}
          className="min-h-[320px] p-8"
          action={
            <Button
              variant="outline"
              icon={<Lightbulb size={16} aria-hidden="true" />}
              onClick={() => {
                openOverlay('quickIdea')
              }}
            >
              {tl.quickIdea}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex min-h-0 flex-col">
            <VirtualTable
              bare
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              label={tl.tableLabel}
              rowHeight={44}
              onOpen={(row) => void navigate(`/recipes/${row.id}`)}
              empty={
                filtered ? (
                  <EmptyState
                    title={tl.noMatch.title}
                    description={tl.noMatch.description}
                    className="min-h-[240px]"
                    action={
                      <Button variant="outline" size="sm" onClick={filters.reset}>
                        {tl.filters.reset}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    title={emptyView.title}
                    description={emptyView.description}
                    className="min-h-[240px]"
                    action={
                      view === 'mine' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            filters.set({ view: 'classics' })
                          }}
                        >
                          {tl.browseClassics}
                        </Button>
                      ) : undefined
                    }
                  />
                )
              }
            />
            {view === 'mine' && rows.length > 0 && counts.classics > 0 ? (
              <p className="m-0 flex items-center justify-between gap-4 pt-3.5">
                <span className="text-caption text-fg-muted">{tl.classicsNote}</span>
                <button
                  type="button"
                  className="group/link inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm text-small font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
                  onClick={() => {
                    filters.set({ view: 'classics' })
                  }}
                >
                  {tl.browseClassics}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform duration-150 group-hover/link:translate-x-0.5"
                  />
                </button>
              </p>
            ) : null}
          </div>
          <p className="m-0 mt-auto text-caption text-fg-muted">{tl.openHint}</p>
        </>
      )}
    </div>
  )
}
