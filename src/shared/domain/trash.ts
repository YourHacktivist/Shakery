/** The trash (section 10.14, D-043): what was deleted, until the trash is emptied. */
import { z } from 'zod'

export const TRASH_KINDS = [
  'recipe',
  'ingredient',
  'product',
  'tasting_note',
  'notebook_entry',
  'prep_batch',
  'collection',
] as const

export type TrashKind = (typeof TRASH_KINDS)[number]

/** Rows shown at most; emptying concerns all of them. */
export const TRASH_SHOWN = 300

export const trashItemSchema = z
  .object({
    kind: z.enum(TRASH_KINDS),
    id: z.string().min(1).max(36),
    /** Its name; the recipe of a tasting or of a batch. */
    title: z.string().max(300),
    deletedAt: z.number().int(),
  })
  .strict()

export const trashSchema = z
  .object({
    items: z.array(trashItemSchema).max(TRASH_SHOWN),
    total: z.number().int().min(0),
  })
  .strict()

export type TrashItem = z.output<typeof trashItemSchema>
export type Trash = z.output<typeof trashSchema>
