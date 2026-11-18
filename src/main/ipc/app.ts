import { app, BrowserWindow, powerSaveBlocker } from 'electron'
import type { IpcHandlers } from './dispatch'

/** Blocker id while the preparation mode keeps the screen on, null otherwise. */
let blocker: number | null = null

export const appHandlers = {
  'app.getVersion': () => ({ version: app.getVersion() }),
  'app.setPrepMode': ({ active }) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    window?.setFullScreen(active)
    if (active && blocker === null) blocker = powerSaveBlocker.start('prevent-display-sleep')
    if (!active && blocker !== null) {
      powerSaveBlocker.stop(blocker)
      blocker = null
    }
    return null
  },
} satisfies Pick<IpcHandlers, 'app.getVersion' | 'app.setPrepMode'>
