import { z } from 'zod'

/** Reference data shared by every screen: glasses, ice types, category tree. */
export const glassSchema = z
  .object({
    id: z.string().max(36),
    name: z.string().max(120),
    capacityMl: z.number().int().positive().nullable(),
    sortOrder: z.number().int(),
  })
  .strict()

export const iceTypeSchema = z
  .object({
    id: z.string().max(36),
    name: z.string().max(120),
    sortOrder: z.number().int(),
  })
  .strict()

export const BATCH_HINT_VALUES = ['ok', 'add_at_service', 'fresh'] as const

export const categorySchema = z
  .object({
    id: z.string().max(36),
    name: z.string().max(120),
    slug: z.string().max(120),
    parentId: z.string().max(36).nullable(),
    sortOrder: z.number().int(),
    batchHint: z.enum(BATCH_HINT_VALUES),
  })
  .strict()

export type Glass = z.output<typeof glassSchema>
export type IceType = z.output<typeof iceTypeSchema>
export type Category = z.output<typeof categorySchema>

export interface ReferenceRepository {
  listGlasses(): Glass[]
  listIceTypes(): IceType[]
  /** Live categories, parents before children, siblings by sort order. */
  listCategories(): Category[]
}
