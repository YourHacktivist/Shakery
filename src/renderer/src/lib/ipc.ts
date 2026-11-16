import type { IpcErrorCode, IpcResult } from '@shared/ipc/result'
import { fr } from '@renderer/i18n/fr'

export class ShakeryError extends Error {
  readonly code: IpcErrorCode

  constructor(code: IpcErrorCode, message: string) {
    super(message)
    this.name = 'ShakeryError'
    this.code = code
  }

  /** Message shown to the user, in French. The technical message stays in `message`. */
  get userMessage(): string {
    return fr.errors[this.code]
  }
}

/** Turns an IPC result into a value, or throws a `ShakeryError` carrying its code. */
export async function unwrap<T>(pending: Promise<IpcResult<T>>): Promise<T> {
  const result = await pending
  if (result.ok) return result.data
  throw new ShakeryError(result.code, result.message)
}

export const shakery = window.shakery
