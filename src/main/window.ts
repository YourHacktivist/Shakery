import { app, BrowserWindow } from 'electron'
import { devServerUrl, preloadFile, rendererIndexFile, windowIconFile } from './paths'

/** Settings of every window of the application, the hidden print window included (section 6). */
export function secureWebPreferences(): Electron.WebPreferences {
  return {
    preload: preloadFile(),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    experimentalFeatures: false,
    navigateOnDragDrop: false,
    safeDialogs: true,
    spellcheck: false,
    devTools: !app.isPackaged,
  }
}

export function createMainWindow(): BrowserWindow {
  const icon = windowIconFile()
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    // Sizes of the content area: the 1100 x 700 minimum of section 3 is for the page, not the frame.
    useContentSize: true,
    show: false,
    title: 'Shakery',
    backgroundColor: '#0A0807',
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: secureWebPreferences(),
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  if (!app.isPackaged) {
    window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') window.webContents.toggleDevTools()
    })
  }

  const dev = devServerUrl()
  if (dev) void window.loadURL(dev)
  else void window.loadFile(rendererIndexFile())

  return window
}
