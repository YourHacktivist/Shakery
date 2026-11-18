/** Reference zones of a family (section 8), as the lab gauges show them. */
import { z } from 'zod'

const zoneSchema = z
  .object({ from: z.number(), to: z.number(), recipeIds: z.array(z.string().max(36)).max(50_000) })
  .strict()

export const familyZonesSchema = z
  .object({
    abv: zoneSchema.optional(),
    sugar: zoneSchema.optional(),
    acid: zoneSchema.optional(),
    ratio: zoneSchema.optional(),
  })
  .strict()

export const referenceZonesSchema = z.record(z.string().max(40), familyZonesSchema)

export type FamilyZones = z.output<typeof familyZonesSchema>
export type ReferenceZones = z.output<typeof referenceZonesSchema>
