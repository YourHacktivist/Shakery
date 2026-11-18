import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc/channels'
import { fail } from '../../shared/ipc/result'
import { log } from '../logger'
import { isTrustedRendererUrl, type RendererTarget } from '../security-policy'
import { appHandlers } from './app'
import { createCatalogHandlers } from './catalog'
import { createImportHandlers } from './import'
import { createDatabaseHandlers, type DatabaseHandlerDeps } from './database'
import { dispatch, type IpcHandlers } from './dispatch'

export type HandlerDeps = DatabaseHandlerDeps

export function createHandlers(deps: HandlerDeps): IpcHandlers {
  return {
    ...appHandlers,
    ...createDatabaseHandlers(deps),
    ...createCatalogHandlers(deps.manager),
    ...createImportHandlers(deps.manager),
  }
}

/**
 * One `ipcMain.handle` per channel of the contract, and none other. Each call checks
 * that it comes from the application's own top-level document, then validates its input.
 */
export function registerIpcHandlers(target: RendererTarget, handlers: IpcHandlers): void {
  for (const channel of IPC_CHANNELS) {
    ipcMain.handle(channel, async (event, rawInput: unknown) => {
      const frame = event.senderFrame
      if (!frame || frame.parent !== null || !isTrustedRendererUrl(frame.url, target)) {
        log.warn(`IPC ${channel} refused: untrusted sender`)
        return fail('FORBIDDEN', 'Untrusted sender')
      }
      return dispatch(channel, rawInput, handlers, (error) => {
        log.error(`IPC ${channel} failed`, error)
      })
    })
  }
}
