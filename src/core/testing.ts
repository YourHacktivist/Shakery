/**
 * In-memory notebook for the tests of core/: builds a FactsResolver from plain objects.
 * Pure, without any dependency, so it can also serve the future phone app's tests.
 */
import type { FactsResolver, IngredientFacts, LineInput, ProductFacts, RecipeInput } from './model'

export function ingredient(id: string, facts: Partial<IngredientFacts> = {}): IngredientFacts {
  return {
    id,
    abv: null,
    sugarGPerL: null,
    acidGPerL: null,
    compositionConfidence: null,
    allergens: [],
    prepRecipeId: null,
    isStaple: false,
    ...facts,
  }
}

export function product(id: string, ingredientId: string, facts: Partial<ProductFacts> = {}): ProductFacts {
  return {
    id,
    ingredientId,
    abv: null,
    volumeMl: null,
    sugarGPerL: null,
    acidGPerL: null,
    purchasePriceCents: null,
    purchasePriceBasis: null,
    packQuantity: null,
    packUnit: null,
    owned: false,
    allergens: [],
    ...facts,
  }
}

export function line(
  id: string,
  ingredientId: string,
  quantity: number | null,
  unit: LineInput['unit'] = 'ml',
  extra: Partial<LineInput> = {},
): LineInput {
  return {
    id,
    ingredientId,
    preferredProductId: null,
    quantity,
    unit,
    topEstimateMl: null,
    isOptional: false,
    isGarnish: false,
    ...extra,
  }
}

export function recipe(id: string, lines: LineInput[], extra: Partial<RecipeInput> = {}): RecipeInput {
  return {
    id,
    kind: 'cocktail',
    method: 'stir',
    dilutionOverridePct: null,
    yieldMl: null,
    garnishCostHtCents: null,
    lines,
    ...extra,
  }
}

export function resolver(data: {
  ingredients?: IngredientFacts[]
  products?: ProductFacts[]
  recipes?: RecipeInput[]
}): FactsResolver {
  const ingredients = new Map((data.ingredients ?? []).map((i) => [i.id, i]))
  const products = new Map((data.products ?? []).map((p) => [p.id, p]))
  const recipes = new Map((data.recipes ?? []).map((r) => [r.id, r]))
  return {
    ingredient: (id) => ingredients.get(id),
    product: (id) => products.get(id),
    recipe: (id) => recipes.get(id),
    productsOfIngredient: (id) => [...products.values()].filter((p) => p.ingredientId === id),
  }
}
