/**
 * Printing (section 12.2): a print template of the renderer is loaded in a hidden window with
 * the same security settings and CSP, then turned into a PDF. The template sets the document
 * title to PRINT_READY_TITLE once its data is on screen.
 */
import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog } from 'electron'
import { PRINT_READY_TITLE } from '../../shared/print'
import { devServerUrl, rendererIndexFile } from '../paths'
import { secureWebPreferences } from '../window'

const READY_TIMEOUT_MS = 20_000

/** Renders `#/<route>` of the renderer to an A4 PDF. */
export async function renderToPdf(route: string): Promise<Buffer> {
  const window = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    backgroundColor: '#FFFFFF',
    webPreferences: secureWebPreferences(),
  })
  try {
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('The print template did not get ready'))
      }, READY_TIMEOUT_MS)
      window.webContents.on('page-title-updated', (_event, title) => {
        if (title === PRINT_READY_TITLE) {
          clearTimeout(timer)
          resolve()
        }
      })
    })
    const dev = devServerUrl()
    if (dev) await window.loadURL(`${dev}#/${route}`)
    else await window.loadFile(rendererIndexFile(), { hash: `/${route}` })
    await ready
    return await window.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    })
  } finally {
    window.destroy()
  }
}

/** File name without the characters Windows and macOS refuse. */
export function safeFileName(name: string): string {
  const forbidden = '<>:"/\\|?*'
  let kept = ''
  for (const char of name) kept += char.charCodeAt(0) < 32 || forbidden.includes(char) ? ' ' : char
  const cleaned = kept.replace(/\s+/g, ' ').trim()
  return cleaned === '' ? 'Shakery' : cleaned.slice(0, 120)
}

/** Asks where to save, then writes the PDF of the route. False when the user cancels. */
export async function savePdf(route: string, defaultName: string): Promise<boolean> {
  const parent = BrowserWindow.getFocusedWindow()
  const options: Electron.SaveDialogOptions = {
    defaultPath: `${safeFileName(defaultName)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  }
  const choice = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (choice.canceled || !choice.filePath) return false
  const pdf = await renderToPdf(route)
  await writeFile(choice.filePath, pdf)
  return true
}
