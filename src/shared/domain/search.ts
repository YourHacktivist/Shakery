/** Search results shared by the main process and the renderer (section 12.1). */
import { z } from 'zod'

export const SEARCH_ENTITIES = ['recipe', 'ingredient', 'product'] as const

export const searchHitSchema = z
  .object({
    entityType: z.enum(SEARCH_ENTITIES),
    id: z.string().max(36),
    title: z.string().max(300),
    /** Category of an ingredient, ingredient of a bottle. */
    detail: z.string().max(300).nullable(),
    /** Status of a recipe. */
    status: z.string().max(20).nullable(),
    /** Ingredient of a bottle, to open it in Mon bar. */
    parentId: z.string().max(36).nullable(),
    match: z.enum(['exact', 'prefix', 'alias', 'content', 'fuzzy']),
  })
  .strict()

export type SearchHit = z.output<typeof searchHitSchema>

export const NOTE_ENTITIES = ['notebook_entry', 'tasting_note'] as const

/** A note of the notebook or a comment of the journal, searched beside the catalogue (D-041). */
export const noteHitSchema = z
  .object({
    entityType: z.enum(NOTE_ENTITIES),
    id: z.string().max(36),
    /** Title of the note, or recipe of the tasting. */
    title: z.string().max(300),
    /** The line that holds what was typed, cut short. */
    excerpt: z.string().max(200).nullable(),
  })
  .strict()

export type NoteHit = z.output<typeof noteHitSchema>
