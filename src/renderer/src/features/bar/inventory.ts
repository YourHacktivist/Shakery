import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { notifyError } from '@renderer/features/shared/notify'
import { unwrap } from '@renderer/lib/ipc'
import { queryKeys, useCreateProduct, useSetProductOwned } from '@renderer/lib/queries'
import type { IngredientInventory } from '@shared/domain/catalog'

/** Under the ingredients: every change of the catalogue refreshes it with them. */
export const INVENTORY_KEY = ['ingredients', 'inventory'] as const

/** Ingredients with an owned bottle, and the number of recipes using each one (D-057). */
export function useInventory() {
  const query = useQuery({
    queryKey: INVENTORY_KEY,
    queryFn: () => unwrap(window.shakery.ingredients.inventory()),
  })
  return useMemo(
    () => ({
      ready: query.isSuccess,
      owned: new Set(query.data?.owned ?? []),
      usage: new Map((query.data?.usage ?? []).map((entry) => [entry.id, entry.count])),
    }),
    [query.data, query.isSuccess],
  )
}

/**
 * « Au bar » in one click, from the list or from the detail of an ingredient: checked, its first
 * bottle becomes owned, or a bottle named after the ingredient is created; unchecked, none of its
 * bottles stays owned. The box follows at once, the catalogue once the bottles are written.
 */
export function useSetIngredientOwned() {
  const client = useQueryClient()
  const setOwned = useSetProductOwned()
  const createProduct = useCreateProduct()
  return async (ingredientId: string, name: string, owned: boolean) => {
    client.setQueryData<IngredientInventory>(INVENTORY_KEY, (current) =>
      current
        ? {
            ...current,
            owned: owned
              ? [...current.owned.filter((id) => id !== ingredientId), ingredientId]
              : current.owned.filter((id) => id !== ingredientId),
          }
        : current,
    )
    try {
      const bottles = await client.query({
        queryKey: queryKeys.products(ingredientId),
        queryFn: () => unwrap(window.shakery.products.listByIngredient({ ingredientId })),
      })
      const first = bottles[0]
      if (!owned) {
        await Promise.all(
          bottles
            .filter((bottle) => bottle.owned)
            .map((bottle) => setOwned.mutateAsync({ id: bottle.id, owned: false })),
        )
      } else if (first) {
        await setOwned.mutateAsync({ id: first.id, owned: true })
      } else {
        await createProduct.mutateAsync({ ingredientId, name, owned: true })
      }
    } catch (error) {
      notifyError(error)
      void client.invalidateQueries({ queryKey: INVENTORY_KEY })
    }
  }
}
