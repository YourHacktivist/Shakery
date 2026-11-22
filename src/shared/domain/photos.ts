/** Photos of recipes and tastings (sections 6, 10.4 and 10.6, D-045). */
import { z } from 'zod'

export const PHOTO_OWNERS = ['recipe', 'tasting'] as const
export type PhotoOwner = (typeof PHOTO_OWNERS)[number]

/** What the user may choose. */
export const MAX_PHOTO_SOURCE_BYTES = 10 * 1024 * 1024
/** Decoded, a picture costs four bytes a pixel whatever its file weighs. */
export const MAX_PHOTO_SOURCE_PIXELS = 80_000_000
/** What is kept, once re-encoded in WebP. */
export const MAX_PHOTO_SIDE = 1600
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024

/** The photo re-encoded by the renderer, in base64; the main process checks it again. */
export const photoContentSchema = z
  .string()
  .min(20)
  .max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/)

/** A photo put back by « Annuler »: a file of the media folder, named by the main process. */
export const photoPathSchema = z.string().regex(/^(recipes|tastings)\/[A-Za-z0-9_-]{1,64}\.webp$/)

/** As stored, imported ones included. */
export const storedPhotoPathSchema = z.string().max(400).nullable()

const SERVED = /^([A-Za-z0-9_-][A-Za-z0-9._-]{0,127}\/){0,4}[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}\.webp$/

/** Address of a stored photo, or null when the path is not one the protocol would serve. */
export function photoUrl(stored: string | null | undefined): string | null {
  return stored && SERVED.test(stored) ? `shakery-media://media/${stored}` : null
}
