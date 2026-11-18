/** Tasting journal and notebook (sections 10.6 and 10.7): schemas shared by main and renderer. */
import { z } from 'zod'

const id = z.string().min(1).max(36)
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value))

/** Criteria scored from −2 (too little) to +2 (too much), 0 being right (section 7). */
export const TASTING_CRITERIA = [
  'balance',
  'sweetness',
  'acidity',
  'bitterness',
  'strength',
  'dilution',
  'texture',
  'aroma',
] as const

export type TastingCriterion = (typeof TASTING_CRITERIA)[number]

const score = z.number().int().min(-2).max(2)

export const tastingScoresSchema = z
  .object(Object.fromEntries(TASTING_CRITERIA.map((criterion) => [criterion, score.optional()])))
  .strict() as z.ZodType<Partial<Record<TastingCriterion, number>>>

export const tastingInputSchema = z
  .object({
    recipeId: id,
    recipeVersion: z.number().int().min(1).max(100_000),
    tastedAt: z.number().int().min(0),
    overall: z.number().int().min(1).max(5).nullable().default(null),
    scores: tastingScoresSchema.default({}),
    comment: text(4000).default(null),
    nextStep: text(1000).default(null),
    context: text(300).default(null),
  })
  .strict()

export const tastingNoteSchema = z
  .object({
    id,
    recipeId: id,
    recipeName: z.string(),
    recipeVersion: z.number().int(),
    tastedAt: z.number().int(),
    overall: z.number().int().nullable(),
    scores: z.record(z.string(), z.number()),
    comment: z.string().nullable(),
    nextStep: z.string().nullable(),
    nextStepDone: z.boolean(),
    context: z.string().nullable(),
  })
  .strict()

export type TastingInput = z.input<typeof tastingInputSchema>
export type TastingNote = z.output<typeof tastingNoteSchema>

export const NOTEBOOK_LINK_TYPES = ['recipe', 'ingredient', 'product'] as const

export const notebookLinkSchema = z.object({ entityType: z.enum(NOTEBOOK_LINK_TYPES), entityId: id }).strict()

export const notebookInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20_000).default(''),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    isPinned: z.boolean().default(false),
    links: z.array(notebookLinkSchema).max(100).default([]),
  })
  .strict()

export const notebookEntrySchema = z
  .object({
    id,
    title: z.string(),
    body: z.string(),
    tags: z.array(z.string()),
    isPinned: z.boolean(),
    updatedAt: z.number().int(),
    /** Linked items with their current name: a renamed recipe keeps its link; null once deleted. */
    links: z.array(
      z
        .object({ entityType: z.enum(NOTEBOOK_LINK_TYPES), entityId: id, name: z.string().nullable() })
        .strict(),
    ),
  })
  .strict()

export type NotebookInput = z.input<typeof notebookInputSchema>
export type NotebookEntry = z.output<typeof notebookEntrySchema>
