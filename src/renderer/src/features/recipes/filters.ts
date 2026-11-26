/** Filters and sort of the list of recipes (section 10.4, D-040, D-057). */
import { create } from 'zustand'
import type { AllergenCode } from '@shared/domain/allergens'
import type { RecipeSummary } from '@shared/domain/catalog'
import type { RecipeFacets } from '@shared/domain/facets'

/**
 * What the list shows before any filter: the recipes of the user (every origin but the classics),
 * the classics, the favourites or what the bar can make. `all` is every recipe, for the code only.
 */
export type View = 'mine' | 'classics' | 'favorites' | 'makeable' | 'all'
export type Sort = 'activity' | 'name' | 'rating'

export type FilterValues = {
  statuses: Array<RecipeSummary['status']>
  families: Array<NonNullable<RecipeSummary['family']>>
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

/** The filters behind « Plus de filtres », in their order on screen. */
export const MORE_FILTERS = ['methods', 'glasses', 'flavors', 'collections', 'tags', 'without'] as const

type RecipeFilters = FilterValues & {
  /** The row of the other filters is open. */
  showMore: boolean
  set: (patch: Partial<FilterValues & { showMore: boolean }>) => void
  /** Empties every filter; the view, the sort and the open row stay. */
  reset: () => void
}

export const DEFAULT_FILTERS: FilterValues = {
  statuses: [],
  families: [],
  methods: [],
  spirits: [],
  glasses: [],
  collections: [],
  tags: [],
  flavors: [],
  without: [],
  view: 'mine',
  sort: 'activity',
}

/** Filters of the list, kept while the user opens a recipe and comes back. */
export const useRecipeFilters = create<RecipeFilters>()((set) => ({
  ...DEFAULT_FILTERS,
  showMore: false,
  set: (patch) => {
    set(patch)
  },
  reset: () => {
    set(({ view, sort }) => ({ ...DEFAULT_FILTERS, view, sort }))
  },
}))

/** One filter at least narrows the list; the view and the sort are not filters. */
export function isFiltered(filters: FilterValues): boolean {
  return Object.values(filters).some((value) => Array.isArray(value) && value.length > 0)
}

/** How many of the filters behind « Plus de filtres » act. */
export function activeMoreFilters(filters: FilterValues): number {
  return MORE_FILTERS.filter((key) => filters[key].length > 0).length
}

/** A classic comes with Shakery; every other origin is a creation of the user. */
export function isClassic(recipe: Pick<RecipeSummary, 'origin'>): boolean {
  return recipe.origin === 'classic'
}

/** Number of creations and of classics, for the choices of the view. */
export function countByOrigin(recipes: readonly RecipeSummary[]): { mine: number; classics: number } {
  const classics = recipes.filter(isClassic).length
  return { mine: recipes.length - classics, classics }
}

/** What the filters read beside the summaries; absent while it loads. */
export type FilterData = {
  facets?: ReadonlyMap<string, RecipeFacets> | undefined
  collections?: ReadonlyArray<{ id: string; recipeIds: readonly string[] }> | undefined
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

function inView(recipe: RecipeSummary, view: View): boolean {
  switch (view) {
    case 'mine':
      return !isClassic(recipe)
    case 'classics':
      return isClassic(recipe)
    case 'favorites':
      return recipe.isFavorite
    case 'makeable':
      return recipe.missingIngredientIds.length === 0
    case 'all':
      return true
  }
}

/**
 * Recipes kept by the view and the filters, in the chosen order. Filters of different kinds
 * combine, the choices of one filter widen it, except « without », where each allergen narrows.
 * A recipe whose allergens are not known is never shown as « without ».
 */
export function filterRecipes(
  recipes: readonly RecipeSummary[],
  chosen: Partial<FilterValues>,
  data: FilterData = {},
): RecipeSummary[] {
  const filters = { ...DEFAULT_FILTERS, view: 'all' as View, ...chosen }
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
    if (!inView(recipe, filters.view)) return false
    if (!any(filters.statuses, [recipe.status]) || !any(filters.families, [recipe.family])) return false
    if (!any(filters.methods, [recipe.method])) return false
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
