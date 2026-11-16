/**
 * Every IPC call resolves to an `IpcResult`. The main process never throws across the
 * bridge and never sends a stack trace: the renderer receives a stable error code and
 * turns it into a French message (see `renderer/src/i18n`).
 */
export const IPC_ERROR_CODES = [
  'UNKNOWN_CHANNEL',
  'FORBIDDEN',
  'INVALID_INPUT',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL',
] as const

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number]

export type IpcSuccess<T> = { readonly ok: true; readonly data: T }
export type IpcFailure = { readonly ok: false; readonly code: IpcErrorCode; readonly message: string }
export type IpcResult<T> = IpcSuccess<T> | IpcFailure

export function ok<T>(data: T): IpcSuccess<T> {
  return { ok: true, data }
}

export function fail(code: IpcErrorCode, message: string): IpcFailure {
  return { ok: false, code, message }
}
