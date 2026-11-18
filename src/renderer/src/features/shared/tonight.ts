import { useMemo } from 'react'
import { unlockers } from '@core/availability'
import { useIngredients, useRecipes } from '@renderer/lib/queries'

export type Unlocker = {
  readonly ingredientId: string
  readonly name: string
  readonly recipes: ReadonlyArray<{ readonly id: string; readonly name: string }>
}

/**
 * What the bar allows tonight (sections 10.3 and 10.8): cocktails that can be made, and the
 * ingredients that would unlock the most cocktails, each being the only one missing.
 */
export function useTonight(): { ready: boolean; makeable: number; unlockers: Unlocker[] } {
  const recipes = useRecipes()
  const ingredients = useIngredients()
  return useMemo(() => {
    const cocktails = (recipes.data ?? []).filter((recipe) => recipe.kind === 'cocktail')
    const names = new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name]))
    const recipeNames = new Map(cocktails.map((recipe) => [recipe.id, recipe.name]))
    return {
      ready: recipes.isSuccess && ingredients.isSuccess,
      makeable: cocktails.filter((recipe) => recipe.missingIngredientIds.length === 0).length,
      unlockers: unlockers(
        cocktails.map((recipe) => ({ id: recipe.id, missing: recipe.missingIngredientIds })),
      )
        .filter((entry) => names.has(entry.ingredientId))
        .map((entry) => ({
          ingredientId: entry.ingredientId,
          name: names.get(entry.ingredientId) ?? '',
          recipes: entry.recipeIds.map((id) => ({ id, name: recipeNames.get(id) ?? '' })),
        })),
    }
  }, [recipes.data, recipes.isSuccess, ingredients.data, ingredients.isSuccess])
}
