import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Button } from '@renderer/components/Button'
import { FilterPill, type FilterOption } from '@renderer/components/FilterPill'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import {
  activeMoreFilters,
  isFiltered,
  MORE_FILTERS,
  useRecipeFilters,
  type FilterData,
  type Sort,
  type View,
} from '@renderer/features/recipes/filters'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'
import { useCategories, useCollections, useGlasses } from '@renderer/lib/queries'
import { ALLERGEN_CODES } from '@shared/domain/allergens'
import { FAMILY_VALUES, METHOD_VALUES, STATUS_VALUES } from '@shared/domain/catalog'
import { NO_SPIRIT } from '@shared/domain/facets'

const t = fr.recipes
const tl = t.list.filters

const statusOptions = STATUS_VALUES.map((value) => ({ value, label: fr.components.display.status[value] }))
const familyOptions = FAMILY_VALUES.map((value) => ({ value, label: t.families[value] }))
const methodOptions = METHOD_VALUES.map((value) => ({ value, label: t.methods[value] }))
const allergenOptions = ALLERGEN_CODES.map((value) => ({
  value,
  label: tl.without(fr.components.display.allergens[value]),
}))

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

function byLabel(options: FilterOption<string>[]): FilterOption<string>[] {
  return options.sort((a, b) => collator.compare(a.label, b.label))
}

type RecipeFilterBarProps = Pick<FilterData, 'facets'> & {
  /** Creations and classics in the whole notebook, shown beside their choice. */
  counts: { mine: number; classics: number }
}

/**
 * The view (creations, classics, favourites, makeable), three filters in sight, the others
 * behind « Plus de filtres », and the sort on the right (section 10.4, D-057).
 */
export function RecipeFilterBar({ facets, counts }: RecipeFilterBarProps) {
  const filters = useRecipeFilters()
  const categories = useCategories()
  const glasses = useGlasses()
  const collections = useCollections()
  const moreId = useId()

  // Only what some recipe has: an option never leads to an empty list by itself.
  const present = useMemo(() => {
    const spirits = new Set<string>()
    const glassIds = new Set<string>()
    const tags = new Set<string>()
    const flavors = new Set<string>()
    let rated = false
    for (const facet of facets?.values() ?? []) {
      spirits.add(facet.spirit)
      if (facet.glassId) glassIds.add(facet.glassId)
      for (const tag of facet.tags) tags.add(tag)
      for (const flavor of facet.flavors) flavors.add(flavor)
      rated ||= facet.rating !== null
    }
    return { spirits, glassIds, tags, flavors, rated }
  }, [facets])

  const spiritOptions = useMemo(() => {
    const options = byLabel(
      (categories.data ?? [])
        .filter((category) => present.spirits.has(category.id))
        .map((category) => ({ value: category.id, label: category.name })),
    )
    if (present.spirits.has(NO_SPIRIT)) options.push({ value: NO_SPIRIT, label: tl.noSpirit })
    return options
  }, [categories.data, present.spirits])
  const glassOptions = useMemo(
    () =>
      byLabel(
        (glasses.data ?? [])
          .filter((glass) => present.glassIds.has(glass.id))
          .map((glass) => ({ value: glass.id, label: glass.name })),
      ),
    [glasses.data, present.glassIds],
  )
  const collectionOptions = useMemo(
    () =>
      byLabel(
        (collections.data ?? []).map((collection) => ({ value: collection.id, label: collection.name })),
      ),
    [collections.data],
  )
  const flavorOptions = useMemo(
    () => byLabel([...present.flavors].map((value) => ({ value, label: value }))),
    [present.flavors],
  )
  const tagOptions = useMemo(
    () => byLabel([...present.tags].map((value) => ({ value, label: value }))),
    [present.tags],
  )
  const sortOptions: FilterOption<Sort>[] = [
    { value: 'activity', label: tl.sortActivity },
    { value: 'name', label: tl.sortName },
    ...(present.rated || filters.sort === 'rating'
      ? [{ value: 'rating' as const, label: tl.sortRating }]
      : []),
  ]

  const activeMore = activeMoreFilters(filters)

  return (
    <>
      <div role="group" aria-label={tl.label} className="flex flex-col gap-3">
        <SegmentedControl<View>
          label={tl.view}
          value={filters.view}
          onChange={(view) => {
            filters.set({ view })
          }}
          options={[
            { value: 'mine', label: tl.mine, count: formatNumber(counts.mine, 0) },
            { value: 'classics', label: tl.classics, count: formatNumber(counts.classics, 0) },
            { value: 'favorites', label: tl.favorites },
            { value: 'makeable', label: tl.makeable },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            multiple
            label={tl.status}
            allLabel={tl.allStatuses}
            options={statusOptions}
            value={filters.statuses}
            onChange={(statuses) => {
              filters.set({ statuses })
            }}
          />
          <FilterPill
            multiple
            label={tl.family}
            allLabel={tl.allFamilies}
            options={familyOptions}
            value={filters.families}
            onChange={(families) => {
              filters.set({ families })
            }}
          />
          <FilterPill
            disabled={spiritOptions.length === 0 && filters.spirits.length === 0}
            multiple
            label={tl.spirit}
            allLabel={tl.allSpirits}
            options={spiritOptions}
            value={filters.spirits}
            onChange={(spirits) => {
              filters.set({ spirits })
            }}
          />
          <button
            type="button"
            aria-expanded={filters.showMore}
            aria-controls={filters.showMore ? moreId : undefined}
            aria-label={tl.moreName(MORE_FILTERS.length, activeMore)}
            className={cn(
              'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-3 text-caption font-medium whitespace-nowrap transition-colors duration-150 ease-out-soft select-none hover:text-fg aria-expanded:text-fg',
              activeMore > 0 ? 'text-fg' : 'text-fg-secondary',
            )}
            onClick={() => {
              filters.set({ showMore: !filters.showMore })
            }}
          >
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{tl.more}</span>
            <span
              aria-hidden="true"
              className={cn('nums', activeMore > 0 ? 'font-semibold text-accent-soft' : 'text-fg-muted')}
            >
              {activeMore > 0 ? activeMore : MORE_FILTERS.length}
            </span>
          </button>
          {isFiltered(filters) ? (
            <Button variant="ghost" size="sm" onClick={filters.reset}>
              {tl.reset}
            </Button>
          ) : null}
          <FilterPill<Sort>
            className="ml-auto"
            align="end"
            lead={<ArrowUpDown size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />}
            label={tl.sort}
            options={sortOptions}
            value={filters.sort}
            onChange={(sort) => {
              filters.set({ sort })
            }}
          />
        </div>
        {filters.showMore ? (
          <div
            id={moreId}
            role="group"
            aria-label={tl.moreGroup}
            className="flex flex-wrap items-center gap-2"
          >
            <FilterPill
              multiple
              label={tl.method}
              allLabel={tl.allMethods}
              options={methodOptions}
              value={filters.methods}
              onChange={(methods) => {
                filters.set({ methods })
              }}
            />
            <FilterPill
              disabled={glassOptions.length === 0 && filters.glasses.length === 0}
              multiple
              label={tl.glass}
              allLabel={tl.allGlasses}
              options={glassOptions}
              value={filters.glasses}
              onChange={(values) => {
                filters.set({ glasses: values })
              }}
            />
            <FilterPill
              disabled={flavorOptions.length === 0 && filters.flavors.length === 0}
              multiple
              label={tl.flavor}
              allLabel={tl.allFlavors}
              options={flavorOptions}
              value={filters.flavors}
              onChange={(flavors) => {
                filters.set({ flavors })
              }}
            />
            <FilterPill
              disabled={collectionOptions.length === 0 && filters.collections.length === 0}
              multiple
              label={tl.collection}
              allLabel={tl.allCollections}
              options={collectionOptions}
              value={filters.collections}
              onChange={(values) => {
                filters.set({ collections: values })
              }}
            />
            <FilterPill
              disabled={tagOptions.length === 0 && filters.tags.length === 0}
              multiple
              label={tl.tag}
              allLabel={tl.allTags}
              options={tagOptions}
              value={filters.tags}
              onChange={(tags) => {
                filters.set({ tags })
              }}
            />
            <FilterPill
              multiple
              label={tl.allergen}
              allLabel={tl.allAllergens}
              options={allergenOptions}
              value={filters.without}
              onChange={(without) => {
                filters.set({ without })
              }}
            />
          </div>
        ) : null}
      </div>
      {filters.without.length > 0 ? (
        <p role="note" className="m-0 text-caption text-fg-secondary">
          {tl.allergenWarning}
        </p>
      ) : null}
    </>
  )
}
