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
  LineInput,
  ProductFacts,
  RecipeInput as CoreRecipe,
} from '../../core/model'
import type { UnitEquivalences } from '../../core/units'
import type { AllergenCode } from '../../shared/domain/allergens'
import type { RecipeComputation, RecipeInputParsed } from '../../shared/domain/catalog'
import type { Db } from './client'
import { ingredients, products, recipeLines, recipes } from './schema'

type ProductRow = typeof products.$inferSelect

function ingredientFacts(row: typeof ingredients.$inferSelect): IngredientFacts {
  return {
    id: row.id,
    abv: row.defaultAbv,
    sugarGPerL: row.sugarGPerL,
    acidGPerL: row.acidGPerL,
    compositionConfidence: row.compositionConfidence,
    densityGPerMl: row.densityGPerMl,
    allergens: row.allergens as AllergenCode[],
    prepRecipeId: row.prepRecipeId,
    isStaple: row.isStaple,
  }
}

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
        ingredientCache.set(id, row && ingredientFacts(row))
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

type LineTuple = [
  id: string,
  recipeId: string,
  ingredientId: string,
  preferredProductId: string | null,
  quantity: number | null,
  unit: LineInput['unit'],
  topEstimateMl: number | null,
  isOptional: number,
  isGarnish: number,
]

/**
 * The whole notebook read at once, for a calculation over every recipe (reference zones of some
 * 7 000 classics, D-039): a query per recipe and per ingredient would hold the main process
 * for seconds.
 */
export function notebookFacts(db: Db): { resolver: FactsResolver; recipes: Map<string, CoreRecipe> } {
  const ingredientsById = new Map<string, IngredientFacts>()
  for (const row of db.select().from(ingredients).where(isNull(ingredients.deletedAt)).all()) {
    ingredientsById.set(row.id, ingredientFacts(row))
  }
  const productsById = new Map<string, ProductFacts>()
  const productsByIngredient = new Map<string, ProductFacts[]>()
  for (const row of db.select().from(products).where(isNull(products.deletedAt)).all()) {
    const product = productFacts(row)
    productsById.set(row.id, product)
    const bottles = productsByIngredient.get(row.ingredientId)
    if (bottles) bottles.push(product)
    else productsByIngredient.set(row.ingredientId, [product])
  }
  // Raw rows: 40 000 lines through the ORM cost several times the calculation itself.
  const tuples = db.$client
    .prepare(
      `SELECT id, recipe_id, ingredient_id, preferred_product_id, quantity, unit, top_estimate_ml,
              is_optional, is_garnish
         FROM recipe_lines WHERE deleted_at IS NULL`,
    )
    .raw()
    .all() as LineTuple[]
  const linesByRecipe = new Map<string, LineInput[]>()
  for (const tuple of tuples) {
    const [id, recipeId, ingredientId, preferredProductId, quantity, unit, topEstimateMl] = tuple
    const line: LineInput = {
      id,
      ingredientId,
      preferredProductId,
      quantity,
      unit,
      topEstimateMl,
      isOptional: tuple[7] === 1,
      isGarnish: tuple[8] === 1,
    }
    const lines = linesByRecipe.get(recipeId)
    if (lines) lines.push(line)
    else linesByRecipe.set(recipeId, [line])
  }
  const recipesById = new Map<string, CoreRecipe>()
  const rows = db
    .select({
      id: recipes.id,
      kind: recipes.kind,
      method: recipes.method,
      dilutionOverridePct: recipes.dilutionOverridePct,
      yieldMl: recipes.yieldMl,
      garnishCostHtCents: recipes.garnishCostHtCents,
    })
    .from(recipes)
    .where(isNull(recipes.deletedAt))
    .all()
  for (const row of rows) recipesById.set(row.id, { ...row, lines: linesByRecipe.get(row.id) ?? [] })
  return {
    recipes: recipesById,
    resolver: {
      ingredient: (id) => ingredientsById.get(id),
      product: (id) => productsById.get(id),
      recipe: (id) => recipesById.get(id),
      productsOfIngredient: (id) => productsByIngredient.get(id) ?? [],
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
