import { ArrowUpDown } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/Button'
import { FilterPill, type FilterOption } from '@renderer/components/FilterPill'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import {
  isFiltered,
  useRecipeFilters,
  type FilterData,
  type Sort,
  type View,
} from '@renderer/features/recipes/filters'
import { fr } from '@renderer/i18n/fr'
import { useCategories, useCollections, useGlasses } from '@renderer/lib/queries'
import { ALLERGEN_CODES } from '@shared/domain/allergens'
import { FAMILY_VALUES, METHOD_VALUES, ORIGIN_VALUES, STATUS_VALUES } from '@shared/domain/catalog'
import { NO_SPIRIT } from '@shared/domain/facets'

const t = fr.recipes
const tl = t.list.filters

const statusOptions = STATUS_VALUES.map((value) => ({ value, label: fr.components.display.status[value] }))
const familyOptions = FAMILY_VALUES.map((value) => ({ value, label: t.families[value] }))
const originOptions = ORIGIN_VALUES.map((value) => ({ value, label: t.origins[value] }))
const methodOptions = METHOD_VALUES.map((value) => ({ value, label: t.methods[value] }))
const allergenOptions = ALLERGEN_CODES.map((value) => ({
  value,
  label: tl.without(fr.components.display.allergens[value]),
}))

/** A filter fills its cell of the grid: name on the left, chevron on the right. */
const CELL = 'min-w-0 justify-between'
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

function byLabel(options: FilterOption<string>[]): FilterOption<string>[] {
  return options.sort((a, b) => collator.compare(a.label, b.label))
}

/** Every filter of section 10.4 and the sort; one without any choice is greyed, so the grid holds. */
export function RecipeFilterBar({ facets }: Pick<FilterData, 'facets'>) {
  const filters = useRecipeFilters()
  const categories = useCategories()
  const glasses = useGlasses()
  const collections = useCollections()

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

  return (
    <>
      <div role="group" aria-label={tl.label} className="@container flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl<View>
            label={tl.view}
            value={filters.view}
            onChange={(view) => {
              filters.set({ view })
            }}
            options={[
              { value: 'all', label: tl.all },
              { value: 'favorites', label: tl.favorites },
              { value: 'makeable', label: tl.makeable },
            ]}
          />
          {isFiltered(filters) ? (
            <Button variant="ghost" size="sm" onClick={filters.reset}>
              {tl.reset}
            </Button>
          ) : null}
        </div>
        {/* Twelve cells, always, the sort taking two: two rows of six, three of four, or one, never a pill alone. */}
        <div className="grid grid-cols-4 gap-2 @min-[62rem]:grid-cols-6 @min-[105rem]:grid-cols-12">
          <FilterPill
            className={CELL}
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
            className={CELL}
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
            className={CELL}
            multiple
            label={tl.origin}
            allLabel={tl.allOrigins}
            options={originOptions}
            value={filters.origins}
            onChange={(origins) => {
              filters.set({ origins })
            }}
          />
          <FilterPill
            className={CELL}
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
            className={CELL}
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
          <FilterPill
            className={CELL}
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
            className={CELL}
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
            className={CELL}
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
            className={CELL}
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
            className={CELL}
            multiple
            label={tl.allergen}
            allLabel={tl.allAllergens}
            options={allergenOptions}
            value={filters.without}
            onChange={(without) => {
              filters.set({ without })
            }}
          />
          <FilterPill<Sort>
            className={`${CELL} col-span-2`}
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
      </div>
      {filters.without.length > 0 ? (
        <p role="note" className="m-0 text-caption text-fg-secondary">
          {tl.allergenWarning}
        </p>
      ) : null}
    </>
  )
}
