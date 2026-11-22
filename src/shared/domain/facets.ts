/**
 * What the filters of the list of recipes read beside the summary (section 10.4, D-040). Apart
 * from `recipes.list`, which every screen loads: only the list of recipes needs it.
 */
import { z } from 'zod'
import { ALLERGEN_CODES } from './allergens'

/** Base spirit of a recipe that has none (vermouth, liqueur, juice). */
export const NO_SPIRIT = 'none'

export const recipeFacetsSchema = z
  .object({
    id: z.string().max(36),
    glassId: z.string().max(36).nullable(),
    /** Category of the main spirit, just under « Spiritueux », or NO_SPIRIT. */
    spirit: z.string().max(36),
    tags: z.array(z.string().max(40)).max(30),
    flavors: z.array(z.string().max(40)).max(2000),
    /** Of every line, optional ones included: « without » errs on the careful side. */
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
    /** An ingredient is missing or loops: nothing can be claimed absent. */
    allergensUnknown: z.boolean(),
    /** Average of the last tasted version. */
    rating: z.number().min(1).max(5).nullable(),
  })
  .strict()

export type RecipeFacets = z.output<typeof recipeFacetsSchema>
