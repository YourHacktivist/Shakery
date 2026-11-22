/** Filters and sort of the list of recipes (section 10.4, D-040). */
import { create } from 'zustand'
import type { AllergenCode } from '@shared/domain/allergens'
import type { RecipeSummary } from '@shared/domain/catalog'
import type { RecipeFacets } from '@shared/domain/facets'

export type View = 'all' | 'favorites' | 'makeable'
export type Sort = 'activity' | 'name' | 'rating'

export type FilterValues = {
  statuses: Array<RecipeSummary['status']>
  families: Array<NonNullable<RecipeSummary['family']>>
  origins: Array<RecipeSummary['origin']>
  methods: Array<NonNullable<RecipeSummary['method']>>
  spirits: string[]
  glasses: string[]
  collections: string[]
  tags: string[]
  flavors: string[]
  /** Allergens the recipes must not contain. */
  without: AllergenCode[]
  view: View
  sort: Sort
}

type RecipeFilters = FilterValues & {
  set: (patch: Partial<FilterValues>) => void
  reset: () => void
}

export const DEFAULT_FILTERS: FilterValues = {
  statuses: [],
  families: [],
  origins: [],
  methods: [],
  spirits: [],
  glasses: [],
  collections: [],
  tags: [],
  flavors: [],
  without: [],
  view: 'all',
  sort: 'activity',
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

export function isFiltered(filters: FilterValues): boolean {
  return (
    filters.view !== 'all' || Object.values(filters).some((value) => Array.isArray(value) && value.length > 0)
  )
}

/** What the filters read beside the summaries; absent while it loads. */
export type FilterData = {
  facets?: ReadonlyMap<string, RecipeFacets> | undefined
  collections?: ReadonlyArray<{ id: string; recipeIds: readonly string[] }> | undefined
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/**
 * Recipes kept by the filters, in the chosen order. Filters of different kinds combine, the
 * choices of one filter widen it, except « without », where each allergen narrows. A recipe
 * whose allergens are not known is never shown as « without ».
 */
export function filterRecipes(
  recipes: readonly RecipeSummary[],
  chosen: Partial<FilterValues>,
  data: FilterData = {},
): RecipeSummary[] {
  const filters = { ...DEFAULT_FILTERS, ...chosen }
  const { facets } = data
  const any = (wanted: readonly string[], values: readonly (string | null | undefined)[]) =>
    wanted.length === 0 || values.some((value) => value && wanted.includes(value))
  const collected =
    filters.collections.length === 0
      ? null
      : new Set(
          (data.collections ?? [])
            .filter((collection) => filters.collections.includes(collection.id))
            .flatMap((collection) => collection.recipeIds),
        )

  const kept = recipes.filter((recipe) => {
    if (filters.view === 'favorites' && !recipe.isFavorite) return false
    if (filters.view === 'makeable' && recipe.missingIngredientIds.length > 0) return false
    if (!any(filters.statuses, [recipe.status]) || !any(filters.families, [recipe.family])) return false
    if (!any(filters.origins, [recipe.origin]) || !any(filters.methods, [recipe.method])) return false
    if (collected && !collected.has(recipe.id)) return false
    const facet = facets?.get(recipe.id)
    if (!any(filters.spirits, [facet?.spirit]) || !any(filters.glasses, [facet?.glassId])) return false
    if (!any(filters.tags, facet?.tags ?? []) || !any(filters.flavors, facet?.flavors ?? [])) return false
    if (filters.without.length > 0) {
      if (!facet || facet.allergensUnknown) return false
      if (filters.without.some((code) => facet.allergens.includes(code))) return false
    }
    return true
  })

  const byName = (a: RecipeSummary, b: RecipeSummary) => collator.compare(a.name, b.name)
  // The classics were all loaded at the same moment: same time, then alphabetical.
  const byActivity = (a: RecipeSummary, b: RecipeSummary) => b.updatedAt - a.updatedAt || byName(a, b)
  if (filters.sort === 'name') return kept.sort(byName)
  if (filters.sort === 'activity') return kept.sort(byActivity)
  const grade = (recipe: RecipeSummary) => facets?.get(recipe.id)?.rating ?? 0
  return kept.sort((a, b) => grade(b) - grade(a) || byActivity(a, b))
}
