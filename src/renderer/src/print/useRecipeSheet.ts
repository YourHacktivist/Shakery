import { useMemo, useState } from 'react'
import { detailToInput } from '@renderer/features/recipes/model'
import {
  useDisplayUnit,
  useGlasses,
  useIceTypes,
  useIngredients,
  useRecipe,
  useRecipeComputation,
  useSettings,
} from '@renderer/lib/queries'
import type { RecipeSheetProps } from '@renderer/print/RecipeSheet'

/** Everything a sheet shows, or null until all of it is there: nothing prints half filled. */
export function useRecipeSheet(
  id: string,
): Omit<RecipeSheetProps, 'indicators' | 'paper' | 'preview'> | null {
  const recipe = useRecipe(id)
  const ingredients = useIngredients()
  const glasses = useGlasses()
  const iceTypes = useIceTypes()
  const settings = useSettings()
  const display = useDisplayUnit()
  const [printedAt] = useState(() => Date.now())
  const input = useMemo(
    () => (recipe.data && recipe.data.lines.length > 0 ? detailToInput(recipe.data) : null),
    [recipe.data],
  )
  const computation = useRecipeComputation(input)
  const names = useMemo(
    () => new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients.data],
  )

  const loaded = recipe.data && ingredients.isSuccess && glasses.isSuccess && iceTypes.isSuccess
  if (!loaded || settings.isPending || (input !== null && computation.isPending)) return null
  return {
    recipe: recipe.data,
    names,
    glass: glasses.data.find((glass) => glass.id === recipe.data.glassId)?.name ?? null,
    ice: iceTypes.data.find((ice) => ice.id === recipe.data.iceId)?.name ?? null,
    computation: input === null ? null : (computation.data ?? null),
    display,
    printedAt,
  }
}
