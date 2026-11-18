/**
 * Homemade preparations and batches (section 10.9), collections (section 10.10) and the
 * revision journal (section 10.11). Reads go through prepared SQL: they join many tables and
 * only return plain rows; writes stay in Drizzle.
 */
import { and, eq, isNull } from 'drizzle-orm'
import { mistakesToReview } from '../../../core/practice'
import { bestBeforeFrom } from '../../../core/shelf-life'
import {
  batchInputSchema,
  collectionInputSchema,
  practiceFinishSchema,
  type Batch,
  type BatchInput,
  type CollectionDetail,
  type CollectionInput,
  type CollectionItem,
  type CollectionSummary,
  type PracticeCorpusData,
  type PracticeFinish,
  type PracticeSession,
  type PrepOverview,
} from '../../../shared/domain/workshop'
import { DomainError } from '../../errors'
import type { Db, Ids } from '../client'
import {
  collectionItems,
  collections,
  practiceAnswers,
  practiceSessions,
  prepBatches,
  recipes,
} from '../schema'

type Row = Record<string, unknown>

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const num = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const json = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/** « 40 % vol » with a French decimal comma, for a minimum ABV stored as a number. */
function abvText(value: number): string {
  return `${String(value).replace('.', ',')}${String.fromCharCode(0xa0)}% vol`
}

export class WorkshopRepository {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
  ) {}

  private all(query: string, ...params: unknown[]): Row[] {
    return this.db.$client.prepare(query).all(...params) as Row[]
  }

  private one(query: string, ...params: unknown[]): Row | undefined {
    return this.db.$client.prepare(query).get(...params) as Row | undefined
  }

  // -------------------------------------------------------------------------------------
  // Preparations
  // -------------------------------------------------------------------------------------

  listPreps(): PrepOverview[] {
    const batches = new Map<string, Batch[]>()
    for (const row of this.all(
      `SELECT * FROM prep_batches WHERE deleted_at IS NULL
       ORDER BY status = 'active' DESC, best_before IS NULL, best_before, made_at DESC`,
    )) {
      const batch = this.toBatch(row)
      const list = batches.get(batch.recipeId) ?? []
      // Every batch in use, and the last ten finished or thrown away.
      if (batch.status === 'active' || list.filter((b) => b.status !== 'active').length < 10) list.push(batch)
      batches.set(batch.recipeId, list)
    }
    return this.all(
      `SELECT id, name, status, shelf_life_days, yield_ml, storage_notes FROM recipes
       WHERE kind = 'prep' AND deleted_at IS NULL ORDER BY name_normalized`,
    ).map((row) => ({
      recipeId: String(row['id']),
      name: String(row['name']),
      status: row['status'] as PrepOverview['status'],
      shelfLifeDays: num(row['shelf_life_days']),
      yieldMl: num(row['yield_ml']),
      storageNotes: str(row['storage_notes']),
      batches: batches.get(String(row['id'])) ?? [],
    }))
  }

  /** New batch: the best-before date follows the shelf life of the preparation, if any. */
  createBatch(input: BatchInput): Batch {
    const data = batchInputSchema.parse(input)
    const recipe = this.one(
      "SELECT shelf_life_days FROM recipes WHERE id = ? AND kind = 'prep' AND deleted_at IS NULL",
      data.recipeId,
    )
    if (!recipe) throw new DomainError('NOT_FOUND', 'Unknown preparation')
    const shelfLife = num(recipe['shelf_life_days'])
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db
      .insert(prepBatches)
      .values({
        id,
        createdAt: now,
        updatedAt: now,
        recipeId: data.recipeId,
        madeAt: data.madeAt,
        quantityMl: data.quantityMl,
        bestBefore: shelfLife === null ? null : bestBeforeFrom(data.madeAt, shelfLife),
        status: 'active',
        notes: data.notes,
      })
      .run()
    return this.batch(id)
  }

  setBatchStatus(id: string, status: Batch['status']): Batch {
    this.batch(id)
    this.db.update(prepBatches).set({ status, updatedAt: this.ids.now() }).where(eq(prepBatches.id, id)).run()
    return this.batch(id)
  }

  deleteBatch(id: string): void {
    this.batch(id)
    const now = this.ids.now()
    this.db.update(prepBatches).set({ deletedAt: now, updatedAt: now }).where(eq(prepBatches.id, id)).run()
  }

  private batch(id: string): Batch {
    const row = this.one('SELECT * FROM prep_batches WHERE id = ? AND deleted_at IS NULL', id)
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown batch')
    return this.toBatch(row)
  }

  private toBatch(row: Row): Batch {
    return {
      id: String(row['id']),
      recipeId: String(row['recipe_id']),
      madeAt: Number(row['made_at']),
      quantityMl: num(row['quantity_ml']),
      bestBefore: num(row['best_before']),
      status: row['status'] as Batch['status'],
      notes: str(row['notes']),
    }
  }

  // -------------------------------------------------------------------------------------
  // Collections
  // -------------------------------------------------------------------------------------

  listCollections(): CollectionSummary[] {
    const recipesOf = new Map<string, string[]>()
    const sheets = new Map<string, number>()
    for (const row of this.all(
      `SELECT ci.collection_id AS cid, ci.recipe_id AS rid FROM collection_items ci
       LEFT JOIN recipes r ON r.id = ci.recipe_id
       WHERE ci.deleted_at IS NULL AND (ci.recipe_id IS NULL OR r.deleted_at IS NULL)
       ORDER BY ci.sort_order`,
    )) {
      const cid = String(row['cid'])
      const rid = str(row['rid'])
      if (rid === null) sheets.set(cid, (sheets.get(cid) ?? 0) + 1)
      else recipesOf.set(cid, [...(recipesOf.get(cid) ?? []), rid])
    }
    return this.all(
      'SELECT * FROM collections WHERE deleted_at IS NULL ORDER BY sort_order, updated_at DESC',
    ).map((row) => ({
      ...this.toCollection(row),
      recipeIds: recipesOf.get(String(row['id'])) ?? [],
      sheetCount: sheets.get(String(row['id'])) ?? 0,
    }))
  }

  getCollection(id: string): CollectionDetail {
    const row = this.collectionRow(id)
    const items = this.all(
      `SELECT ci.*, r.name AS recipe_name, r.status AS recipe_status, r.family AS recipe_family,
              r.version AS recipe_version, s.title AS sheet_title
       FROM collection_items ci
       LEFT JOIN recipes r ON r.id = ci.recipe_id
       LEFT JOIN knowledge_sheets s ON s.id = ci.sheet_id
       WHERE ci.collection_id = ? AND ci.deleted_at IS NULL
         AND (ci.recipe_id IS NULL OR r.deleted_at IS NULL)
         AND (ci.sheet_id IS NULL OR s.deleted_at IS NULL)
       ORDER BY ci.sort_order, ci.created_at`,
      id,
    ).map((item): CollectionItem => ({
      id: String(item['id']),
      recipeId: str(item['recipe_id']),
      sheetId: str(item['sheet_id']),
      title: str(item['recipe_name']) ?? str(item['sheet_title']) ?? '',
      status: (str(item['recipe_status']) as CollectionItem['status']) ?? null,
      family: (str(item['recipe_family']) as CollectionItem['family']) ?? null,
      version: num(item['recipe_version']),
      note: str(item['note']),
      salePriceCents: num(item['sale_price_cents']),
      sortOrder: Number(item['sort_order']),
    }))
    return { ...this.toCollection(row), items }
  }

  createCollection(input: CollectionInput): CollectionSummary {
    const data = collectionInputSchema.parse(input)
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db
      .insert(collections)
      .values({ id, createdAt: now, updatedAt: now, ...data })
      .run()
    return this.summary(id)
  }

  updateCollection(id: string, input: CollectionInput): CollectionSummary {
    const data = collectionInputSchema.parse(input)
    this.collectionRow(id)
    this.db
      .update(collections)
      .set({ ...data, updatedAt: this.ids.now() })
      .where(eq(collections.id, id))
      .run()
    return this.summary(id)
  }

  deleteCollection(id: string): void {
    this.collectionRow(id)
    const now = this.ids.now()
    this.db.update(collections).set({ deletedAt: now, updatedAt: now }).where(eq(collections.id, id)).run()
  }

  restoreCollection(id: string): CollectionSummary {
    const row = this.one('SELECT id FROM collections WHERE id = ?', id)
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown collection')
    this.db
      .update(collections)
      .set({ deletedAt: null, updatedAt: this.ids.now() })
      .where(eq(collections.id, id))
      .run()
    return this.summary(id)
  }

  /** Adds recipes at the end, each once: a recipe already in the collection is left in place. */
  addRecipes(id: string, recipeIds: readonly string[]): CollectionSummary {
    this.collectionRow(id)
    const present = new Set(
      this.all(
        'SELECT recipe_id AS rid FROM collection_items WHERE collection_id = ? AND deleted_at IS NULL AND recipe_id IS NOT NULL',
        id,
      ).map((row) => String(row['rid'])),
    )
    const last = this.one(
      'SELECT COALESCE(MAX(sort_order), -1) AS n FROM collection_items WHERE collection_id = ? AND deleted_at IS NULL',
      id,
    )
    let order = Number(last?.['n'] ?? -1)
    const now = this.ids.now()
    this.db.transaction((tx) => {
      for (const recipeId of new Set(recipeIds)) {
        if (present.has(recipeId)) continue
        const recipe = tx
          .select({ id: recipes.id })
          .from(recipes)
          .where(and(eq(recipes.id, recipeId), isNull(recipes.deletedAt)))
          .get()
        if (!recipe) throw new DomainError('NOT_FOUND', 'Unknown recipe')
        order += 1
        tx.insert(collectionItems)
          .values({
            id: this.ids.newId(),
            createdAt: now,
            updatedAt: now,
            collectionId: id,
            recipeId,
            sortOrder: order,
          })
          .run()
      }
      tx.update(collections).set({ updatedAt: now }).where(eq(collections.id, id)).run()
    })
    return this.summary(id)
  }

  updateItem(id: string, data: { note: string | null; salePriceCents: number | null }): void {
    this.item(id)
    this.db
      .update(collectionItems)
      .set({ note: data.note, salePriceCents: data.salePriceCents, updatedAt: this.ids.now() })
      .where(eq(collectionItems.id, id))
      .run()
  }

  removeItem(id: string): void {
    this.item(id)
    const now = this.ids.now()
    this.db
      .update(collectionItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(collectionItems.id, id))
      .run()
  }

  /** New free order of the items; ids of another collection are refused. */
  reorder(id: string, itemIds: readonly string[]): void {
    const current = new Set(
      this.all(
        'SELECT id FROM collection_items WHERE collection_id = ? AND deleted_at IS NULL',
        this.collectionRow(id)['id'],
      ).map((row) => String(row['id'])),
    )
    if (itemIds.some((itemId) => !current.has(itemId))) throw new DomainError('NOT_FOUND', 'Unknown item')
    const now = this.ids.now()
    this.db.transaction((tx) => {
      itemIds.forEach((itemId, index) => {
        tx.update(collectionItems)
          .set({ sortOrder: index, updatedAt: now })
          .where(eq(collectionItems.id, itemId))
          .run()
      })
    })
  }

  private item(id: string): Row {
    const row = this.one('SELECT * FROM collection_items WHERE id = ? AND deleted_at IS NULL', id)
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown item')
    return row
  }

  private collectionRow(id: string): Row {
    const row = this.one('SELECT * FROM collections WHERE id = ? AND deleted_at IS NULL', id)
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown collection')
    return row
  }

  private summary(id: string): CollectionSummary {
    const found = this.listCollections().find((collection) => collection.id === id)
    if (!found) throw new DomainError('NOT_FOUND', 'Unknown collection')
    return found
  }

  private toCollection(row: Row) {
    return {
      id: String(row['id']),
      name: String(row['name']),
      description: str(row['description']),
      kind: row['kind'] as CollectionSummary['kind'],
      updatedAt: Number(row['updated_at']),
    }
  }

  // -------------------------------------------------------------------------------------
  // Revision
  // -------------------------------------------------------------------------------------

  /**
   * Data of the questions of a collection. A recipe with a frozen socle reference is revised
   * from it (labels and doses as printed); otherwise from the working recipe. Summary tables
   * come from the notebooks of the collection's sheets and references.
   */
  practiceCorpus(id: string): PracticeCorpusData {
    const detail = this.getCollection(id)
    const guides = new Set<string>()
    const corpus: PracticeCorpusData = { recipes: [], sheets: [], rows: [] }

    for (const item of detail.items) {
      if (item.recipeId !== null) {
        const recipe = this.one(
          `SELECT r.*, g.name AS glass_name, i.name AS ice_name FROM recipes r
           LEFT JOIN glasses g ON g.id = r.glass_id LEFT JOIN ice_types i ON i.id = r.ice_id
           WHERE r.id = ?`,
          item.recipeId,
        )
        if (!recipe) continue
        const spec = this.one(
          `SELECT * FROM reference_specs WHERE recipe_id = ? AND kind = 'socle' AND deleted_at IS NULL
           ORDER BY sort_order LIMIT 1`,
          item.recipeId,
        )
        if (spec && str(spec['guide_id'])) guides.add(String(spec['guide_id']))
        const lines = spec
          ? this.all(
              'SELECT id, label, dose_text, quantity, unit FROM reference_spec_lines WHERE spec_id = ? AND deleted_at IS NULL ORDER BY sort_order',
              spec['id'],
            ).map((line) => ({
              id: String(line['id']),
              label: String(line['label']),
              doseText: str(line['dose_text']),
              quantity: num(line['quantity']),
              unit: line['unit'] as PracticeCorpusData['recipes'][number]['lines'][number]['unit'],
            }))
          : this.all(
              `SELECT l.id, i.name AS label, l.quantity, l.unit FROM recipe_lines l
               JOIN ingredients i ON i.id = l.ingredient_id
               WHERE l.recipe_id = ? AND l.deleted_at IS NULL AND l.is_garnish = 0 ORDER BY l.sort_order`,
              item.recipeId,
            ).map((line) => ({
              id: String(line['id']),
              label: String(line['label']),
              doseText: null,
              quantity: num(line['quantity']),
              unit: line['unit'] as PracticeCorpusData['recipes'][number]['lines'][number]['unit'],
            }))
        corpus.recipes.push({
          id: spec ? String(spec['id']) : item.recipeId,
          subjectType: spec ? 'reference_spec' : 'recipe',
          name: String(recipe['name']),
          lines,
          method: (str(recipe['method']) as PracticeCorpusData['recipes'][number]['method']) ?? null,
          methodLabel: spec ? str(spec['method_label']) : null,
          glass: (spec ? str(spec['glass_label']) : null) ?? str(recipe['glass_name']),
          ice: str(recipe['ice_name']),
          garnish: (spec ? str(spec['garnish']) : null) ?? str(recipe['garnish']),
          steps:
            (spec ? json<string[] | null>(spec['steps'], null) : null) ?? json<string[]>(recipe['steps'], []),
          drinkLength: (str(recipe['drink_length']) as 'short' | 'long' | null) ?? null,
          servingMoment:
            (str(recipe['serving_moment']) as 'before_dinner' | 'all_day' | 'after_dinner' | null) ?? null,
          family: (str(recipe['family']) as PracticeCorpusData['recipes'][number]['family']) ?? null,
          familyLabel: spec ? (str(spec['family_short_label']) ?? str(spec['family_label'])) : null,
          statedAbvPct: spec ? num(spec['stated_abv_pct']) : null,
        })
      } else if (item.sheetId !== null) {
        const sheet = this.one('SELECT * FROM knowledge_sheets WHERE id = ?', item.sheetId)
        if (!sheet) continue
        if (str(sheet['guide_id'])) guides.add(String(sheet['guide_id']))
        const minAbvPct = num(sheet['min_abv_pct'])
        corpus.sheets.push({
          id: item.sheetId,
          title: str(sheet['title']) ?? item.title,
          classLabel: str(sheet['class_label']),
          minAbv: str(sheet['min_abv_label']) ?? (minAbvPct === null ? null : abvText(minAbvPct)),
          origin: str(sheet['origin_label']),
          takeaway: str(sheet['key_takeaway']),
          cards: this.all(
            `SELECT k.id, k.prompt, k.body FROM knowledge_items k
             JOIN knowledge_sections s ON s.id = k.section_id
             WHERE s.sheet_id = ? AND k.kind = 'qa' AND k.deleted_at IS NULL AND s.deleted_at IS NULL
             ORDER BY s.sort_order, k.sort_order`,
            item.sheetId,
          ).map((card) => ({
            id: String(card['id']),
            prompt: str(card['prompt']) ?? '',
            answer: str(card['body']) ?? '',
          })),
        })
      }
    }

    for (const guideId of guides) {
      for (const table of this.all(
        'SELECT * FROM study_tables WHERE guide_id = ? AND deleted_at IS NULL ORDER BY sort_order',
        guideId,
      )) {
        const columns = json<string[]>(table['columns'], [])
        const quiz = json<number[]>(table['quiz_columns'], [])
        for (const row of this.all(
          'SELECT id, cells FROM study_table_rows WHERE table_id = ? AND deleted_at IS NULL ORDER BY sort_order',
          table['id'],
        )) {
          const cells = json<Array<string | null>>(row['cells'], [])
          corpus.rows.push({
            id: String(row['id']),
            table: String(table['title']),
            label: cells[0] ?? '',
            cells: quiz
              .filter((column) => column > 0 && column < columns.length)
              .map((column) => ({ column, name: columns[column] ?? '', value: cells[column] ?? null })),
          })
        }
      }
    }
    return corpus
  }

  /** Questions answered wrongly the last time they were asked, all sessions together. */
  weakKeys(): string[] {
    return mistakesToReview(
      this.all(
        'SELECT question_key, is_correct, answered_at FROM practice_answers WHERE deleted_at IS NULL',
      ).map((row) => ({
        questionKey: String(row['question_key']),
        isCorrect: row['is_correct'] === null ? null : row['is_correct'] === 1,
        answeredAt: Number(row['answered_at']),
      })),
    )
  }

  /** Writes a finished session and its answers (append only). */
  finishPractice(input: PracticeFinish): PracticeSession {
    const data = practiceFinishSchema.parse(input)
    if (data.collectionId !== null) this.collectionRow(data.collectionId)
    const id = this.ids.newId()
    const now = this.ids.now()
    const score = data.answers.filter((answer) => answer.isCorrect === true).length
    this.db.transaction((tx) => {
      tx.insert(practiceSessions)
        .values({
          id,
          createdAt: now,
          updatedAt: now,
          collectionId: data.collectionId,
          score,
          total: data.answers.length,
          mistakes: data.answers
            .filter((answer) => answer.isCorrect === false)
            .map((answer) => answer.questionKey),
          finishedAt: now,
          mode: data.mode,
          questionTypes: [...new Set(data.answers.map((answer) => answer.generator))],
        })
        .run()
      for (const answer of data.answers) {
        tx.insert(practiceAnswers)
          .values({ id: this.ids.newId(), createdAt: now, updatedAt: now, sessionId: id, ...answer })
          .run()
      }
    })
    const session = this.history().find((entry) => entry.id === id)
    if (!session) throw new DomainError('INTERNAL', 'Session not written')
    return session
  }

  history(): PracticeSession[] {
    return this.all(
      `SELECT p.*, c.name AS collection_name FROM practice_sessions p
       LEFT JOIN collections c ON c.id = p.collection_id
       WHERE p.deleted_at IS NULL ORDER BY p.finished_at DESC LIMIT 200`,
    ).map((row) => ({
      id: String(row['id']),
      collectionId: str(row['collection_id']),
      collectionName: str(row['collection_name']),
      mode: row['mode'] as PracticeSession['mode'],
      score: Number(row['score']),
      total: Number(row['total']),
      finishedAt: Number(row['finished_at']),
    }))
  }
}
