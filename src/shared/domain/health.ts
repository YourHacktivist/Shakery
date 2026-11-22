import { z } from 'zod'

export const BACKUP_REASON_VALUES = [
  'daily',
  'shutdown',
  'manual',
  'pre-migration',
  'pre-restore',
  'pre-purge',
  'pre-reset',
] as const
export const BACKUP_ID_PATTERN =
  /^\d{8}T\d{9}Z_(daily|shutdown|manual|pre-migration|pre-restore|pre-purge|pre-reset)$/

export const backupSummarySchema = z
  .object({
    id: z.string().regex(BACKUP_ID_PATTERN),
    createdAt: z.number().int(),
    reason: z.enum(BACKUP_REASON_VALUES),
    appVersion: z.string().max(64),
    integrity: z.enum(['ok', 'failed']),
    counts: z
      .object({
        recipes: z.number().int().nullable(),
        tastingNotes: z.number().int().nullable(),
        ingredients: z.number().int().nullable(),
      })
      .strict(),
    mediaCount: z.number().int().min(0),
  })
  .strict()

export type BackupSummary = z.output<typeof backupSummarySchema>

/**
 * State of the notebook, shown on the home screen when something needs attention:
 * a database that failed its integrity check, or a backup folder that cannot be written.
 */
export const databaseHealthSchema = z
  .object({
    database: z.enum(['ready', 'corrupt', 'error']),
    integrityMessages: z.array(z.string().max(500)).max(20),
    lastBackupAt: z.number().int().nullable(),
    backupError: z.enum(['DIRECTORY_UNAVAILABLE', 'FAILED']).nullable(),
    latestHealthyBackupId: z.string().regex(BACKUP_ID_PATTERN).nullable(),
  })
  .strict()

export type DatabaseHealth = z.output<typeof databaseHealthSchema>
