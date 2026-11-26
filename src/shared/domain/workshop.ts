/**
 * Homemade preparations, collections and revision (sections 10.9 to 10.11): schemas shared by
 * the main process and the renderer.
 */
import { z } from 'zod'
import { FAMILY_VALUES, METHOD_VALUES, STATUS_VALUES, UNIT_VALUES } from './catalog'

const id = z.string().min(1).max(36)
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value))

// ---------------------------------------------------------------------------------------
// Preparations and batches
// ---------------------------------------------------------------------------------------

export const BATCH_STATUSES = ['active', 'finished', 'discarded'] as const

export const batchSchema = z
  .object({
    id,
    recipeId: id,
    madeAt: z.number().int(),
    quantityMl: z.number().int().nullable(),
    bestBefore: z.number().int().nullable(),
    status: z.enum(BATCH_STATUSES),
    notes: z.string().nullable(),
  })
  .strict()

export const prepOverviewSchema = z
  .object({
    recipeId: id,
    name: z.string(),
    status: z.enum(STATUS_VALUES),
    shelfLifeDays: z.number().int().nullable(),
    yieldMl: z.number().int().nullable(),
    storageNotes: z.string().nullable(),
    /** Names of the ingredients, in the order of the recipe, garnish left out. */
    composition: z.array(z.string()).max(100),
    /** Batches still in use, soonest best-before first, then the last ten finished ones. */
    batches: z.array(batchSchema).max(1000),
  })
  .strict()

export const batchInputSchema = z
  .object({
    recipeId: id,
    madeAt: z.number().int().min(0),
    quantityMl: z.number().int().positive().max(100_000).nullable().default(null),
    notes: text(1000).default(null),
  })
  .strict()

export type Batch = z.output<typeof batchSchema>
export type PrepOverview = z.output<typeof prepOverviewSchema>
export type BatchInput = z.input<typeof batchInputSchema>

// ---------------------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------------------

export const COLLECTION_KIND_VALUES = ['menu', 'competition', 'theme', 'other'] as const

export const collectionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: text(2000).default(null),
    kind: z.enum(COLLECTION_KIND_VALUES).default('other'),
  })
  .strict()

export const collectionSummarySchema = z
  .object({
    id,
    name: z.string(),
    description: z.string().nullable(),
    kind: z.enum(COLLECTION_KIND_VALUES),
    updatedAt: z.number().int(),
    /** Recipes of the collection, for « ajouter à une collection » on a recipe. */
    recipeIds: z.array(id).max(5000),
    sheetCount: z.number().int(),
  })
  .strict()

export const collectionItemSchema = z
  .object({
    id,
    recipeId: id.nullable(),
    sheetId: id.nullable(),
    title: z.string(),
    /** Status of a recipe; null for a culture sheet. */
    status: z.enum(STATUS_VALUES).nullable(),
    family: z.enum(FAMILY_VALUES).nullable(),
    version: z.number().int().nullable(),
    note: z.string().nullable(),
    salePriceCents: z.number().int().nullable(),
    sortOrder: z.number().int(),
  })
  .strict()

export const collectionDetailSchema = collectionSummarySchema
  .omit({ recipeIds: true, sheetCount: true })
  .extend({ items: z.array(collectionItemSchema).max(5000) })
  .strict()

export const collectionItemInputSchema = z
  .object({
    id,
    note: text(1000),
    salePriceCents: z.number().int().min(0).max(10_000_000).nullable(),
  })
  .strict()

export type CollectionInput = z.input<typeof collectionInputSchema>
export type CollectionSummary = z.output<typeof collectionSummarySchema>
export type CollectionItem = z.output<typeof collectionItemSchema>
export type CollectionDetail = z.output<typeof collectionDetailSchema>

// ---------------------------------------------------------------------------------------
// Revision
// ---------------------------------------------------------------------------------------

export const PRACTICE_SUBJECTS = ['recipe', 'reference_spec', 'sheet', 'item', 'table_row'] as const

/** Raw data of a collection for the question generators; the renderer writes the labels. */
export const practiceCorpusSchema = z
  .object({
    recipes: z
      .array(
        z
          .object({
            id,
            subjectType: z.enum(['recipe', 'reference_spec']),
            name: z.string(),
            lines: z
              .array(
                z
                  .object({
                    id,
                    label: z.string(),
                    doseText: z.string().nullable(),
                    quantity: z.number().nullable(),
                    unit: z.enum(UNIT_VALUES),
                  })
                  .strict(),
              )
              .max(60),
            method: z.enum(METHOD_VALUES).nullable(),
            methodLabel: z.string().nullable(),
            glass: z.string().nullable(),
            ice: z.string().nullable(),
            garnish: z.string().nullable(),
            steps: z.array(z.string()).max(60),
            drinkLength: z.enum(['short', 'long']).nullable(),
            servingMoment: z.enum(['before_dinner', 'all_day', 'after_dinner']).nullable(),
            family: z.enum(FAMILY_VALUES).nullable(),
            familyLabel: z.string().nullable(),
            statedAbvPct: z.number().nullable(),
          })
          .strict(),
      )
      .max(5000),
    sheets: z
      .array(
        z
          .object({
            id,
            title: z.string(),
            classLabel: z.string().nullable(),
            minAbv: z.string().nullable(),
            origin: z.string().nullable(),
            takeaway: z.string().nullable(),
            cards: z.array(z.object({ id, prompt: z.string(), answer: z.string() }).strict()).max(500),
          })
          .strict(),
      )
      .max(5000),
    rows: z
      .array(
        z
          .object({
            id,
            table: z.string(),
            label: z.string(),
            cells: z
              .array(
                z
                  .object({ column: z.number().int(), name: z.string(), value: z.string().nullable() })
                  .strict(),
              )
              .max(40),
          })
          .strict(),
      )
      .max(20_000),
  })
  .strict()

export const practiceAnswerInputSchema = z
  .object({
    questionKey: z.string().min(1).max(200),
    generator: z.string().min(1).max(40),
    subjectType: z.enum(PRACTICE_SUBJECTS),
    subjectId: id,
    expected: z.string().max(4000),
    response: z.string().max(4000).nullable(),
    isCorrect: z.boolean().nullable(),
    selfGraded: z.boolean(),
    answeredAt: z.number().int().min(0),
  })
  .strict()

export const practiceFinishSchema = z
  .object({
    collectionId: id.nullable(),
    mode: z.enum(['quiz', 'flashcards']),
    answers: z.array(practiceAnswerInputSchema).min(1).max(500),
  })
  .strict()

export const practiceSessionSchema = z
  .object({
    id,
    collectionId: id.nullable(),
    collectionName: z.string().nullable(),
    mode: z.enum(['quiz', 'flashcards', 'calc']),
    score: z.number().int(),
    total: z.number().int(),
    finishedAt: z.number().int(),
  })
  .strict()

export type PracticeCorpusData = z.output<typeof practiceCorpusSchema>
export type PracticeAnswerInput = z.input<typeof practiceAnswerInputSchema>
export type PracticeFinish = z.input<typeof practiceFinishSchema>
export type PracticeSession = z.output<typeof practiceSessionSchema>
