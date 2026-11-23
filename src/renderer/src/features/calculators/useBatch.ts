import { useMemo } from 'react'
import { scaleBatch, servingsForVolume, type BatchLineInput, type BatchResult } from '@core/batch'
import { dilutionFor } from '@core/dilution'
import { useCalculation, useCategories, useIngredients } from '@renderer/lib/queries'
import type { RecipeDetail } from '@shared/domain/catalog'
import type { BatchPrintOptions, ManualBatch } from '@shared/print'

export type BatchState = {
  /** False until the names and the categories are there: they say what keeps in a bottle. */
  ready: boolean
  /** Null without a target, or when nothing of the drink keeps in a bottle. */
  result: BatchResult | null
}

/** A batch written by hand has no id: it is not a recipe of the notebook. */
export function isManual(source: RecipeDetail | ManualBatch): source is ManualBatch {
  return !('id' in source)
}

/**
 * The batch of a recipe, or of lines written by hand (section 10.13), the same on screen and on
 * paper.
 */
export function useBatch(source: RecipeDetail | ManualBatch | null, options: BatchPrintOptions): BatchState {
  const ingredients = useIngredients()
  const categories = useCategories()
  const { target, amount, stepMl, water, garnish } = options
  const { equivalences, dilution } = useCalculation()

  return useMemo(() => {
    if (!source) return { ready: false, result: null }
    let lines: BatchLineInput[]
    let rate: number
    if (isManual(source)) {
      // Doses in millilitres, and where each one goes said by hand.
      lines = source.lines.map((line, index) => ({
        id: `line-${String(index)}`,
        label: line.label,
        quantity: line.ml,
        unit: 'ml',
        topEstimateMl: null,
        hint: line.hint,
        isGarnish: false,
        isOptional: false,
      }))
      rate = source.dilution
    } else {
      if (!ingredients.data || !categories.data) return { ready: false, result: null }
      const ingredientOf = new Map(ingredients.data.map((ingredient) => [ingredient.id, ingredient]))
      const hintOf = new Map(categories.data.map((category) => [category.id, category.batchHint]))
      lines = source.lines.map((line): BatchLineInput => {
        const ingredient = ingredientOf.get(line.ingredientId)
        return {
          id: line.id,
          label: ingredient?.name ?? '',
          quantity: line.quantity,
          unit: line.unit,
          topEstimateMl: line.topEstimateMl,
          hint: (ingredient ? hintOf.get(ingredient.categoryId) : undefined) ?? 'ok',
          // A dose in grams fills the bottle too, once its density is known (D-031).
          densityGPerMl: ingredient?.densityGPerMl ?? null,
          isGarnish: line.isGarnish,
          isOptional: line.isOptional,
        }
      })
      rate = dilutionFor(source, dilution)
    }
    if (amount <= 0) return { ready: true, result: null }
    const how = { dilution: rate, equivalences, includeWater: water, stepMl, includeGarnish: garnish }
    const servings = target === 'servings' ? Math.round(amount) : servingsForVolume(lines, amount, how)
    return {
      ready: true,
      result: servings !== null && servings > 0 ? scaleBatch(lines, { ...how, servings }) : null,
    }
  }, [
    source,
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
