import { app, BrowserWindow, nativeTheme } from 'electron'
import type { SettingValue } from '../shared/settings'
import { devServerUrl, preloadFile, rendererIndexFile, windowIconFile } from './paths'

type Theme = SettingValue<'appearance.theme'>

/** Same values as --color-bg-base and --color-fg-secondary of each theme (styles/tokens.css). */
const CHROME: Record<Theme, { background: string; symbols: string }> = {
  dark: { background: '#0A0807', symbols: '#B9ADA5' },
  light: { background: '#F3E8DC', symbols: '#58413A' },
}

/** Height of the top bar of the interface, which is also the title bar (D-038). */
export const TITLE_BAR_HEIGHT = 48

/** The window buttons have no background of their own: the top bar shows through. */
function titleBar(theme: Theme): Electron.TitleBarOverlayOptions {
  return { color: '#00000000', symbolColor: CHROME[theme].symbols, height: TITLE_BAR_HEIGHT }
}

let shellWindow: BrowserWindow | null = null

/** What lies outside the page: native dialogs, window background, window buttons. */
export function applyWindowTheme(theme: Theme): void {
  nativeTheme.themeSource = theme
  if (!shellWindow || shellWindow.isDestroyed()) return
  shellWindow.setBackgroundColor(CHROME[theme].background)
  if (process.platform !== 'darwin') shellWindow.setTitleBarOverlay(titleBar(theme))
}

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

export function createMainWindow(theme: Theme): BrowserWindow {
  nativeTheme.themeSource = theme
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
    backgroundColor: CHROME[theme].background,
    // No system title bar: the top bar of the page moves the window, only the buttons are native.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin' ? {} : { titleBarOverlay: titleBar(theme) }),
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: secureWebPreferences(),
  })

  shellWindow = window
  window.on('closed', () => {
    if (shellWindow === window) shellWindow = null
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
