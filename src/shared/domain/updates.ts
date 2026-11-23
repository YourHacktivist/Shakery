import { z } from 'zod'

/**
 * Updates from the GitHub releases of Shakery (D-051). The main process owns the state;
 * the renderer reads it and asks for the next step.
 *
 * - `unsupported`: development build, nothing to update;
 * - `idle`: nothing asked yet (automatic check turned off);
 * - `none`: up to date at the last check;
 * - `available`: a newer version can be downloaded;
 * - `downloading`, then `ready`: downloaded, installed on restart or when Shakery closes;
 * - `error`: the last check or download failed (`offline` when GitHub could not be reached).
 *   A failed backup before installing leaves `ready` with the `backup` error.
 */
export const UPDATE_STATUSES = [
  'unsupported',
  'idle',
  'checking',
  'none',
  'available',
  'downloading',
  'ready',
  'error',
] as const
export type UpdateStatus = (typeof UPDATE_STATUSES)[number]

/** `backup`: the notebook could not be backed up, so nothing was installed. */
export const UPDATE_ERRORS = ['offline', 'failed', 'backup'] as const

/** Release notes kept as plain text: never rendered as HTML. */
export const MAX_RELEASE_NOTES = 4000

export const VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,6}(?:-[0-9A-Za-z.-]{1,32})?$/

export const updateReleaseSchema = z
  .object({
    version: z.string().regex(VERSION_PATTERN),
    notes: z.string().max(MAX_RELEASE_NOTES),
    /** Publication time in ms, null when GitHub gave none. */
    date: z.number().int().nullable(),
  })
  .strict()
export type UpdateRelease = z.infer<typeof updateReleaseSchema>

export const updateStateSchema = z
  .object({
    status: z.enum(UPDATE_STATUSES),
    current: z.string().max(64),
    release: updateReleaseSchema.nullable(),
    /** The user chose « Ignorer cette version » for this release: no window opens by itself. */
    skipped: z.boolean(),
    /** Percent downloaded, 0 to 100, while `downloading`. */
    progress: z.number().min(0).max(100).nullable(),
    error: z.enum(UPDATE_ERRORS).nullable(),
    checkedAt: z.number().int().nullable(),
  })
  .strict()
export type UpdateState = z.infer<typeof updateStateSchema>
