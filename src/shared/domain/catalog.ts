/**
 * Ingredients, bottles and recipes as they cross the IPC bridge (phase 3). Every string has
 * a maximum length and every array a maximum size (section 6).
 */
import { z } from 'zod'
import { ALLERGEN_CODES } from './allergens'

const id = z.string().min(1).max(36)
const name = z.string().trim().min(1).max(120)
const text = (max: number) => z.string().max(max)
const optionalText = (max: number) => z.string().max(max).nullable()
const nonNegative = z.number().min(0)
const percent = z.number().min(0).max(100)

export const UNIT_VALUES = [
  'ml',
  'cl',
  'oz',
  'dash',
  'drop',
  'barspoon',
  'tsp',
  'g',
  'piece',
  'leaf',
  'slice',
  'wedge',
  'top',
  'to_taste',
] as const
export const METHOD_VALUES = [
  'shake',
  'dry_shake',
  'stir',
  'build',
  'throw',
  'blend',
  'swizzle',
  'other',
] as const
export const FAMILY_VALUES = [
  'sour',
  'spirit_forward',
  'highball',
  'fizz',
  'flip',
  'tiki',
  'punch',
  'shot',
  'non_alcoholic',
  'other',
] as const
export const STATUS_VALUES = ['idea', 'draft', 'testing', 'final', 'archived'] as const
export const ORIGIN_VALUES = ['mine', 'classic', 'other'] as const
export const PACK_UNIT_VALUES = [
  'piece',
  'leaf',
  'slice',
  'wedge',
  'barspoon',
  'tsp',
  'g',
  'serving',
] as const

// ---------------------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------------------

export const ingredientSummarySchema = z
  .object({
    id,
    name,
    categoryId: id,
    defaultAbv: percent.nullable(),
    isStaple: z.boolean(),
    isFavorite: z.boolean(),
    prepRecipeId: id.nullable(),
    aliases: z.array(name).max(50),
  })
  .strict()

export const ingredientInputSchema = z
  .object({
    name,
    categoryId: id,
    defaultAbv: percent.nullable().default(null),
    // Crystal sugar counted through its density holds about 1 590 g of sugar per litre.
    sugarGPerL: nonNegative.max(2000).nullable().default(null),
    acidGPerL: nonNegative.max(1000).nullable().default(null),
    densityGPerMl: z.number().gt(0).max(5).nullable().default(null),
    compositionSource: z.enum(['ciqual', 'computed', 'label', 'user']).nullable().default(null),
    compositionConfidence: z.enum(['sourced', 'estimated']).nullable().default(null),
    flavorTags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    description: optionalText(4000).default(null),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14).default([]),
    isStaple: z.boolean().default(false),
    aliases: z.array(name).max(50).default([]),
  })
  .strict()

export const ingredientDetailSchema = ingredientSummarySchema
  .extend({
    sugarGPerL: z.number().nullable(),
    acidGPerL: z.number().nullable(),
    compositionSource: z.enum(['ciqual', 'computed', 'label', 'user']).nullable(),
    compositionConfidence: z.enum(['sourced', 'estimated']).nullable(),
    densityGPerMl: z.number().nullable(),
    flavorTags: z.array(z.string()).max(30),
    description: z.string().nullable(),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
    /** Recipes using it, for the « fiches qui l'utilisent » list. */
    usedBy: z.array(z.object({ id, name }).strict()).max(5000),
  })
  .strict()

export type IngredientSummary = z.output<typeof ingredientSummarySchema>
export type IngredientInput = z.input<typeof ingredientInputSchema>
export type IngredientDetail = z.output<typeof ingredientDetailSchema>

// ---------------------------------------------------------------------------------------
// Bottles
// ---------------------------------------------------------------------------------------

export const productInputSchema = z
  .object({
    ingredientId: id,
    brand: optionalText(120).default(null),
    name,
    abv: percent.nullable().default(null),
    volumeMl: z.number().int().positive().max(100_000).nullable().default(null),
    sugarGPerL: nonNegative.max(1000).nullable().default(null),
    acidGPerL: nonNegative.max(1000).nullable().default(null),
    barcode: z
      .string()
      .regex(/^\d{6,14}$/)
      .nullable()
      .default(null),
    purchasePriceCents: z.number().int().min(0).max(10_000_000).nullable().default(null),
    purchasePriceBasis: z.enum(['ht', 'ttc']).nullable().default(null),
    packQuantity: z.number().positive().max(10_000).nullable().default(null),
    packUnit: z.enum(PACK_UNIT_VALUES).nullable().default(null),
    owned: z.boolean().default(false),
    personalNotes: optionalText(4000).default(null),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14).default([]),
  })
  .strict()
  .refine((p) => p.purchasePriceCents === null || p.purchasePriceBasis !== null, {
    message: 'A purchase price states whether it is HT or TTC',
    path: ['purchasePriceBasis'],
  })
  .refine((p) => (p.packQuantity === null) === (p.packUnit === null), {
    message: 'Pack quantity and unit go together',
    path: ['packUnit'],
  })

export const productSchema = z
  .object({
    id,
    ingredientId: id,
    brand: z.string().nullable(),
    name: z.string(),
    abv: z.number().nullable(),
    volumeMl: z.number().nullable(),
    sugarGPerL: z.number().nullable(),
    acidGPerL: z.number().nullable(),
    barcode: z.string().nullable(),
    purchasePriceCents: z.number().nullable(),
    purchasePriceBasis: z.enum(['ht', 'ttc']).nullable(),
    packQuantity: z.number().nullable(),
    packUnit: z.enum(PACK_UNIT_VALUES).nullable(),
    owned: z.boolean(),
    personalNotes: z.string().nullable(),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
  })
  .strict()

export type ProductInput = z.input<typeof productInputSchema>
export type Product = z.output<typeof productSchema>

// ---------------------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------------------

export const recipeLineInputSchema = z
  .object({
    ingredientId: id,
    preferredProductId: id.nullable().default(null),
    quantity: nonNegative.max(100_000).nullable(),
    unit: z.enum(UNIT_VALUES),
    topEstimateMl: nonNegative.max(10_000).nullable().default(null),
    isOptional: z.boolean().default(false),
    isGarnish: z.boolean().default(false),
    note: optionalText(500).default(null),
  })
  .strict()

export const recipeInputSchema = z
  .object({
    name,
    kind: z.enum(['cocktail', 'prep']).default('cocktail'),
    status: z.enum(STATUS_VALUES).default('draft'),
    origin: z.enum(ORIGIN_VALUES).default('mine'),
    credit: optionalText(200).default(null),
    family: z.enum(FAMILY_VALUES).nullable().default(null),
    method: z.enum(METHOD_VALUES).nullable().default(null),
    glassId: id.nullable().default(null),
    iceId: id.nullable().default(null),
    garnish: optionalText(1000).default(null),
    steps: z.array(text(1000)).max(50).default([]),
    notes: optionalText(10_000).default(null),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    dilutionOverridePct: percent.nullable().default(null),
    parentRecipeId: id.nullable().default(null),
    yieldMl: z.number().int().positive().max(100_000).nullable().default(null),
    shelfLifeDays: z.number().int().min(0).max(3650).nullable().default(null),
    storageNotes: optionalText(2000).default(null),
    drinkLength: z.enum(['short', 'long']).nullable().default(null),
    servingMoment: z.enum(['before_dinner', 'all_day', 'after_dinner']).nullable().default(null),
    profile: optionalText(200).default(null),
    garnishCostHtCents: z.number().int().min(0).max(1_000_000).nullable().default(null),
    /** Category of the ingredient that a preparation becomes (kind = prep). */
    prepCategoryId: id.nullable().default(null),
    lines: z.array(recipeLineInputSchema).max(60).default([]),
  })
  .strict()

export const recipeLineSchema = recipeLineInputSchema.extend({ id }).strict()

export const recipeSummarySchema = z
  .object({
    id,
    name: z.string(),
    kind: z.enum(['cocktail', 'prep']),
    status: z.enum(STATUS_VALUES),
    origin: z.enum(ORIGIN_VALUES),
    family: z.enum(FAMILY_VALUES).nullable(),
    method: z.enum(METHOD_VALUES).nullable(),
    version: z.number().int(),
    isFavorite: z.boolean(),
    updatedAt: z.number().int(),
    /** Required ingredients not available tonight; empty when the recipe can be made. */
    missingIngredientIds: z.array(id).max(60),
  })
  .strict()

export const recipeVersionSchema = z
  .object({ version: z.number().int(), label: z.string().nullable(), createdAt: z.number().int() })
  .strict()

export const recipeDetailSchema = recipeInputSchema
  .omit({ lines: true })
  .extend({
    id,
    version: z.number().int(),
    isFavorite: z.boolean(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
    lines: z.array(recipeLineSchema).max(60),
    history: z.array(recipeVersionSchema).max(1000),
  })
  .strict()

export const quickIdeaSchema = z
  .object({
    name,
    ingredients: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    note: optionalText(2000).default(null),
  })
  .strict()

const metricSchema = z
  .object({
    value: z.number().nullable(),
    status: z.enum(['complete', 'estimated', 'incomplete']),
    issues: z
      .array(
        z.object({ lineId: z.string(), reason: z.string(), ingredientId: z.string().optional() }).strict(),
      )
      .max(200),
  })
  .strict()

/** Calculated panel of a recipe (section 10.4). */
export const recipeComputationSchema = z
  .object({
    initialVolumeMl: z.number(),
    finalVolumeMl: z.number(),
    dilution: z.number(),
    approximate: z.boolean(),
    abv: metricSchema,
    sugarPer100Ml: metricSchema,
    acidPer100Ml: metricSchema,
    ratio: metricSchema,
    costCents: z.number().nullable(),
    costBasis: z.enum(['ht', 'ttc']).nullable(),
    costStatus: z.enum(['complete', 'estimated', 'incomplete']),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
    optionalAllergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
  })
  .strict()

export type RecipeLineInput = z.input<typeof recipeLineInputSchema>
export type RecipeInput = z.input<typeof recipeInputSchema>
export type RecipeInputParsed = z.output<typeof recipeInputSchema>
export type RecipeSummary = z.output<typeof recipeSummarySchema>
export type RecipeDetail = z.output<typeof recipeDetailSchema>
export type QuickIdea = z.input<typeof quickIdeaSchema>
export type RecipeComputation = z.output<typeof recipeComputationSchema>
