/**
 * Recipes (sections 7, 10.2 and 10.4): creation, versions with snapshots, simple corrections,
 * statuses, variants, soft delete with undo, quick ideas. A preparation is also an ingredient,
 * and may not use itself, directly or through a chain.
 */
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { normalizeName } from '../../../core/normalize'
import {
  quickIdeaSchema,
  recipeInputSchema,
  type QuickIdea,
  type RecipeDetail,
  type RecipeInput,
  type RecipeInputParsed,
  type RecipeSummary,
} from '../../../shared/domain/catalog'
import { DomainError } from '../../errors'
import type { Db, Ids } from '../client'
import { ingredients, recipeHistory, recipeLines, recipes } from '../schema'
import type { IngredientRepository } from './ingredients'
import { indexEntity, removeFromIndex } from './search-index'

type RecipeRow = typeof recipes.$inferSelect

export type SaveOptions = {
  /** false: a simple correction, saved without a new version (section 7). */
  readonly newVersion?: boolean
  readonly label?: string | null
}

export class RecipeRepository {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
    private readonly ingredientRepository: IngredientRepository,
  ) {}

  list(): RecipeSummary[] {
    return this.db
      .select({
        id: recipes.id,
        name: recipes.name,
        kind: recipes.kind,
        status: recipes.status,
        origin: recipes.origin,
        family: recipes.family,
        method: recipes.method,
        version: recipes.version,
        isFavorite: recipes.isFavorite,
        updatedAt: recipes.updatedAt,
      })
      .from(recipes)
      .where(isNull(recipes.deletedAt))
      .orderBy(desc(recipes.updatedAt))
      .all()
  }

  get(id: string): RecipeDetail {
    const row = this.row(id)
    const lines = this.db
      .select()
      .from(recipeLines)
      .where(and(eq(recipeLines.recipeId, id), isNull(recipeLines.deletedAt)))
      .orderBy(asc(recipeLines.sortOrder))
      .all()
    const history = this.db
      .select({
        version: recipeHistory.version,
        label: recipeHistory.label,
        createdAt: recipeHistory.createdAt,
      })
      .from(recipeHistory)
      .where(and(eq(recipeHistory.recipeId, id), isNull(recipeHistory.deletedAt)))
      .orderBy(desc(recipeHistory.version))
      .all()
    const prepIngredient = this.db
      .select({ categoryId: ingredients.categoryId })
      .from(ingredients)
      .where(and(eq(ingredients.prepRecipeId, id), isNull(ingredients.deletedAt)))
      .get()
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      status: row.status,
      origin: row.origin,
      credit: row.credit,
      family: row.family,
      method: row.method,
      glassId: row.glassId,
      iceId: row.iceId,
      garnish: row.garnish,
      steps: row.steps,
      notes: row.notes,
      tags: row.tags,
      dilutionOverridePct: row.dilutionOverridePct,
      parentRecipeId: row.parentRecipeId,
      yieldMl: row.yieldMl,
      shelfLifeDays: row.shelfLifeDays,
      storageNotes: row.storageNotes,
      drinkLength: row.drinkLength,
      servingMoment: row.servingMoment,
      profile: row.profile,
      garnishCostHtCents: row.garnishCostHtCents,
      prepCategoryId: prepIngredient?.categoryId ?? null,
      version: row.version,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines: lines.map((l) => ({
        id: l.id,
        ingredientId: l.ingredientId,
        preferredProductId: l.preferredProductId,
        quantity: l.quantity,
        unit: l.unit,
        topEstimateMl: l.topEstimateMl,
        isOptional: l.isOptional,
        isGarnish: l.isGarnish,
        note: l.note,
      })),
      history,
    }
  }

  create(input: RecipeInput, options: { label?: string | null } = {}): RecipeDetail {
    const data = recipeInputSchema.parse(input)
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .insert(recipes)
        .values({ id, createdAt: now, updatedAt: now, ...this.columns(data), version: 1, source: 'user' })
        .run()
      this.writeLines(id, data, now)
      if (data.kind === 'prep') this.ensurePrepIngredient(id, data)
      this.assertNoPrepCycle(id)
      this.snapshot(id, 1, options.label ?? null, now)
      this.index(id, data)
    })
    return this.get(id)
  }

  update(id: string, input: RecipeInput, options: SaveOptions = {}): RecipeDetail {
    const data = recipeInputSchema.parse(input)
    const current = this.row(id)
    const newVersion = options.newVersion ?? true
    const version = newVersion ? current.version + 1 : current.version
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .update(recipes)
        .set({ ...this.columns(data), version, updatedAt: now })
        .where(eq(recipes.id, id))
        .run()
      this.db
        .update(recipeLines)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(recipeLines.recipeId, id), isNull(recipeLines.deletedAt)))
        .run()
      this.writeLines(id, data, now)
      if (data.kind === 'prep') this.ensurePrepIngredient(id, data)
      this.assertNoPrepCycle(id)
      if (newVersion) {
        this.snapshot(id, version, options.label ?? null, now)
      } else {
        // A correction rewrites the snapshot of the current version.
        this.db
          .update(recipeHistory)
          .set({ snapshot: this.snapshotOf(id), updatedAt: now })
          .where(and(eq(recipeHistory.recipeId, id), eq(recipeHistory.version, version)))
          .run()
      }
      this.index(id, data)
    })
    return this.get(id)
  }

  setStatus(id: string, status: RecipeDetail['status']): RecipeSummary {
    this.row(id)
    this.db.update(recipes).set({ status, updatedAt: this.ids.now() }).where(eq(recipes.id, id)).run()
    return this.summary(id)
  }

  setFavorite(id: string, isFavorite: boolean): RecipeSummary {
    this.row(id)
    this.db.update(recipes).set({ isFavorite, updatedAt: this.ids.now() }).where(eq(recipes.id, id)).run()
    return this.summary(id)
  }

  /** A new recipe derived from another one (parent_recipe_id), as a draft. */
  createVariant(id: string, name: string): RecipeDetail {
    const source = this.get(id)
    const { lines, ...rest } = source
    return this.create({
      ...stripDetail(rest),
      name,
      status: 'draft',
      origin: 'mine',
      parentRecipeId: id,
      lines: lines.map(({ id: _lineId, ...line }) => line),
    })
  }

  /** Soft delete; `restore` undoes it during the 8 seconds of the toast (section 10.1). */
  delete(id: string): void {
    this.row(id)
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db.update(recipes).set({ deletedAt: now, updatedAt: now }).where(eq(recipes.id, id)).run()
      removeFromIndex(this.db.$client, 'recipe', id)
    })
  }

  restore(id: string): RecipeDetail {
    const row = this.db.select().from(recipes).where(eq(recipes.id, id)).get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown recipe')
    this.db.transaction(() => {
      this.db
        .update(recipes)
        .set({ deletedAt: null, updatedAt: this.ids.now() })
        .where(eq(recipes.id, id))
        .run()
      this.index(id, recipeInputSchema.parse(stripDetail(this.get(id))))
    })
    return this.get(id)
  }

  /**
   * Quick idea (section 10.2): a name, free-text ingredients, a note. Known ingredients are
   * matched by name or alias; unknown ones are created in « À classer ».
   */
  quickIdea(input: QuickIdea): RecipeDetail {
    const data = quickIdeaSchema.parse(input)
    return this.db.transaction(() => {
      const ingredientIds: string[] = []
      for (const label of data.ingredients) {
        const existing = this.ingredientRepository.findByName(label)[0]
        const ingredient =
          existing ??
          this.ingredientRepository.create({
            name: label,
            categoryId: this.ingredientRepository.unsortedCategoryId(),
          })
        if (!ingredientIds.includes(ingredient.id)) ingredientIds.push(ingredient.id)
      }
      return this.create({
        name: data.name,
        status: 'idea',
        notes: data.note,
        lines: ingredientIds.map((ingredientId) => ({ ingredientId, quantity: null, unit: 'ml' })),
      })
    })
  }

  /** Full snapshot of a version, as stored in recipe_history. */
  snapshotOf(id: string): RecipeDetail {
    return this.get(id)
  }

  private row(id: string): RecipeRow {
    const row = this.db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown recipe')
    return row
  }

  private summary(id: string): RecipeSummary {
    const found = this.list().find((r) => r.id === id)
    if (!found) throw new DomainError('NOT_FOUND', 'Unknown recipe')
    return found
  }

  private columns(data: RecipeInputParsed) {
    return {
      name: data.name,
      nameNormalized: normalizeName(data.name),
      kind: data.kind,
      status: data.status,
      origin: data.origin,
      credit: data.credit,
      family: data.family,
      method: data.method,
      glassId: data.glassId,
      iceId: data.iceId,
      garnish: data.garnish,
      steps: data.steps,
      notes: data.notes,
      tags: data.tags,
      dilutionOverridePct: data.dilutionOverridePct,
      parentRecipeId: data.parentRecipeId,
      yieldMl: data.yieldMl,
      shelfLifeDays: data.shelfLifeDays,
      storageNotes: data.storageNotes,
      drinkLength: data.drinkLength,
      servingMoment: data.servingMoment,
      profile: data.profile,
      garnishCostHtCents: data.garnishCostHtCents,
    }
  }

  private writeLines(recipeId: string, data: RecipeInputParsed, now: number): void {
    const known = new Set(
      this.db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(
          and(
            inArray(ingredients.id, data.lines.map((l) => l.ingredientId).concat('')),
            isNull(ingredients.deletedAt),
          ),
        )
        .all()
        .map((r) => r.id),
    )
    data.lines.forEach((line, index) => {
      if (!known.has(line.ingredientId)) throw new DomainError('NOT_FOUND', 'Unknown ingredient in a line')
      this.db
        .insert(recipeLines)
        .values({ id: this.ids.newId(), createdAt: now, updatedAt: now, recipeId, sortOrder: index, ...line })
        .run()
    })
  }

  /** A preparation is also an ingredient (section 7): create or rename it. */
  private ensurePrepIngredient(recipeId: string, data: RecipeInputParsed): void {
    const existing = this.db
      .select()
      .from(ingredients)
      .where(and(eq(ingredients.prepRecipeId, recipeId), isNull(ingredients.deletedAt)))
      .get()
    const categoryId =
      data.prepCategoryId ?? existing?.categoryId ?? this.ingredientRepository.unsortedCategoryId()
    if (existing) {
      this.db
        .update(ingredients)
        .set({
          name: data.name,
          nameNormalized: normalizeName(data.name),
          categoryId,
          updatedAt: this.ids.now(),
        })
        .where(eq(ingredients.id, existing.id))
        .run()
      return
    }
    this.ingredientRepository.create({ name: data.name, categoryId }, { prepRecipeId: recipeId })
  }

  /** Refuses a preparation that would use itself, directly or through a chain (section 7). */
  private assertNoPrepCycle(recipeId: string): void {
    const visit = (current: string, path: Set<string>): void => {
      const lineIngredients = this.db
        .select({ prepRecipeId: ingredients.prepRecipeId })
        .from(recipeLines)
        .innerJoin(ingredients, eq(ingredients.id, recipeLines.ingredientId))
        .where(and(eq(recipeLines.recipeId, current), isNull(recipeLines.deletedAt)))
        .all()
      for (const { prepRecipeId } of lineIngredients) {
        if (prepRecipeId === null) continue
        if (prepRecipeId === recipeId || path.has(prepRecipeId)) {
          throw new DomainError(
            'CONFLICT',
            'A preparation cannot use itself, directly or through another one',
          )
        }
        visit(prepRecipeId, new Set([...path, prepRecipeId]))
      }
    }
    visit(recipeId, new Set([recipeId]))
  }

  private snapshot(id: string, version: number, label: string | null, now: number): void {
    this.db
      .insert(recipeHistory)
      .values({
        id: this.ids.newId(),
        createdAt: now,
        updatedAt: now,
        recipeId: id,
        version,
        snapshot: this.snapshotOf(id),
        label,
      })
      .run()
  }

  private index(id: string, data: RecipeInputParsed): void {
    indexEntity(this.db.$client, 'recipe', id, {
      title: data.name,
      aliases: data.tags,
      body: [data.notes, data.garnish, data.profile, data.credit, ...data.steps],
    })
  }
}

/** Drops the read-only fields of a detail to reuse it as an input. */
function stripDetail(detail: Omit<RecipeDetail, 'lines'> & { lines?: RecipeDetail['lines'] }): RecipeInput {
  const {
    id: _id,
    version: _v,
    isFavorite: _f,
    createdAt: _c,
    updatedAt: _u,
    history: _h,
    lines,
    ...rest
  } = detail
  return { ...rest, lines: (lines ?? []).map(({ id: _lineId, ...line }) => line) }
}
