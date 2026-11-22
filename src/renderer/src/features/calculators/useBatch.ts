import { useMemo } from 'react'
import { scaleBatch, servingsForVolume, type BatchLineInput, type BatchResult } from '@core/batch'
import { dilutionFor } from '@core/dilution'
import { useCalculation, useCategories, useIngredients } from '@renderer/lib/queries'
import type { RecipeDetail } from '@shared/domain/catalog'
import type { BatchPrintOptions } from '@shared/print'

export type BatchState = {
  /** False until the names and the categories are there: they say what keeps in a bottle. */
  ready: boolean
  /** Null without a target, or when nothing of the drink keeps in a bottle. */
  result: BatchResult | null
}

/** The batch of a recipe, the same on screen and on paper. */
export function useBatch(recipe: RecipeDetail | null, options: BatchPrintOptions): BatchState {
  const ingredients = useIngredients()
  const categories = useCategories()
  const { target, amount, stepMl, water, garnish } = options
  const { equivalences, dilution } = useCalculation()

  return useMemo(() => {
    if (!recipe || !ingredients.data || !categories.data) return { ready: false, result: null }
    if (amount <= 0) return { ready: true, result: null }
    const ingredientOf = new Map(ingredients.data.map((ingredient) => [ingredient.id, ingredient]))
    const hintOf = new Map(categories.data.map((category) => [category.id, category.batchHint]))
    const lines = recipe.lines.map((line): BatchLineInput => {
      const ingredient = ingredientOf.get(line.ingredientId)
      return {
        id: line.id,
        label: ingredient?.name ?? '',
        quantity: line.quantity,
        unit: line.unit,
        topEstimateMl: line.topEstimateMl,
        hint: (ingredient ? hintOf.get(ingredient.categoryId) : undefined) ?? 'ok',
        isGarnish: line.isGarnish,
        isOptional: line.isOptional,
      }
    })
    const how = {
      dilution: dilutionFor(recipe, dilution),
      equivalences,
      includeWater: water,
      stepMl,
      includeGarnish: garnish,
    }
    const servings = target === 'servings' ? Math.round(amount) : servingsForVolume(lines, amount, how)
    return {
      ready: true,
      result: servings !== null && servings > 0 ? scaleBatch(lines, { ...how, servings }) : null,
    }
  }, [
    recipe,
    ingredients.data,
    categories.data,
    target,
    amount,
    stepMl,
    water,
    garnish,
    dilution,
    equivalences,
  ])
}
