/**
 * Loads the fixed reference data (section 9, « Chargement dans l'application »).
 *
 * Only entries whose seed_key is absent are added: an entry already present is never
 * overwritten, and an entry the user deleted (soft delete) is never recreated, because
 * its seed_key is still in the table.
 */
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { normalizeName } from '../../core/normalize'
import { ALLERGEN_CODES } from '../../shared/domain/allergens'
import { FAMILY_VALUES, METHOD_VALUES, UNIT_VALUES } from '../../shared/domain/catalog'
import { BATCH_HINT_VALUES } from '../../shared/domain/reference'
import type { Db, Ids } from '../db/client'
import { IngredientRepository } from '../db/repositories/ingredients'
import { RecipeRepository } from '../db/repositories/recipes'
import { indexEntity } from '../db/repositories/search-index'
import { categories, glasses, iceTypes, ingredientAliases, ingredients, recipes } from '../db/schema'

const seedKey = z.string().regex(/^[a-z][a-z0-9_.-]{1,80}$/)
const label = z.string().trim().min(1).max(120)

export const categorySeedSchema = z
  .object({
    seed_key: seedKey,
    name: label,
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    parent: seedKey.nullable(),
    sort_order: z.number().int(),
    batch_hint: z.enum(BATCH_HINT_VALUES),
    needs_review: z.literal(false).optional(),
  })
  .strict()

export const glassSeedSchema = z
  .object({
    seed_key: seedKey,
    name: label,
    capacity_ml: z.number().int().positive().nullable(),
    sort_order: z.number().int(),
    needs_review: z.literal(false).optional(),
  })
  .strict()

export const iceSeedSchema = z
  .object({
    seed_key: seedKey,
    name: label,
    sort_order: z.number().int(),
    needs_review: z.literal(false).optional(),
  })
  .strict()

/** Generic ingredient built by scripts/seed/build.ts (Wikidata, Ciqual, hand-written). */
export const ingredientSeedSchema = z
  .object({
    seed_key: seedKey,
    name: label,
    category: seedKey,
    aliases: z.array(label).max(50),
    default_abv: z.number().min(0).max(100).nullable(),
    sugar_g_per_l: z.number().min(0).max(1000).nullable(),
    acid_g_per_l: z.number().min(0).max(1000).nullable(),
    composition_source: z.enum(['ciqual', 'computed', 'label']).nullable(),
    composition_confidence: z.enum(['sourced', 'estimated']).nullable(),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
    is_staple: z.boolean(),
    source: z.enum(['seed', 'wikidata']),
    external_ref: z
      .string()
      .regex(/^Q\d+$/)
      .nullable(),
    needs_review: z.literal(false).optional(),
  })
  .strict()

const recipeLineSeedSchema = z
  .object({
    ingredient: seedKey,
    quantity: z.number().min(0).max(100_000).nullable(),
    unit: z.enum(UNIT_VALUES),
    is_optional: z.boolean(),
    is_garnish: z.boolean(),
    note: z.string().max(500).nullable(),
  })
  .strict()

/**
 * A classic cocktail (IBA) or a classic homemade preparation. A preparation is also an
 * ingredient: `ingredient_key` is the seed_key given to it, `category` its leaf category.
 */
export const recipeSeedSchema = z
  .object({
    seed_key: seedKey,
    name: label,
    kind: z.enum(['cocktail', 'prep']),
    source: z.enum(['seed_iba', 'seed']),
    family: z.enum(FAMILY_VALUES).nullable(),
    method: z.enum(METHOD_VALUES).nullable(),
    glass: seedKey.nullable(),
    ice: seedKey.nullable(),
    garnish: z.string().max(300).nullable(),
    steps: z.array(z.string().min(1).max(1000)).max(30),
    notes: z.string().max(4000).nullable(),
    credit: z.string().max(200).nullable(),
    yield_ml: z.number().int().positive().nullable(),
    ingredient_key: seedKey.nullable(),
    category: seedKey.nullable(),
    lines: z.array(recipeLineSeedSchema).min(1).max(60),
    needs_review: z.literal(false).optional(),
  })
  .strict()

export type SeedData = {
  readonly categories: ReadonlyArray<z.input<typeof categorySeedSchema>>
  readonly glasses: ReadonlyArray<z.input<typeof glassSeedSchema>>
  readonly ice: ReadonlyArray<z.input<typeof iceSeedSchema>>
  readonly ingredients: ReadonlyArray<z.input<typeof ingredientSeedSchema>>
  /** Preparations first: a cocktail may use one of them. */
  readonly recipes: ReadonlyArray<z.input<typeof recipeSeedSchema>>
}

export type SeedReport = {
  readonly categories: number
  readonly glasses: number
  readonly ice: number
  readonly ingredients: number
  readonly recipes: number
}

function uniqueOrThrow(values: string[], what: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${what} in seed data: ${value}`)
    seen.add(value)
  }
}

/**
 * Validates the whole seed set before writing anything: schemas (with `needs_review`
 * refused, section 9), unique keys and slugs, existing parents, no cycle.
 */
export function validateSeedData(data: SeedData): {
  categories: Array<z.output<typeof categorySeedSchema>>
  glasses: Array<z.output<typeof glassSeedSchema>>
  ice: Array<z.output<typeof iceSeedSchema>>
  ingredients: Array<z.output<typeof ingredientSeedSchema>>
  recipes: Array<z.output<typeof recipeSeedSchema>>
} {
  const cats = z.array(categorySeedSchema).max(500).parse(data.categories)
  const gls = z.array(glassSeedSchema).max(200).parse(data.glasses)
  const ice = z.array(iceSeedSchema).max(100).parse(data.ice)
  const ings = z.array(ingredientSeedSchema).max(5000).parse(data.ingredients)
  const recs = z.array(recipeSeedSchema).max(2000).parse(data.recipes)

  uniqueOrThrow(
    cats.map((c) => c.seed_key),
    'category seed_key',
  )
  uniqueOrThrow(
    cats.map((c) => c.slug),
    'category slug',
  )
  uniqueOrThrow(
    gls.map((g) => g.seed_key),
    'glass seed_key',
  )
  uniqueOrThrow(
    gls.map((g) => normalizeName(g.name)),
    'glass name',
  )
  uniqueOrThrow(
    ice.map((i) => i.seed_key),
    'ice seed_key',
  )

  const byKey = new Map(cats.map((c) => [c.seed_key, c]))
  for (const cat of cats) {
    const chain = new Set<string>([cat.seed_key])
    let parent = cat.parent
    while (parent !== null) {
      const next = byKey.get(parent)
      if (!next) throw new Error(`Unknown parent ${parent} for category ${cat.seed_key}`)
      if (chain.has(parent)) throw new Error(`Category cycle through ${parent}`)
      chain.add(parent)
      parent = next.parent
    }
  }
  uniqueOrThrow(
    ings.map((i) => i.seed_key),
    'ingredient seed_key',
  )
  uniqueOrThrow(
    ings.map((i) => `${i.category}|${normalizeName(i.name)}`),
    'ingredient name in a category',
  )
  const parents = new Set(cats.map((c) => c.parent))
  for (const ingredient of ings) {
    if (!byKey.has(ingredient.category) || parents.has(ingredient.category)) {
      throw new Error(`Ingredient ${ingredient.seed_key} is not in a leaf category`)
    }
  }
  uniqueOrThrow(
    recs.map((r) => r.seed_key),
    'recipe seed_key',
  )
  // Every line points to a seed ingredient or to a preparation listed before it.
  const known = new Set(ings.map((i) => i.seed_key))
  const glassKeys = new Set(gls.map((g) => g.seed_key))
  const iceKeys = new Set(ice.map((i) => i.seed_key))
  for (const recipe of recs) {
    for (const line of recipe.lines) {
      if (!known.has(line.ingredient))
        throw new Error(`${recipe.seed_key}: unknown ingredient ${line.ingredient}`)
    }
    if (recipe.glass !== null && !glassKeys.has(recipe.glass))
      throw new Error(`${recipe.seed_key}: unknown glass`)
    if (recipe.ice !== null && !iceKeys.has(recipe.ice)) throw new Error(`${recipe.seed_key}: unknown ice`)
    if (recipe.kind === 'prep') {
      if (recipe.ingredient_key === null || recipe.category === null) {
        throw new Error(`${recipe.seed_key}: a preparation needs its ingredient key and category`)
      }
      known.add(recipe.ingredient_key)
    }
  }
  return { categories: cats, glasses: gls, ice, ingredients: ings, recipes: recs }
}

/** Adds the missing seed entries, in one transaction. */
export function loadSeedData(db: Db, ids: Ids, data: SeedData): SeedReport {
  const checked = validateSeedData(data)
  const report = db.transaction((tx) => {
    const now = ids.now()
    const report = { categories: 0, glasses: 0, ice: 0, ingredients: 0, recipes: 0 }

    // Categories: parents first, so a child can resolve its parent's id.
    const existing = new Map(
      tx
        .select({ id: categories.id, seedKey: categories.seedKey })
        .from(categories)
        .where(isNotNull(categories.seedKey))
        .all()
        .map((row) => [row.seedKey ?? '', row.id] as const),
    )
    // A user category may already hold the slug of a new seed entry: suffix the slug
    // instead of failing the whole transaction on the unique index.
    const liveSlugs = new Set(
      tx
        .select({ slug: categories.slug })
        .from(categories)
        .where(isNull(categories.deletedAt))
        .all()
        .map((row) => row.slug),
    )
    const freeSlug = (slug: string): string => {
      let candidate = slug
      for (let n = 2; liveSlugs.has(candidate); n += 1) candidate = `${slug}-${n}`
      liveSlugs.add(candidate)
      return candidate
    }

    const pending = [...checked.categories]
    let progressed = true
    while (pending.length > 0 && progressed) {
      progressed = false
      for (let i = 0; i < pending.length;) {
        const cat = pending[i]
        if (!cat) break
        if (existing.has(cat.seed_key)) {
          pending.splice(i, 1)
          progressed = true
          continue
        }
        const parentId = cat.parent === null ? null : existing.get(cat.parent)
        if (parentId === undefined) {
          i += 1
          continue
        }
        const id = ids.newId()
        tx.insert(categories)
          .values({
            id,
            createdAt: now,
            updatedAt: now,
            name: cat.name,
            slug: freeSlug(cat.slug),
            parentId,
            sortOrder: cat.sort_order,
            batchHint: cat.batch_hint,
            seedKey: cat.seed_key,
          })
          .run()
        existing.set(cat.seed_key, id)
        report.categories += 1
        pending.splice(i, 1)
        progressed = true
      }
    }

    const glassKeys = new Set(
      tx
        .select({ seedKey: glasses.seedKey })
        .from(glasses)
        .where(isNotNull(glasses.seedKey))
        .all()
        .map((r) => r.seedKey),
    )
    for (const glass of checked.glasses) {
      if (glassKeys.has(glass.seed_key)) continue
      tx.insert(glasses)
        .values({
          id: ids.newId(),
          createdAt: now,
          updatedAt: now,
          name: glass.name,
          capacityMl: glass.capacity_ml,
          sortOrder: glass.sort_order,
          seedKey: glass.seed_key,
        })
        .run()
      report.glasses += 1
    }

    const iceKeys = new Set(
      tx
        .select({ seedKey: iceTypes.seedKey })
        .from(iceTypes)
        .where(isNotNull(iceTypes.seedKey))
        .all()
        .map((r) => r.seedKey),
    )
    for (const ice of checked.ice) {
      if (iceKeys.has(ice.seed_key)) continue
      tx.insert(iceTypes)
        .values({
          id: ids.newId(),
          createdAt: now,
          updatedAt: now,
          name: ice.name,
          sortOrder: ice.sort_order,
          seedKey: ice.seed_key,
        })
        .run()
      report.ice += 1
    }

    // Ingredients: a seed_key already present (even deleted) is never written again, and an
    // ingredient the user already has under the same name in the same category is left alone.
    const ingredientKeys = new Set(
      tx
        .select({ seedKey: ingredients.seedKey })
        .from(ingredients)
        .where(isNotNull(ingredients.seedKey))
        .all()
        .map((r) => r.seedKey),
    )
    for (const item of checked.ingredients) {
      if (ingredientKeys.has(item.seed_key)) continue
      const categoryId = existing.get(item.category)
      if (categoryId === undefined) continue
      const nameNormalized = normalizeName(item.name)
      const clash = tx
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(
          and(
            eq(ingredients.nameNormalized, nameNormalized),
            eq(ingredients.categoryId, categoryId),
            isNull(ingredients.deletedAt),
          ),
        )
        .get()
      if (clash) continue
      const id = ids.newId()
      tx.insert(ingredients)
        .values({
          id,
          createdAt: now,
          updatedAt: now,
          name: item.name,
          nameNormalized,
          categoryId,
          defaultAbv: item.default_abv,
          sugarGPerL: item.sugar_g_per_l,
          acidGPerL: item.acid_g_per_l,
          compositionSource: item.composition_source,
          compositionConfidence: item.composition_confidence,
          allergens: item.allergens,
          isStaple: item.is_staple,
          source: item.source,
          externalRef: item.external_ref,
          seedKey: item.seed_key,
        })
        .run()
      for (const alias of item.aliases) {
        tx.insert(ingredientAliases)
          .values({
            id: ids.newId(),
            createdAt: now,
            updatedAt: now,
            ingredientId: id,
            alias,
            aliasNormalized: normalizeName(alias),
          })
          .run()
      }
      indexEntity(db.$client, 'ingredient', id, { title: item.name, aliases: item.aliases })
      report.ingredients += 1
    }
    return report
  })
  report.recipes = loadSeedRecipes(db, ids, checked.recipes)
  return report
}

/** seed_key to id of a table, deleted rows included: a deleted entry is never recreated. */
function seedKeys(rows: Array<{ id: string; seedKey: string | null }>): Map<string, string> {
  return new Map(
    rows.filter((row) => row.seedKey !== null).map((row) => [row.seedKey ?? '', row.id] as const),
  )
}

/**
 * Recipes go through the repository, which writes lines, the first snapshot, the search index
 * and, for a preparation, its ingredient. One transaction per recipe.
 */
function loadSeedRecipes(db: Db, ids: Ids, seeds: ReadonlyArray<z.output<typeof recipeSeedSchema>>): number {
  const repository = new RecipeRepository(db, ids, new IngredientRepository(db, ids))
  const recipeKeys = seedKeys(db.select({ id: recipes.id, seedKey: recipes.seedKey }).from(recipes).all())
  const ingredientKeys = seedKeys(
    db
      .select({ id: ingredients.id, seedKey: ingredients.seedKey })
      .from(ingredients)
      .where(isNull(ingredients.deletedAt))
      .all(),
  )
  const categoryKeys = seedKeys(
    db.select({ id: categories.id, seedKey: categories.seedKey }).from(categories).all(),
  )
  const glassKeys = seedKeys(db.select({ id: glasses.id, seedKey: glasses.seedKey }).from(glasses).all())
  const iceKeys = seedKeys(db.select({ id: iceTypes.id, seedKey: iceTypes.seedKey }).from(iceTypes).all())
  let added = 0
  for (const seed of seeds) {
    if (recipeKeys.has(seed.seed_key)) continue
    const lines = seed.lines.map((line) => ({
      ingredientId: ingredientKeys.get(line.ingredient) ?? '',
      quantity: line.quantity,
      unit: line.unit,
      isOptional: line.is_optional,
      isGarnish: line.is_garnish,
      note: line.note,
    }))
    // An ingredient the user deleted (or merged away) leaves the recipe out.
    if (lines.some((line) => line.ingredientId === '')) continue
    const detail = repository.create({
      name: seed.name,
      kind: seed.kind,
      status: 'final',
      origin: 'classic',
      credit: seed.credit,
      family: seed.family,
      method: seed.method,
      glassId: seed.glass === null ? null : (glassKeys.get(seed.glass) ?? null),
      iceId: seed.ice === null ? null : (iceKeys.get(seed.ice) ?? null),
      garnish: seed.garnish,
      steps: seed.steps,
      notes: seed.notes,
      yieldMl: seed.yield_ml,
      prepCategoryId: seed.category === null ? null : (categoryKeys.get(seed.category) ?? null),
      lines,
    })
    db.update(recipes)
      .set({ seedKey: seed.seed_key, source: seed.source })
      .where(eq(recipes.id, detail.id))
      .run()
    if (seed.kind === 'prep' && seed.ingredient_key !== null) {
      db.update(ingredients)
        .set({ seedKey: seed.ingredient_key, source: 'seed' })
        .where(eq(ingredients.prepRecipeId, detail.id))
        .run()
      const prep = db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(eq(ingredients.prepRecipeId, detail.id))
        .get()
      if (prep) ingredientKeys.set(seed.ingredient_key, prep.id)
    }
    recipeKeys.set(seed.seed_key, detail.id)
    added += 1
  }
  return added
}
