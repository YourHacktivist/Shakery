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
