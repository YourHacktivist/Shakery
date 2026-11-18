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
import { unwrap } from '@renderer/lib/ipc'
import type { IpcResult } from '@shared/ipc/result'
import type { RecipeInput } from '@shared/domain/catalog'

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

const CATALOG_KEYS: QueryKey[] = [['recipes'], ['ingredients'], ['products'], ['computation']]

export function invalidateCatalog(client: QueryClient): Promise<void> {
  return Promise.all(CATALOG_KEYS.map((queryKey) => client.invalidateQueries({ queryKey }))).then(
    () => undefined,
  )
}

// ---------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------

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
