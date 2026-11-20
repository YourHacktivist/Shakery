/**
 * Generic ingredients (sections 7 and 10.8): creation with duplicate detection, aliases,
 * merge (the old name becomes an alias), and deletion refused while a recipe uses it.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { normalizeName } from '../../../core/normalize'
import {
  ingredientInputSchema,
  type IngredientDetail,
  type IngredientInput,
  type IngredientSummary,
} from '../../../shared/domain/catalog'
import { DomainError } from '../../errors'
import type { Db, Ids } from '../client'
import {
  categories,
  ingredientAliases,
  ingredients,
  knowledgeLinks,
  products,
  recipeLines,
  recipes,
  referenceSpecLines,
} from '../schema'
import { indexEntity, removeFromIndex } from './search-index'

const UNSORTED_SEED_KEY = 'cat.unsorted'

export class IngredientRepository {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
  ) {}

  list(): IngredientSummary[] {
    const rows = this.db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        categoryId: ingredients.categoryId,
        defaultAbv: ingredients.defaultAbv,
        isStaple: ingredients.isStaple,
        isFavorite: ingredients.isFavorite,
        prepRecipeId: ingredients.prepRecipeId,
      })
      .from(ingredients)
      .where(isNull(ingredients.deletedAt))
      .orderBy(asc(ingredients.nameNormalized))
      .all()
    const aliases = this.aliasesByIngredient(rows.map((r) => r.id))
    return rows.map((row) => ({ ...row, aliases: aliases.get(row.id) ?? [] }))
  }

  get(id: string): IngredientDetail {
    const row = this.db
      .select()
      .from(ingredients)
      .where(and(eq(ingredients.id, id), isNull(ingredients.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown ingredient')
    const usedBy = this.db
      .selectDistinct({ id: recipes.id, name: recipes.name })
      .from(recipeLines)
      .innerJoin(recipes, eq(recipes.id, recipeLines.recipeId))
      .where(and(eq(recipeLines.ingredientId, id), isNull(recipeLines.deletedAt), isNull(recipes.deletedAt)))
      .orderBy(asc(recipes.nameNormalized))
      .all()
    return {
      id: row.id,
      name: row.name,
      categoryId: row.categoryId,
      defaultAbv: row.defaultAbv,
      sugarGPerL: row.sugarGPerL,
      acidGPerL: row.acidGPerL,
      compositionSource: row.compositionSource,
      compositionConfidence: row.compositionConfidence,
      densityGPerMl: row.densityGPerMl,
      flavorTags: row.flavorTags,
      description: row.description,
      allergens: row.allergens as IngredientDetail['allergens'],
      isStaple: row.isStaple,
      isFavorite: row.isFavorite,
      prepRecipeId: row.prepRecipeId,
      aliases: this.aliasesByIngredient([id]).get(id) ?? [],
      usedBy,
    }
  }

  /** Live ingredients whose name or alias has this normalized form (duplicate detection). */
  findByName(name: string, categoryId?: string): IngredientSummary[] {
    const normalized = normalizeName(name)
    const byAlias = this.db
      .select({ id: ingredientAliases.ingredientId })
      .from(ingredientAliases)
      .where(and(eq(ingredientAliases.aliasNormalized, normalized), isNull(ingredientAliases.deletedAt)))
      .all()
      .map((r) => r.id)
    return this.list().filter(
      (i) =>
        (normalizeName(i.name) === normalized || byAlias.includes(i.id)) &&
        (categoryId === undefined || i.categoryId === categoryId),
    )
  }

  /**
   * Creates an ingredient. A live ingredient with the same normalized name (or alias) in the
   * same category is a duplicate: CONFLICT, unless `allowSimilar` (another category is fine).
   */
  create(input: IngredientInput, options: { prepRecipeId?: string } = {}): IngredientSummary {
    const data = ingredientInputSchema.parse(input)
    this.assertCategory(data.categoryId)
    if (this.findByName(data.name, data.categoryId).length > 0) {
      throw new DomainError('CONFLICT', 'An ingredient with this name already exists in this category')
    }
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db.transaction((tx) => {
      tx.insert(ingredients)
        .values({
          id,
          createdAt: now,
          updatedAt: now,
          name: data.name,
          nameNormalized: normalizeName(data.name),
          categoryId: data.categoryId,
          defaultAbv: data.defaultAbv,
          sugarGPerL: data.sugarGPerL,
          acidGPerL: data.acidGPerL,
          compositionSource: data.compositionSource,
          compositionConfidence: data.compositionConfidence,
          densityGPerMl: data.densityGPerMl,
          flavorTags: data.flavorTags,
          description: data.description,
          allergens: data.allergens,
          isStaple: data.isStaple,
          prepRecipeId: options.prepRecipeId ?? null,
          source: 'user',
        })
        .run()
      this.writeAliases(tx, id, data.aliases, now)
      indexEntity(
        this.db.$client,
        'ingredient',
        id,
        { title: data.name, aliases: data.aliases, body: [data.description] },
        { fresh: true },
      )
    })
    return this.summary(id)
  }

  update(id: string, input: IngredientInput): IngredientSummary {
    const data = ingredientInputSchema.parse(input)
    this.get(id)
    this.assertCategory(data.categoryId)
    if (this.findByName(data.name, data.categoryId).some((i) => i.id !== id)) {
      throw new DomainError('CONFLICT', 'An ingredient with this name already exists in this category')
    }
    const now = this.ids.now()
    this.db.transaction((tx) => {
      tx.update(ingredients)
        .set({
          updatedAt: now,
          name: data.name,
          nameNormalized: normalizeName(data.name),
          categoryId: data.categoryId,
          defaultAbv: data.defaultAbv,
          sugarGPerL: data.sugarGPerL,
          acidGPerL: data.acidGPerL,
          compositionSource: data.compositionSource,
          compositionConfidence: data.compositionConfidence,
          densityGPerMl: data.densityGPerMl,
          flavorTags: data.flavorTags,
          description: data.description,
          allergens: data.allergens,
          isStaple: data.isStaple,
        })
        .where(eq(ingredients.id, id))
        .run()
      tx.update(ingredientAliases)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(ingredientAliases.ingredientId, id), isNull(ingredientAliases.deletedAt)))
        .run()
      this.writeAliases(tx, id, data.aliases, now)
      indexEntity(this.db.$client, 'ingredient', id, {
        title: data.name,
        aliases: data.aliases,
        body: [data.description],
      })
    })
    return this.summary(id)
  }

  setFavorite(id: string, favorite: boolean): void {
    this.db
      .update(ingredients)
      .set({ isFavorite: favorite, updatedAt: this.ids.now() })
      .where(eq(ingredients.id, id))
      .run()
  }

  /**
   * Merges `sourceId` into `targetId` in one transaction: recipe lines, bottles, reference
   * lines and culture links move to the target, the source name becomes an alias of the
   * target, and the source is soft deleted (section 10.8).
   */
  merge(sourceId: string, targetId: string): IngredientSummary {
    if (sourceId === targetId) throw new DomainError('CONFLICT', 'Cannot merge an ingredient into itself')
    const source = this.get(sourceId)
    this.get(targetId)
    const now = this.ids.now()
    this.db.transaction((tx) => {
      tx.update(recipeLines)
        .set({ ingredientId: targetId, updatedAt: now })
        .where(eq(recipeLines.ingredientId, sourceId))
        .run()
      tx.update(products)
        .set({ ingredientId: targetId, updatedAt: now })
        .where(eq(products.ingredientId, sourceId))
        .run()
      tx.update(referenceSpecLines)
        .set({ ingredientId: targetId, updatedAt: now })
        .where(eq(referenceSpecLines.ingredientId, sourceId))
        .run()
      tx.update(knowledgeLinks)
        .set({ ingredientId: targetId, updatedAt: now })
        .where(eq(knowledgeLinks.ingredientId, sourceId))
        .run()
      const targetAliases = new Set(
        this.aliasesByIngredient([targetId]).get(targetId)?.map(normalizeName) ?? [],
      )
      for (const alias of [source.name, ...source.aliases]) {
        if (!targetAliases.has(normalizeName(alias))) this.writeAliases(tx, targetId, [alias], now)
      }
      tx.update(ingredientAliases)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(ingredientAliases.ingredientId, sourceId), isNull(ingredientAliases.deletedAt)))
        .run()
      tx.update(ingredients).set({ deletedAt: now, updatedAt: now }).where(eq(ingredients.id, sourceId)).run()
      removeFromIndex(this.db.$client, 'ingredient', sourceId)
      const target = tx.select().from(ingredients).where(eq(ingredients.id, targetId)).get()
      if (target) {
        indexEntity(this.db.$client, 'ingredient', targetId, {
          title: target.name,
          aliases: [...(this.aliasesByIngredient([targetId]).get(targetId) ?? [])],
          body: [target.description],
        })
      }
    })
    return this.summary(targetId)
  }

  /** Soft delete, refused while a live recipe line or reference line uses it (section 7). */
  delete(id: string): void {
    this.get(id)
    const used = this.db
      .select({ n: sql<number>`count(*)` })
      .from(recipeLines)
      .innerJoin(recipes, eq(recipes.id, recipeLines.recipeId))
      .where(and(eq(recipeLines.ingredientId, id), isNull(recipeLines.deletedAt), isNull(recipes.deletedAt)))
      .get()
    const usedByReference = this.db
      .select({ n: sql<number>`count(*)` })
      .from(referenceSpecLines)
      .where(and(eq(referenceSpecLines.ingredientId, id), isNull(referenceSpecLines.deletedAt)))
      .get()
    if ((used?.n ?? 0) > 0 || (usedByReference?.n ?? 0) > 0) {
      throw new DomainError('CONFLICT', 'This ingredient is used: merge it instead')
    }
    const now = this.ids.now()
    this.db.transaction((tx) => {
      tx.update(ingredients).set({ deletedAt: now, updatedAt: now }).where(eq(ingredients.id, id)).run()
      removeFromIndex(this.db.$client, 'ingredient', id)
    })
  }

  /** The « À classer » category, where quick ideas put the ingredients they create. */
  unsortedCategoryId(): string {
    const row = this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.seedKey, UNSORTED_SEED_KEY), isNull(categories.deletedAt)))
      .get()
    if (!row) throw new DomainError('UNAVAILABLE', 'The unsorted category is missing')
    return row.id
  }

  private summary(id: string): IngredientSummary {
    const found = this.list().find((i) => i.id === id)
    if (!found) throw new DomainError('NOT_FOUND', 'Unknown ingredient')
    return found
  }

  private assertCategory(categoryId: string): void {
    const row = this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown category')
  }

  private aliasesByIngredient(ingredientIds: readonly string[]): Map<string, string[]> {
    const map = new Map<string, string[]>()
    if (ingredientIds.length === 0) return map
    const rows = this.db
      .select({ ingredientId: ingredientAliases.ingredientId, alias: ingredientAliases.alias })
      .from(ingredientAliases)
      .where(
        and(inArray(ingredientAliases.ingredientId, [...ingredientIds]), isNull(ingredientAliases.deletedAt)),
      )
      .orderBy(asc(ingredientAliases.aliasNormalized))
      .all()
    for (const row of rows) map.set(row.ingredientId, [...(map.get(row.ingredientId) ?? []), row.alias])
    return map
  }

  private writeAliases(
    tx: Parameters<Parameters<Db['transaction']>[0]>[0],
    ingredientId: string,
    aliases: readonly string[],
    now: number,
  ): void {
    const seen = new Set<string>()
    for (const alias of aliases) {
      const normalized = normalizeName(alias)
      if (normalized === '' || seen.has(normalized)) continue
      seen.add(normalized)
      tx.insert(ingredientAliases)
        .values({
          id: this.ids.newId(),
          createdAt: now,
          updatedAt: now,
          ingredientId,
          alias,
          aliasNormalized: normalized,
        })
        .run()
    }
  }
}
