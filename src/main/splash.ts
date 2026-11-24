import { app, BrowserWindow } from 'electron'
import { devServerUrl, splashFile, windowIconFile } from './paths'
import { secureWebPreferences } from './window'

/**
 * Start-up window (D-056), shown as soon as Electron is ready: the notebook opens behind it,
 * and on the first launch the classics load, which takes a few seconds. It closes when the
 * main window appears. No preload: it calls nothing.
 */
export function showSplash(firstLaunch: boolean): BrowserWindow | null {
  // End-to-end tests take the first window as the main one (development builds only).
  if (!app.isPackaged && process.env['SHAKERY_NO_SPLASH'] === '1') return null
  const icon = windowIconFile()
  const { preload: _preload, ...webPreferences } = secureWebPreferences()
  const window = new BrowserWindow({
    width: 420,
    height: 300,
    useContentSize: true,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    center: true,
    title: 'Shakery',
    backgroundColor: '#0A0807',
    ...(icon ? { icon } : {}),
    webPreferences,
  })
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show()
  })
  const query = firstLaunch ? { first: '1' } : undefined
  const dev = devServerUrl()
  if (dev) void window.loadURL(`${dev}/splash.html${firstLaunch ? '?first=1' : ''}`)
  else void window.loadFile(splashFile(), query ? { query } : {})
  return window
}

/** Closes the start-up window once the main window is on screen. */
export function closeSplashWith(splash: BrowserWindow | null, main: BrowserWindow): void {
  if (!splash) return
  const close = () => {
    if (!splash.isDestroyed()) splash.destroy()
  }
  main.once('show', close)
  main.once('closed', close)
}
