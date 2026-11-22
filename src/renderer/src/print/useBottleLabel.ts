import { useMemo } from 'react'
import { detailToInput } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { usePreps, useRecipe, useRecipeComputation } from '@renderer/lib/queries'
import type { BottleLabelData } from '@renderer/print/BottleLabel'

/** What the label of a batch says, or null until all of it is there. */
export function useBottleLabel(
  recipeId: string,
  batchId: string,
  withAllergens: boolean,
): BottleLabelData | null {
  const preps = usePreps()
  const recipe = useRecipe(recipeId)
  const input = useMemo(
    () => (recipe.data && recipe.data.lines.length > 0 ? detailToInput(recipe.data) : null),
    [recipe.data],
  )
  const computation = useRecipeComputation(input)

  return useMemo(() => {
    const prep = preps.data?.find((item) => item.recipeId === recipeId)
    const batch = prep?.batches.find((item) => item.id === batchId)
    if (!prep || !batch || !recipe.data) return null
    // Never a label without its allergens because they were still being calculated.
    if (withAllergens && input !== null && !computation.data) return null
    const codes = computation.data
      ? [...new Set([...computation.data.allergens, ...computation.data.optionalAllergens])]
      : []
    return {
      name: prep.name,
      madeAt: batch.madeAt,
      bestBefore: batch.bestBefore,
      quantityMl: batch.quantityMl,
      allergens: withAllergens ? codes.map((code) => fr.components.display.allergens[code]) : null,
    }
  }, [preps.data, recipe.data, recipeId, batchId, withAllergens, input, computation.data])
}
