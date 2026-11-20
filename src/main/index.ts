import { join } from 'node:path'
import { app, BrowserWindow, Menu, session } from 'electron'
import { systemIds } from './db/client'
import { DatabaseManager } from './db/manager'
import { createHandlers, registerIpcHandlers } from './ipc'
import { log, setupLogging } from './logger'
import {
  applyUserDataOverride,
  databaseFile,
  defaultBackupDirectory,
  devServerUrl,
  mediaRoot,
  migrationsFolder,
  rendererTarget,
  seedFolder,
} from './paths'
import { handleMediaProtocol, registerMediaScheme } from './protocol'
import { hardenAllWebContents, hardenSession } from './security'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from './seed/bundled'
import { loadSeedData } from './seed/load'
import { createMainWindow } from './window'

// The data folder must be fixed before the single instance lock, which is tied to it.
applyUserDataOverride()

if (!app.requestSingleInstanceLock()) {
  // Another Shakery is already running on the same data: hand over and leave.
  app.quit()
} else {
  setupLogging()
  registerMediaScheme()

  const target = rendererTarget()
  hardenAllWebContents(target)

  const database = new DatabaseManager({
    dbFile: databaseFile(),
    mediaRoot: mediaRoot(),
    migrationsFolder: migrationsFolder(),
    defaultBackupDirectory: defaultBackupDirectory(),
    appVersion: app.getVersion(),
    ids: systemIds(),
    log,
    seed: (db, ids) => {
      const added = loadSeedData(db, ids, withClassics(BUNDLED_SEED, join(seedFolder(), CLASSICS_FILE)))
      log.info(`Seed data added: ${JSON.stringify(added)}`)
    },
  })

  let mainWindow: BrowserWindow | null = null

  const openMainWindow = (): void => {
    mainWindow = createMainWindow()
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (app.isReady() && BrowserWindow.getAllWindows().length === 0) openMainWindow()
  })

  // Backup at shutdown (section 12.3), then close the database cleanly.
  let shuttingDown = false
  app.on('before-quit', (event) => {
    if (shuttingDown) return
    shuttingDown = true
    if (database.status !== 'ready') {
      database.close()
      return
    }
    event.preventDefault()
    database
      .backup('shutdown')
      .catch(() => undefined) // already logged and reported by the manager
      .finally(() => {
        database.close()
        app.quit()
      })
  })

  app
    .whenReady()
    .then(async () => {
      log.info(`Shakery ${app.getVersion()} starting (Electron ${process.versions.electron})`)
      Menu.setApplicationMenu(null)
      hardenSession(session.defaultSession, devServerUrl())
      await handleMediaProtocol(mediaRoot())
      await database.open()
      registerIpcHandlers(
        target,
        createHandlers({
          manager: database,
          onRestored: () => {
            setImmediate(() => mainWindow?.webContents.reload())
          },
        }),
      )
      openMainWindow()
      // Daily backup once the window is up, so it never delays startup.
      database.backupIfDue().catch(() => undefined)
    })
    .catch((error: unknown) => {
      log.error('Startup failed', error)
      app.exit(1)
    })
}
