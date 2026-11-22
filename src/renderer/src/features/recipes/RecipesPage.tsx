import { BookOpen, Lightbulb, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/EmptyState'
import { Kbd } from '@renderer/components/Kbd'
import { StatusBadge, VersionBadge } from '@renderer/components/StatusBadge'
import { VirtualTable, type VirtualTableColumn } from '@renderer/components/VirtualTable'
import { filterRecipes, isFiltered, useRecipeFilters } from '@renderer/features/recipes/filters'
import { RecipeFilterBar } from '@renderer/features/recipes/RecipeFilterBar'
import { fr } from '@renderer/i18n/fr'
import { formatNumber, formatRelative } from '@renderer/lib/format'
import { useCollections, useRecipeFacets, useRecipes } from '@renderer/lib/queries'
import { shortcutText } from '@renderer/lib/shortcuts'
import type { RecipeSummary } from '@shared/domain/catalog'

const t = fr.recipes
const tl = t.list

/** List of the recipes (section 10.4): virtualised, combinable filters, sort by name or activity. */
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
  const filtered = isFiltered(filters)
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
    filters.sort === 'rating'
      ? {
          id: 'rating',
          header: tl.columns.rating,
          width: '80px',
          numeric: true,
          cell: (row) => {
            const rating = byId?.get(row.id)?.rating
            return rating === null || rating === undefined ? (
              <span className="text-fg-muted">{tl.noRating}</span>
            ) : (
              tl.rating(formatNumber(rating, 1))
            )
          },
        }
      : {
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
    <div className="mx-auto flex h-full max-w-page flex-col gap-4">
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

      {total > 0 ? <RecipeFilterBar facets={byId} /> : null}

      {recipes.isError ? (
        <p role="alert" className="m-0 text-body text-status-danger">
          {tl.loadError}
        </p>
      ) : recipes.isPending ? null : total === 0 ? (
        <EmptyState
          icon={<BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={tl.empty.title}
          description={tl.empty.description(shortcutText('quickIdea'))}
          className="min-h-[320px] p-8"
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
            rowHeight={40}
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
