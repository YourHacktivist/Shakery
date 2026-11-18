import { BrowserWindow, dialog } from 'electron'
import { randomUUID } from 'node:crypto'
import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { DomainError } from '../errors'
import { log } from '../logger'
import { mediaRoot } from '../paths'
import { ArchiveError, readArchive, type ArchiveContent } from '../services/archive'
import {
  applyImport,
  ImportValidationError,
  previewImport,
  validateImportData,
  type ImportData,
} from '../services/import'
import type { IpcHandlers } from './dispatch'

type Pending = { data: ImportData; media: ArchiveContent['media']; createdAt: number }

/** A chosen archive waits here for the user to confirm, for ten minutes at most. */
const pending = new Map<string, Pending>()
const PENDING_TTL_MS = 10 * 60 * 1000

function prune(now: number): void {
  for (const [token, entry] of pending) if (now - entry.createdAt > PENDING_TTL_MS) pending.delete(token)
}

export function createImportHandlers(
  manager: DatabaseManager,
): Pick<IpcHandlers, 'import.choose' | 'import.apply'> {
  const ids = systemIds()

  return {
    'import.choose': async () => {
      if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
      const window = BrowserWindow.getFocusedWindow()
      const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{ name: 'Carnet Shakery', extensions: ['shakery'] }],
      }
      const choice = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      const file = choice.filePaths[0]
      if (choice.canceled || !file) return null
      try {
        const archive = await readArchive(file)
        const data = validateImportData(archive.data)
        const now = Date.now()
        prune(now)
        const token = randomUUID()
        pending.set(token, { data, media: archive.media, createdAt: now })
        return { token, label: archive.manifest.label, tables: previewImport(manager.db, data, ids) }
      } catch (error) {
        if (error instanceof ArchiveError || error instanceof ImportValidationError) {
          log.warn(`Import refused: ${error.message}`)
          throw new DomainError('INVALID_INPUT', 'This file is not a valid Shakery archive')
        }
        throw error
      }
    },
    'import.apply': async ({ token, strategy }) => {
      const entry = pending.get(token)
      if (!entry) throw new DomainError('NOT_FOUND', 'Import expired: choose the file again')
      pending.delete(token)
      // The notebook is saved before a bulk change.
      await manager.backup('manual').catch(() => undefined)
      return applyImport(manager.db, entry, { strategy, ids, mediaRoot: mediaRoot() })
    },
  }
}
