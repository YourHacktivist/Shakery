import type { IpcErrorCode } from '../shared/ipc/result'

/**
 * Expected failure raised by a handler or a repository. Its code and message cross the
 * IPC bridge as is. Any other error is logged and reported as `INTERNAL`.
 */
export class DomainError extends Error {
  readonly code: IpcErrorCode

  constructor(code: IpcErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}
