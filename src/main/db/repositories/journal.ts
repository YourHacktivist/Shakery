/**
 * Tasting journal (section 10.6) and notebook (section 10.7). Each tasting note points to the
 * version that was tasted; notebook links are stored by id, so they survive a renaming.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import {
  notebookInputSchema,
  tastingInputSchema,
  type NotebookEntry,
  type NotebookInput,
  type TastingInput,
  type TastingNote,
} from '../../../shared/domain/journal'
import { DomainError } from '../../errors'
import type { Db, Ids } from '../client'
import { ingredients, notebookEntries, notebookLinks, products, recipes, tastingNotes } from '../schema'
import { indexEntity, removeFromIndex } from './search-index'

export class JournalRepository {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
  ) {}

  listTastings(
    filter: { recipeId?: string | undefined; toRetest?: boolean | undefined } = {},
  ): TastingNote[] {
    const conditions = [isNull(tastingNotes.deletedAt), isNull(recipes.deletedAt)]
    if (filter.recipeId) conditions.push(eq(tastingNotes.recipeId, filter.recipeId))
    if (filter.toRetest) conditions.push(eq(tastingNotes.nextStepDone, false))
    const rows = this.db
      .select({ note: tastingNotes, recipeName: recipes.name })
      .from(tastingNotes)
      .innerJoin(recipes, eq(recipes.id, tastingNotes.recipeId))
      .where(and(...conditions))
      .orderBy(desc(tastingNotes.tastedAt))
      .all()
    return rows
      .filter((row) => !filter.toRetest || (row.note.nextStep !== null && row.note.nextStep !== ''))
      .map((row) => this.toNote(row.note, row.recipeName))
  }

  createTasting(input: TastingInput): TastingNote {
    const data = tastingInputSchema.parse(input)
    const recipe = this.db
      .select({ name: recipes.name, version: recipes.version })
      .from(recipes)
      .where(and(eq(recipes.id, data.recipeId), isNull(recipes.deletedAt)))
      .get()
    if (!recipe) throw new DomainError('NOT_FOUND', 'Unknown recipe')
    if (data.recipeVersion > recipe.version) throw new DomainError('NOT_FOUND', 'Unknown version')
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .insert(tastingNotes)
        .values({ id, createdAt: now, updatedAt: now, ...data, nextStepDone: false })
        .run()
      this.indexTasting(id, recipe.name, data.comment, data.nextStep)
    })
    return this.tasting(id)
  }

  updateTasting(id: string, input: TastingInput): TastingNote {
    const data = tastingInputSchema.parse(input)
    const current = this.tasting(id)
    if (current.recipeId !== data.recipeId)
      throw new DomainError('INVALID_INPUT', 'A note stays on its recipe')
    this.db.transaction(() => {
      this.db
        .update(tastingNotes)
        .set({ ...data, updatedAt: this.ids.now() })
        .where(eq(tastingNotes.id, id))
        .run()
      this.indexTasting(id, current.recipeName, data.comment, data.nextStep)
    })
    return this.tasting(id)
  }

  setNextStepDone(id: string, done: boolean): TastingNote {
    this.tasting(id)
    this.db
      .update(tastingNotes)
      .set({ nextStepDone: done, updatedAt: this.ids.now() })
      .where(eq(tastingNotes.id, id))
      .run()
    return this.tasting(id)
  }

  deleteTasting(id: string): void {
    this.tasting(id)
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .update(tastingNotes)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(tastingNotes.id, id))
        .run()
      removeFromIndex(this.db.$client, 'tasting_note', id)
    })
  }

  private tasting(id: string): TastingNote {
    const row = this.db
      .select({ note: tastingNotes, recipeName: recipes.name })
      .from(tastingNotes)
      .innerJoin(recipes, eq(recipes.id, tastingNotes.recipeId))
      .where(and(eq(tastingNotes.id, id), isNull(tastingNotes.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown tasting note')
    return this.toNote(row.note, row.recipeName)
  }

  private toNote(note: typeof tastingNotes.$inferSelect, recipeName: string): TastingNote {
    return {
      id: note.id,
      recipeId: note.recipeId,
      recipeName,
      recipeVersion: note.recipeVersion,
      tastedAt: note.tastedAt,
      overall: note.overall,
      scores: note.scores,
      comment: note.comment,
      nextStep: note.nextStep,
      nextStepDone: note.nextStepDone,
      context: note.context,
    }
  }

  private indexTasting(
    id: string,
    recipeName: string,
    comment: string | null,
    nextStep: string | null,
  ): void {
    indexEntity(this.db.$client, 'tasting_note', id, { title: recipeName, body: [comment, nextStep] })
  }

  // -------------------------------------------------------------------------------------
  // Notebook
  // -------------------------------------------------------------------------------------

  listEntries(): NotebookEntry[] {
    const rows = this.db
      .select()
      .from(notebookEntries)
      .where(isNull(notebookEntries.deletedAt))
      .orderBy(desc(notebookEntries.isPinned), desc(notebookEntries.updatedAt))
      .all()
    const links = this.linksOf(rows.map((row) => row.id))
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tags: row.tags,
      isPinned: row.isPinned,
      updatedAt: row.updatedAt,
      links: links.get(row.id) ?? [],
    }))
  }

  createEntry(input: NotebookInput): NotebookEntry {
    const data = notebookInputSchema.parse(input)
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .insert(notebookEntries)
        .values({
          id,
          createdAt: now,
          updatedAt: now,
          title: data.title,
          body: data.body,
          tags: data.tags,
          isPinned: data.isPinned,
        })
        .run()
      this.writeLinks(id, data.links, now)
      indexEntity(this.db.$client, 'notebook_entry', id, {
        title: data.title,
        aliases: data.tags,
        body: [data.body],
      })
    })
    return this.entry(id)
  }

  updateEntry(id: string, input: NotebookInput): NotebookEntry {
    const data = notebookInputSchema.parse(input)
    this.entry(id)
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .update(notebookEntries)
        .set({ title: data.title, body: data.body, tags: data.tags, isPinned: data.isPinned, updatedAt: now })
        .where(eq(notebookEntries.id, id))
        .run()
      this.db
        .update(notebookLinks)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(notebookLinks.entryId, id), isNull(notebookLinks.deletedAt)))
        .run()
      this.writeLinks(id, data.links, now)
      indexEntity(this.db.$client, 'notebook_entry', id, {
        title: data.title,
        aliases: data.tags,
        body: [data.body],
      })
    })
    return this.entry(id)
  }

  deleteEntry(id: string): void {
    this.entry(id)
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .update(notebookEntries)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(notebookEntries.id, id))
        .run()
      removeFromIndex(this.db.$client, 'notebook_entry', id)
    })
  }

  private entry(id: string): NotebookEntry {
    const found = this.listEntries().find((entry) => entry.id === id)
    if (!found) throw new DomainError('NOT_FOUND', 'Unknown notebook entry')
    return found
  }

  private writeLinks(entryId: string, links: NotebookInput['links'] = [], now: number): void {
    const seen = new Set<string>()
    for (const link of links) {
      const key = `${link.entityType}:${link.entityId}`
      if (seen.has(key)) continue
      seen.add(key)
      this.db
        .insert(notebookLinks)
        .values({ id: this.ids.newId(), createdAt: now, updatedAt: now, entryId, ...link })
        .run()
    }
  }

  /** Links with the current name of the linked item, read at every display. */
  private linksOf(entryIds: string[]): Map<string, NotebookEntry['links']> {
    const out = new Map<string, NotebookEntry['links']>()
    if (entryIds.length === 0) return out
    const rows = this.db
      .select()
      .from(notebookLinks)
      .where(and(inArray(notebookLinks.entryId, entryIds), isNull(notebookLinks.deletedAt)))
      .all()
    const idsOf = (type: string) => rows.filter((row) => row.entityType === type).map((row) => row.entityId)
    const names = new Map<string, string>()
    const recipeIds = idsOf('recipe')
    if (recipeIds.length > 0) {
      for (const row of this.db
        .select({ id: recipes.id, name: recipes.name })
        .from(recipes)
        .where(and(inArray(recipes.id, recipeIds), isNull(recipes.deletedAt)))
        .all())
        names.set(`recipe:${row.id}`, row.name)
    }
    const ingredientIds = idsOf('ingredient')
    if (ingredientIds.length > 0) {
      for (const row of this.db
        .select({ id: ingredients.id, name: ingredients.name })
        .from(ingredients)
        .where(and(inArray(ingredients.id, ingredientIds), isNull(ingredients.deletedAt)))
        .all())
        names.set(`ingredient:${row.id}`, row.name)
    }
    const productIds = idsOf('product')
    if (productIds.length > 0) {
      for (const row of this.db
        .select({ id: products.id, brand: products.brand, name: products.name })
        .from(products)
        .where(and(inArray(products.id, productIds), isNull(products.deletedAt)))
        .all())
        names.set(`product:${row.id}`, row.brand ? `${row.brand} ${row.name}` : row.name)
    }
    for (const row of rows) {
      if (row.entityType === 'sheet') continue
      const list = out.get(row.entryId) ?? []
      list.push({
        entityType: row.entityType,
        entityId: row.entityId,
        name: names.get(`${row.entityType}:${row.entityId}`) ?? null,
      })
      out.set(row.entryId, list)
    }
    return out
  }
}
