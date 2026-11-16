import { app, ipcMain } from 'electron'
import log from 'electron-log/main'

const ELECTRON_LOG_CHANNEL = '__ELECTRON_LOG__'

/**
 * Local log file with rotation (5 MB, then `main.old.log`). No personal data is logged:
 * call sites log identifiers and error codes, never recipe contents or file paths of
 * the user's documents.
 *
 * electron-log registers its own IPC channel when imported, to receive logs from a
 * renderer. Shakery's renderer does not log through it, and section 6 allows no
 * channel outside the contract, so the channel is removed here.
 */
export function setupLogging(): void {
  ipcMain.removeAllListeners(ELECTRON_LOG_CHANNEL)
  ipcMain.removeHandler(ELECTRON_LOG_CHANNEL)

  log.transports.file.level = 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.console.level = app.isPackaged ? false : 'debug'
  log.errorHandler.startCatching({ showDialog: false })
}

export { log }
