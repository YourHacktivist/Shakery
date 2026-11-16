import { z } from 'zod'
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
} as const satisfies Record<IpcChannel, ContractEntry>

export type IpcContract = typeof ipcContract
export type IpcInput<C extends IpcChannel> = z.input<IpcContract[C]['input']>
export type IpcParsedInput<C extends IpcChannel> = z.output<IpcContract[C]['input']>
export type IpcOutput<C extends IpcChannel> = z.output<IpcContract[C]['output']>
