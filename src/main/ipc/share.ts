/**
 * Export, sharing and Open Food Facts (section 12.4, phase 10). Every file is written where the
 * user chose in the save dialog of the main process; the renderer never gives a path.
 */
import { writeFile } from 'node:fs/promises'
import { app, BrowserWindow, clipboard, dialog } from 'electron'
import {
  batchPrintRoute,
  LABEL_FORMATS,
  labelPrintRoute,
  MANUAL_BATCH_ID,
  recipePrintRoute,
} from '../../shared/print'
import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { SqliteSettingsRepository } from '../db/repositories/settings'
import { DomainError } from '../errors'
import { mediaRoot } from '../paths'
import { writeArchive } from '../services/archive'
import { buildCsv } from '../services/csv'
import { buildExport } from '../services/export'
import { createOffClient } from '../services/off'
import { printRoute, savePdf } from '../services/print'
import type { IpcHandlers } from './dispatch'
import { safeFileName } from '../services/file-name'

type Kind = 'shakery' | 'csv' | 'markdown' | 'png'

const FILTERS: Record<Kind, Electron.FileFilter> = {
  shakery: { name: 'Carnet Shakery', extensions: ['shakery'] },
  csv: { name: 'CSV', extensions: ['csv'] },
  markdown: { name: 'Markdown', extensions: ['md'] },
  png: { name: 'Image PNG', extensions: ['png'] },
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX_PNG_BYTES = 10_000_000

/** Asks where to save; null when the user cancels. */
async function chooseTarget(kind: Kind, name: string): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow()
  const options: Electron.SaveDialogOptions = {
    defaultPath: `${safeFileName(name, 'shakery')}.${FILTERS[kind].extensions[0] ?? kind}`,
    filters: [FILTERS[kind]],
  }
  const choice = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
  return choice.canceled || !choice.filePath ? null : choice.filePath
}

const today = () => new Date().toISOString().slice(0, 10)

export function createShareHandlers(
  manager: DatabaseManager,
): Pick<
  IpcHandlers,
  | 'export.notebook'
  | 'export.csv'
  | 'export.saveFile'
  | 'export.copyText'
  | 'export.recipePdf'
  | 'export.printRecipe'
  | 'export.batch'
  | 'export.labels'
  | 'off.status'
  | 'off.setEnabled'
  | 'off.lookup'
> {
  const ids = systemIds()
  const ready = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return manager.db
  }
  const settings = () => new SqliteSettingsRepository(ready(), ids.now)
  const recipeName = (id: string) => {
    const row = ready()
      .$client.prepare('SELECT name FROM recipes WHERE id = ? AND deleted_at IS NULL')
      .get(id) as { name: string } | undefined
    if (!row) throw new DomainError('NOT_FOUND', 'Recipe not found')
    return row.name
  }
  const off = createOffClient({
    enabled: () => settings().get('off.enabled'),
    fetch: (input, init) => fetch(input, init),
    appVersion: app.getVersion(),
    now: () => Date.now(),
    cache: {
      get: (barcode) =>
        ready()
          .$client.prepare('SELECT payload, fetched_at AS fetchedAt FROM off_cache WHERE barcode = ?')
          .get(barcode) as { payload: string; fetchedAt: number } | undefined,
      set: (barcode, payload, fetchedAt) => {
        ready()
          .$client.prepare(
            `INSERT INTO off_cache (barcode, payload, fetched_at) VALUES (?, ?, ?)
             ON CONFLICT(barcode) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
          )
          .run(barcode, payload, fetchedAt)
      },
    },
  })

  return {
    'export.notebook': async (input) => {
      const db = ready()
      const name =
        input.kind === 'full' ? `Carnet Shakery ${today()}` : (input.label ?? `Fiches Shakery ${today()}`)
      const file = await chooseTarget('shakery', name)
      if (!file) return { saved: false }
      const bundle = await buildExport(
        db,
        input.kind === 'full'
          ? { kind: 'full' }
          : {
              kind: 'partial',
              recipeIds: input.recipeIds,
              includePrivate: input.includePrivate,
              collectionId: input.collectionId,
            },
        {
          appVersion: app.getVersion(),
          now: Date.now(),
          mediaRoot: mediaRoot(),
          label: input.kind === 'full' ? null : input.label,
        },
      )
      await writeArchive(file, bundle)
      return { saved: true }
    },
    'export.csv': async ({ table }) => {
      const csv = buildCsv(ready(), table)
      const names = { recipes: 'Fiches', journal: 'Journal', ingredients: 'Ingrédients' } as const
      const file = await chooseTarget('csv', `${names[table]} Shakery ${today()}`)
      if (!file) return { saved: false }
      await writeFile(file, csv, 'utf8')
      return { saved: true }
    },
    'export.saveFile': async ({ kind, name, content }) => {
      let data: Buffer | string = content
      if (kind === 'png') {
        data = Buffer.from(content, 'base64')
        if (data.length > MAX_PNG_BYTES || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
          throw new DomainError('INVALID_INPUT', 'Not a PNG image')
        }
      }
      const file = await chooseTarget(kind, name)
      if (!file) return { saved: false }
      await writeFile(file, data, kind === 'png' ? undefined : 'utf8')
      return { saved: true }
    },
    'export.copyText': ({ text }) => {
      void clipboard.writeText(text)
      return null
    },
    'export.recipePdf': async ({ id, paper, indicators }) => {
      const name = recipeName(id)
      return { saved: await savePdf(recipePrintRoute(id, { paper, indicators }), name, paper) }
    },
    'export.printRecipe': async ({ id, paper, indicators }) => {
      recipeName(id) // an unknown recipe is refused before any window opens
      return { printed: await printRoute(recipePrintRoute(id, { paper, indicators }), paper) }
    },
    'export.batch': async ({ id, to, manual, ...options }) => {
      // A batch written by hand has no recipe: its lines travel in the route.
      const name = manual ? manual.name || 'Batch' : recipeName(id)
      const route = manual ? batchPrintRoute(MANUAL_BATCH_ID, options, manual) : batchPrintRoute(id, options)
      const done = to === 'pdf' ? await savePdf(route, `Batch ${name}`) : await printRoute(route, 'a4')
      return { done }
    },
    'export.labels': async ({ id, batchId, to, ...options }) => {
      const name = recipeName(id)
      const batch = ready()
        .$client.prepare('SELECT id FROM prep_batches WHERE id = ? AND recipe_id = ? AND deleted_at IS NULL')
        .get(batchId, id)
      if (!batch) throw new DomainError('NOT_FOUND', 'Unknown batch')
      const route = labelPrintRoute(id, batchId, options)
      const { page } = LABEL_FORMATS[options.format]
      const done =
        to === 'pdf' ? await savePdf(route, `Étiquette ${name}`, page) : await printRoute(route, page)
      return { done }
    },
    'off.status': () => ({ enabled: settings().get('off.enabled') }),
    'off.setEnabled': ({ enabled }) => {
      settings().set('off.enabled', enabled)
      return null
    },
    'off.lookup': async ({ barcode }) => ({ product: await off.lookup(barcode) }),
  }
}
