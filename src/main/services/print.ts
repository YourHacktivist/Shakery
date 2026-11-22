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

type Paper = 'a4' | 'a5'

/** Paper, window width at 96 dpi and margins in inches. */
const PAPERS = {
  a4: { size: 'A4', width: 794, height: 1123, margin: 0.5 },
  a5: { size: 'A5', width: 559, height: 794, margin: 0.4 },
} as const

/** Loads `#/<route>` of the renderer in a hidden window, hands it over, then destroys it. */
async function withPrintWindow<T>(
  route: string,
  paper: Paper,
  use: (window: BrowserWindow) => Promise<T>,
): Promise<T> {
  const window = new BrowserWindow({
    show: false,
    width: PAPERS[paper].width,
    height: PAPERS[paper].height,
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
    return await use(window)
  } finally {
    window.destroy()
  }
}

/** Renders `#/<route>` of the renderer to a PDF, A4 unless told otherwise. */
export function renderToPdf(route: string, paper: Paper = 'a4'): Promise<Buffer> {
  const { size, margin } = PAPERS[paper]
  return withPrintWindow(route, paper, (window) =>
    window.webContents.printToPDF({
      pageSize: size,
      printBackground: true,
      margins: { top: margin, bottom: margin, left: margin, right: margin },
    }),
  )
}

/** The system print dialog on the route. False when the user cancels. */
export function printRoute(route: string, paper: Paper): Promise<boolean> {
  const { size, margin } = PAPERS[paper]
  const pixels = Math.round(margin * 96)
  return withPrintWindow(
    route,
    paper,
    (window) =>
      new Promise<boolean>((resolve, reject) => {
        window.webContents.print(
          {
            silent: false,
            printBackground: true,
            pageSize: size,
            margins: { marginType: 'custom', top: pixels, bottom: pixels, left: pixels, right: pixels },
          },
          (success, reason) => {
            if (success || /cancel/i.test(reason)) resolve(success)
            else reject(new Error(`Printing failed: ${reason}`))
          },
        )
      }),
  )
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
export async function savePdf(route: string, defaultName: string, paper: Paper = 'a4'): Promise<boolean> {
  const parent = BrowserWindow.getFocusedWindow()
  const options: Electron.SaveDialogOptions = {
    defaultPath: `${safeFileName(defaultName)}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  }
  const choice = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (choice.canceled || !choice.filePath) return false
  const pdf = await renderToPdf(route, paper)
  await writeFile(choice.filePath, pdf)
  return true
}
