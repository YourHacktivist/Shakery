/**
 * Data of the interface, read and written through `window.shakery` with TanStack Query.
 * Every mutation invalidates the catalogue: recipes, ingredients, bottles and calculations
 * depend on each other (a renamed ingredient changes a recipe, a price changes a cost).
 */
import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { unwrap } from '@renderer/lib/ipc'
import type { IpcResult } from '@shared/ipc/result'
import type { RecipeInput } from '@shared/domain/catalog'
import type { IpcInput } from '@shared/ipc/contract'
import { CALCULATION_KEYS, calculationFrom, type CalculationSettings } from '@shared/calculation'
import { SETTING_DEFAULTS } from '@shared/settings'

/** The unit of the doses, and what an ounce is worth. */
export type DoseDisplay = { readonly unit: 'ml' | 'cl' | 'oz'; readonly ozMl: number }

/** Equivalences and dilution of the settings, for what the renderer computes itself. */
export function useCalculation(): CalculationSettings {
  const equivalences = useSetting('units.equivalences')
  const dilution = useSetting('calc.dilution')
  return useMemo(
    () => calculationFrom({ 'units.equivalences': equivalences, 'calc.dilution': dilution }),
    [equivalences, dilution],
  )
}

/** Read lazily: tests install their own `window.shakery` after the imports. */
const api = () => window.shakery

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Local IPC: an error is deterministic, retrying would only delay the message.
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export const queryKeys = {
  recipes: ['recipes'] as const,
  recipe: (id: string) => ['recipes', 'detail', id] as const,
  computation: (data: RecipeInput) => ['computation', data] as const,
  ingredients: ['ingredients'] as const,
  ingredient: (id: string) => ['ingredients', 'detail', id] as const,
  products: (ingredientId: string) => ['products', ingredientId] as const,
  categories: ['reference', 'categories'] as const,
  glasses: ['reference', 'glasses'] as const,
  iceTypes: ['reference', 'iceTypes'] as const,
}

const CATALOG_KEYS: QueryKey[] = [
  ['recipes'],
  ['ingredients'],
  ['products'],
  ['computation'],
  ['zones'],
  ['search'],
  ['tastings'],
  ['notebook'],
  ['preps'],
  ['collections'],
  ['practice'],
]

export function invalidateCatalog(client: QueryClient): Promise<void> {
  return Promise.all(CATALOG_KEYS.map((queryKey) => client.invalidateQueries({ queryKey }))).then(
    () => undefined,
  )
}

// ---------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------

/** Ctrl+K search: kept while typing so the list does not flash between two letters. */
export function useSearch(text: string) {
  const trimmed = text.trim()
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => unwrap(api().search.query({ text: trimmed, limit: 20 })),
    enabled: trimmed !== '',
    placeholderData: (previous) => previous,
    staleTime: 0,
  })
}

/** Notes of the notebook and of the journal for the palette (D-041). */
export function useNoteSearch(text: string) {
  const trimmed = text.trim()
  return useQuery({
    queryKey: ['search', 'notes', trimmed],
    queryFn: () => unwrap(api().search.notes({ text: trimmed, limit: 6 })),
    enabled: trimmed !== '',
    placeholderData: (previous) => previous,
    staleTime: 0,
  })
}

/** Remembers an opened item for the search ranking; a failure is not worth a message. */
export function recordView(entityType: 'recipe' | 'ingredient' | 'product', entityId: string) {
  void api()
    .recentViews.record({ entityType, entityId })
    .catch(() => undefined)
}

/** Reference zones by family, for the lab gauges (section 8). */
export function useReferenceZones() {
  return useQuery({ queryKey: ['zones'], queryFn: () => unwrap(api().recipes.referenceZones()) })
}

/** Snapshot of a past version of a recipe. */
export function useRecipeVersion(id: string, version: number | null) {
  return useQuery({
    queryKey: ['recipe-version', id, version],
    queryFn: () => unwrap(api().recipes.getVersion({ id, version: version ?? 1 })),
    enabled: version !== null,
    staleTime: Infinity,
  })
}

export function useTastings(filter: { recipeId?: string; toRetest?: boolean } = {}) {
  return useQuery({
    queryKey: ['tastings', filter],
    queryFn: () => unwrap(api().tastingNotes.list(filter)),
  })
}

export function usePreps() {
  return useQuery({ queryKey: ['preps'], queryFn: () => unwrap(api().preps.list()) })
}

/** Not part of the versions of a recipe, so not part of its detail (D-045). */
export function useRecipePhoto(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', 'photo', id],
    queryFn: () => unwrap(api().photos.get({ owner: 'recipe', id: id ?? '' })),
    enabled: id !== undefined,
  })
}

/** Under the key of the recipes: refreshed with them. */
export function useRecipeFacets() {
  return useQuery({ queryKey: ['recipes', 'facets'], queryFn: () => unwrap(api().recipes.facets()) })
}

export function useCollections() {
  return useQuery({ queryKey: ['collections'], queryFn: () => unwrap(api().collections.list()) })
}

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ['collections', 'detail', id],
    queryFn: () => unwrap(api().collections.get({ id: id ?? '' })),
    enabled: id !== null && id !== '',
  })
}

/** Data of a collection for the question generators, read again for every session. */
export function usePracticeCorpus(id: string | null) {
  return useQuery({
    queryKey: ['practice', 'corpus', id],
    queryFn: () => unwrap(api().practice.corpus({ id: id ?? '' })),
    enabled: id !== null && id !== '',
    staleTime: 0,
  })
}

export function usePracticeHistory() {
  return useQuery({ queryKey: ['practice', 'history'], queryFn: () => unwrap(api().practice.history()) })
}

export function useWeakKeys() {
  return useQuery({ queryKey: ['practice', 'weak'], queryFn: () => unwrap(api().practice.weakKeys()) })
}

export function useNotebook() {
  return useQuery({ queryKey: ['notebook'], queryFn: () => unwrap(api().notebook.list()) })
}

export function useRecipes() {
  return useQuery({ queryKey: queryKeys.recipes, queryFn: () => unwrap(api().recipes.list()) })
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recipe(id ?? ''),
    queryFn: () => unwrap(api().recipes.get({ id: id ?? '' })),
    enabled: id !== undefined && id !== '',
  })
}

/** Calculated panel of a saved recipe or of a draft; null while there is nothing to compute. */
export function useRecipeComputation(data: RecipeInput | null) {
  return useQuery({
    queryKey: queryKeys.computation(data ?? { name: '' }),
    queryFn: () => unwrap(api().recipes.compute({ data: data ?? { name: '' } })),
    enabled: data !== null,
    placeholderData: keepPreviousData,
  })
}

export function useIngredients() {
  return useQuery({ queryKey: queryKeys.ingredients, queryFn: () => unwrap(api().ingredients.list()) })
}

export function useIngredient(id: string | null) {
  return useQuery({
    queryKey: queryKeys.ingredient(id ?? ''),
    queryFn: () => unwrap(api().ingredients.get({ id: id ?? '' })),
    enabled: id !== null && id !== '',
  })
}

export function useProducts(ingredientId: string | null) {
  return useQuery({
    queryKey: queryKeys.products(ingredientId ?? ''),
    queryFn: () => unwrap(api().products.listByIngredient({ ingredientId: ingredientId ?? '' })),
    enabled: ingredientId !== null && ingredientId !== '',
  })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => unwrap(api().reference.listCategories()),
  })
}

export function useGlasses() {
  return useQuery({ queryKey: queryKeys.glasses, queryFn: () => unwrap(api().reference.listGlasses()) })
}

export function useIceTypes() {
  return useQuery({ queryKey: queryKeys.iceTypes, queryFn: () => unwrap(api().reference.listIceTypes()) })
}

// ---------------------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------------------

/** A mutation on the catalogue: unwraps the IPC result, then refreshes every catalogue query. */
function useCatalogMutation<Input, Output>(call: (input: Input) => Promise<IpcResult<Output>>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Input) => unwrap(call(input)),
    onSuccess: () => invalidateCatalog(client),
  })
}

type Api = Window['shakery']
type InputOf<F> = F extends (input: infer I) => unknown ? I : never
type OutputOf<F> = F extends (...args: never[]) => Promise<IpcResult<infer O>> ? O : never

/** Builds a mutation hook for one operation of `window.shakery`. */
function mutationOf<D extends keyof Api, O extends keyof Api[D]>(domain: D, operation: O) {
  type Call = Api[D][O]
  return function useOperation() {
    return useCatalogMutation<InputOf<Call>, OutputOf<Call>>((input) => {
      const call = api()[domain][operation] as (input: InputOf<Call>) => Promise<IpcResult<OutputOf<Call>>>
      return call(input)
    })
  }
}

export const useQuickIdea = mutationOf('recipes', 'quickIdea')
export const useCreateRecipe = mutationOf('recipes', 'create')
export const useUpdateRecipe = mutationOf('recipes', 'update')
export const useSetRecipeStatus = mutationOf('recipes', 'setStatus')
export const useSetRecipeFavorite = mutationOf('recipes', 'setFavorite')
export const useCreateVariant = mutationOf('recipes', 'createVariant')
export const useDeleteRecipe = mutationOf('recipes', 'delete')
export const useRestoreRecipe = mutationOf('recipes', 'restore')

export const useCreateTasting = mutationOf('tastingNotes', 'create')
export const useUpdateTasting = mutationOf('tastingNotes', 'update')
export const useSetNextStepDone = mutationOf('tastingNotes', 'setNextStepDone')
export const useDeleteTasting = mutationOf('tastingNotes', 'delete')
export const useCreateEntry = mutationOf('notebook', 'create')
export const useUpdateEntry = mutationOf('notebook', 'update')
export const useDeleteEntry = mutationOf('notebook', 'delete')

export const useSetPhoto = mutationOf('photos', 'set')
export const useRestorePhoto = mutationOf('photos', 'restore')

export const useCreateBatch = mutationOf('batches', 'create')
export const useSetBatchStatus = mutationOf('batches', 'setStatus')
export const useDeleteBatch = mutationOf('batches', 'delete')
export const useCreateCollection = mutationOf('collections', 'create')
export const useUpdateCollection = mutationOf('collections', 'update')
export const useDeleteCollection = mutationOf('collections', 'delete')
export const useRestoreCollection = mutationOf('collections', 'restore')
export const useAddToCollection = mutationOf('collections', 'addRecipes')
export const useUpdateCollectionItem = mutationOf('collections', 'updateItem')
export const useRemoveCollectionItem = mutationOf('collections', 'removeItem')
export const useRestoreCollectionItem = mutationOf('collections', 'restoreItem')
export const useReorderCollection = mutationOf('collections', 'reorder')
export const useFinishPractice = mutationOf('practice', 'finish')

/** Saves the PDF of a collection; false when the user closed the save dialog. */
export function exportCollectionPdf(id: string): Promise<boolean> {
  return unwrap(api().collections.exportPdf({ id }))
}

export const useCreateIngredient = mutationOf('ingredients', 'create')
export const useUpdateIngredient = mutationOf('ingredients', 'update')
export const useMergeIngredients = mutationOf('ingredients', 'merge')
export const useDeleteIngredient = mutationOf('ingredients', 'delete')

export const useCreateProduct = mutationOf('products', 'create')
export const useUpdateProduct = mutationOf('products', 'update')
export const useSetProductOwned = mutationOf('products', 'setOwned')
export const useDeleteProduct = mutationOf('products', 'delete')

/**
 * Undo of a deletion, called from a toast once the screen that deleted is gone: a plain call
 * rather than a hook, then the same refresh as the mutations.
 */
export async function restoreRecipe(client: QueryClient, id: string) {
  const recipe = await unwrap(api().recipes.restore({ id }))
  await invalidateCatalog(client)
  return recipe
}

// ---------------------------------------------------------------------------------------------
// Settings (section 10.14)
// ---------------------------------------------------------------------------------------------

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => unwrap(api().settings.getAll()) })
}

/** One setting, with its default while the settings load. */
export function useSetting<K extends keyof typeof SETTING_DEFAULTS>(key: K): (typeof SETTING_DEFAULTS)[K] {
  const settings = useSettings()
  return settings.data?.[key] ?? SETTING_DEFAULTS[key]
}

export function useSetSetting() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: IpcInput<'settings.set'>) => unwrap(api().settings.set(change)),
    onSuccess: (_done, change) =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['settings'] }),
        client.invalidateQueries({ queryKey: ['off'] }),
        // Every figure follows a new equivalence or dilution.
        ...(CALCULATION_KEYS.some((key) => key === change.key) ? [invalidateCatalog(client)] : []),
      ]),
  })
}

/** Unit in which the doses are shown (section 10.15). */
export function useDisplayUnit(): DoseDisplay {
  const unit = useSetting('display.unit')
  const { ozMl } = useSetting('units.equivalences')
  return useMemo(() => ({ unit, ozMl }), [unit, ozMl])
}
