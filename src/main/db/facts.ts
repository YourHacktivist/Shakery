/**
 * Builds the inputs of core/ from the database, and computes the panel of a recipe or of an
 * unsaved draft (section 10.4). Rows are read lazily and cached for one computation.
 */
import { and, asc, eq, isNull } from 'drizzle-orm'
import { recipeAllergens } from '../../core/allergens'
import { computeComposition, type Metric } from '../../core/composition'
import { recipeCost } from '../../core/cost'
import type { DilutionRates } from '../../core/dilution'
import type {
  FactsResolver,
  IngredientFacts,
  ProductFacts,
  RecipeInput as CoreRecipe,
} from '../../core/model'
import type { UnitEquivalences } from '../../core/units'
import type { AllergenCode } from '../../shared/domain/allergens'
import type { RecipeComputation, RecipeInputParsed } from '../../shared/domain/catalog'
import type { Db } from './client'
import { ingredients, products, recipeLines, recipes } from './schema'

type ProductRow = typeof products.$inferSelect

function productFacts(row: ProductRow): ProductFacts {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    abv: row.abv,
    volumeMl: row.volumeMl,
    sugarGPerL: row.sugarGPerL,
    acidGPerL: row.acidGPerL,
    purchasePriceCents: row.purchasePriceCents,
    purchasePriceBasis: row.purchasePriceBasis,
    packQuantity: row.packQuantity,
    packUnit: row.packUnit,
    owned: row.owned,
    allergens: row.allergens as AllergenCode[],
  }
}

export function databaseResolver(db: Db): FactsResolver {
  const ingredientCache = new Map<string, IngredientFacts | undefined>()
  const productCache = new Map<string, ProductFacts | undefined>()
  const recipeCache = new Map<string, CoreRecipe | undefined>()
  const byIngredient = new Map<string, ProductFacts[]>()

  return {
    ingredient(id) {
      if (!ingredientCache.has(id)) {
        const row = db
          .select()
          .from(ingredients)
          .where(and(eq(ingredients.id, id), isNull(ingredients.deletedAt)))
          .get()
        ingredientCache.set(
          id,
          row && {
            id: row.id,
            abv: row.defaultAbv,
            sugarGPerL: row.sugarGPerL,
            acidGPerL: row.acidGPerL,
            compositionConfidence: row.compositionConfidence,
            densityGPerMl: row.densityGPerMl,
            allergens: row.allergens as AllergenCode[],
            prepRecipeId: row.prepRecipeId,
            isStaple: row.isStaple,
          },
        )
      }
      return ingredientCache.get(id)
    },
    product(id) {
      if (!productCache.has(id)) {
        const row = db
          .select()
          .from(products)
          .where(and(eq(products.id, id), isNull(products.deletedAt)))
          .get()
        productCache.set(id, row && productFacts(row))
      }
      return productCache.get(id)
    },
    recipe(id) {
      if (!recipeCache.has(id)) {
        const row = db
          .select()
          .from(recipes)
          .where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
          .get()
        if (!row) {
          recipeCache.set(id, undefined)
        } else {
          const lines = db
            .select()
            .from(recipeLines)
            .where(and(eq(recipeLines.recipeId, id), isNull(recipeLines.deletedAt)))
            .orderBy(asc(recipeLines.sortOrder))
            .all()
          recipeCache.set(id, {
            id: row.id,
            kind: row.kind,
            method: row.method,
            dilutionOverridePct: row.dilutionOverridePct,
            yieldMl: row.yieldMl,
            garnishCostHtCents: row.garnishCostHtCents,
            lines: lines.map((l) => ({
              id: l.id,
              ingredientId: l.ingredientId,
              preferredProductId: l.preferredProductId,
              quantity: l.quantity,
              unit: l.unit,
              topEstimateMl: l.topEstimateMl,
              isOptional: l.isOptional,
              isGarnish: l.isGarnish,
            })),
          })
        }
      }
      return recipeCache.get(id)
    },
    productsOfIngredient(ingredientId) {
      let list = byIngredient.get(ingredientId)
      if (!list) {
        list = db
          .select()
          .from(products)
          .where(and(eq(products.ingredientId, ingredientId), isNull(products.deletedAt)))
          .all()
          .map(productFacts)
        byIngredient.set(ingredientId, list)
      }
      return list
    },
  }
}

export type ComputeSettings = {
  readonly equivalences?: UnitEquivalences
  readonly dilution?: DilutionRates
}

/** Panel of a recipe, saved (by id) or not yet saved (a draft from the editor or the lab). */
export function computeRecipe(
  db: Db,
  recipe: {
    id: string
    data: Pick<
      RecipeInputParsed,
      'kind' | 'method' | 'dilutionOverridePct' | 'yieldMl' | 'garnishCostHtCents' | 'lines'
    >
  },
  settings: ComputeSettings = {},
): RecipeComputation {
  const resolver = databaseResolver(db)
  const input: CoreRecipe = {
    id: recipe.id,
    kind: recipe.data.kind,
    method: recipe.data.method,
    dilutionOverridePct: recipe.data.dilutionOverridePct,
    yieldMl: recipe.data.yieldMl,
    garnishCostHtCents: recipe.data.garnishCostHtCents,
    lines: recipe.data.lines.map((line, index) => ({ id: `line-${String(index)}`, ...line })),
  }
  const composition = computeComposition(input, { resolver, ...settings })
  const cost = recipeCost(input, {
    resolver,
    ...(settings.equivalences ? { equivalences: settings.equivalences } : {}),
  })
  const allergens = recipeAllergens(input, resolver)
  return {
    initialVolumeMl: composition.initialVolumeMl,
    finalVolumeMl: composition.finalVolumeMl,
    dilution: composition.dilution,
    approximate: composition.approximate,
    abv: metric(composition.abv),
    sugarPer100Ml: metric(composition.sugarPer100Ml),
    acidPer100Ml: metric(composition.acidPer100Ml),
    ratio: metric(composition.ratio),
    costCents: cost.cents,
    costBasis: cost.basis,
    costStatus: cost.status,
    allergens: [...allergens.required],
    optionalAllergens: [...allergens.optional],
  }
}

function metric(m: Metric): RecipeComputation['abv'] {
  return { value: m.value, status: m.status, issues: m.issues.map((issue) => ({ ...issue })) }
}
