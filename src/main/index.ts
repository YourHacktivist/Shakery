import { join } from 'node:path'
import { app, BrowserWindow, Menu, session } from 'electron'
import { systemIds } from './db/client'
import { DatabaseManager } from './db/manager'
import { SqliteSettingsRepository } from './db/repositories/settings'
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
import { settleOnboarding } from './services/onboarding'
import { electronUpdaterPort, fakeUpdaterPort } from './services/updater-electron'
import { UpdateService, type UpdaterPort } from './services/updates'
import { VERSION_PATTERN } from '../shared/domain/updates'
import { applyWindowTheme, createMainWindow } from './window'

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
      // End-to-end tests skip the first-launch assistant, outside a packaged build only.
      settleOnboarding(db, ids.now, {
        skip: !app.isPackaged && process.env['SHAKERY_SKIP_ONBOARDING'] === '1',
      })
    },
  })

  let mainWindow: BrowserWindow | null = null

  const settingsRepository = () => new SqliteSettingsRepository(database.db, systemIds().now)
  const settingsReady = () => database.status === 'ready'

  /** Set once the pre-update backup is made: the quit handler then only closes the database. */
  let installingUpdate = false

  // A packaged build reads the GitHub releases; a development build can fake one (D-051).
  const fakeUpdate = process.env['SHAKERY_FAKE_UPDATE']
  const updaterPort: UpdaterPort | null = app.isPackaged
    ? electronUpdaterPort(log)
    : fakeUpdate && VERSION_PATTERN.test(fakeUpdate)
      ? fakeUpdaterPort(fakeUpdate, log)
      : null
  const updates = new UpdateService({
    port: updaterPort,
    current: app.getVersion(),
    now: () => Date.now(),
    autoCheck: () => settingsReady() && settingsRepository().get('updates.autoCheck'),
    skippedVersion: () => (settingsReady() ? settingsRepository().get('updates.skippedVersion') : null),
    setSkippedVersion: (version) => {
      if (settingsReady()) settingsRepository().set('updates.skippedVersion', version)
    },
    backup: () => database.backup('pre-update'),
    beforeInstall: () => {
      installingUpdate = true
    },
    log,
  })

  const savedTheme = () =>
    database.status === 'ready'
      ? new SqliteSettingsRepository(database.db, systemIds().now).get('appearance.theme')
      : 'dark'

  const openMainWindow = (): void => {
    mainWindow = createMainWindow(savedTheme())
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
    // Backed up just before: the silent installer is waiting for Shakery to close.
    if (database.status !== 'ready' || installingUpdate) {
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
          updates,
          onRestored: () => {
            setImmediate(() => {
              // The restored notebook brings its own settings, theme included.
              applyWindowTheme(savedTheme())
              mainWindow?.webContents.reload()
            })
          },
        }),
      )
      openMainWindow()
      // Daily backup once the window is up, so it never delays startup.
      database.backupIfDue().catch(() => undefined)
      // Then the releases on GitHub, a little later and only when the setting allows it.
      setTimeout(() => {
        void updates.checkOnLaunch()
      }, 2500)
    })
    .catch((error: unknown) => {
      log.error('Startup failed', error)
      app.exit(1)
    })
}
