import { z } from 'zod'
import { BACKUP_ID_PATTERN, backupSummarySchema, databaseHealthSchema } from '../domain/health'
import { categorySchema, glassSchema, iceTypeSchema } from '../domain/reference'
import type { IpcChannel } from './channels'

/**
 * Single IPC contract. Each operation declares its input schema (validated in the main
 * process before anything touches the database or the disk) and its output schema.
 *
 * Rules for every schema added here:
 * - strings carry a `.max()`, arrays a `.max()`;
 * - objects are `.strict()` so unknown keys are refused;
 * - operations without input use `noInput`.
 */
export const noInput = z.undefined()

export const appVersionSchema = z
  .object({
    version: z.string().max(64),
  })
  .strict()

export type ContractEntry = {
  readonly input: z.ZodType
  readonly output: z.ZodType
}

export const ipcContract = {
  'app.getVersion': { input: noInput, output: appVersionSchema },
  'database.getHealth': { input: noInput, output: databaseHealthSchema },
  'backups.list': { input: noInput, output: z.array(backupSummarySchema).max(1000) },
  'backups.create': { input: noInput, output: backupSummarySchema },
  'backups.restore': {
    input: z.object({ id: z.string().max(64).regex(BACKUP_ID_PATTERN) }).strict(),
    output: backupSummarySchema,
  },
  'reference.listGlasses': { input: noInput, output: z.array(glassSchema).max(500) },
  'reference.listIceTypes': { input: noInput, output: z.array(iceTypeSchema).max(200) },
  'reference.listCategories': { input: noInput, output: z.array(categorySchema).max(2000) },
} as const satisfies Record<IpcChannel, ContractEntry>

export type IpcContract = typeof ipcContract
export type IpcInput<C extends IpcChannel> = z.input<IpcContract[C]['input']>
export type IpcParsedInput<C extends IpcChannel> = z.output<IpcContract[C]['input']>
export type IpcOutput<C extends IpcChannel> = z.output<IpcContract[C]['output']>
