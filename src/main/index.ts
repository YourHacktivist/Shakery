import { app, BrowserWindow, Menu, session } from 'electron'
import { createHandlers, registerIpcHandlers } from './ipc'
import { log, setupLogging } from './logger'
import { applyUserDataOverride, devServerUrl, mediaRoot, rendererTarget } from './paths'
import { handleMediaProtocol, registerMediaScheme } from './protocol'
import { hardenAllWebContents, hardenSession } from './security'
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

  app
    .whenReady()
    .then(async () => {
      log.info(`Shakery ${app.getVersion()} starting (Electron ${process.versions.electron})`)
      Menu.setApplicationMenu(null)
      hardenSession(session.defaultSession, devServerUrl())
      await handleMediaProtocol(mediaRoot())
      registerIpcHandlers(target, createHandlers())
      openMainWindow()
    })
    .catch((error: unknown) => {
      log.error('Startup failed', error)
      app.exit(1)
    })
}
