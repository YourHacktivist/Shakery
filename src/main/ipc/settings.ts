/**
 * Settings (section 10.14), backup folder and logs. The backup folder is only changed through
 * the folder dialog of the main process: the renderer never gives a path.
 */
import { constants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { app, BrowserWindow, dialog, shell } from 'electron'
import type { RendererSettingKey, SettingValue } from '../../shared/settings'
import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { SqliteSettingsRepository } from '../db/repositories/settings'
import { DomainError } from '../errors'
import { defaultBackupDirectory } from '../paths'
import { applyWindowTheme } from '../window'
import type { IpcHandlers } from './dispatch'

export function createSettingsHandlers(
  manager: DatabaseManager,
): Pick<
  IpcHandlers,
  | 'settings.getAll'
  | 'settings.set'
  | 'backups.directory'
  | 'backups.chooseDirectory'
  | 'backups.useDefaultDirectory'
  | 'app.openLogs'
> {
  const ids = systemIds()
  const settings = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new SqliteSettingsRepository(manager.db, ids.now)
  }
  const directory = () => {
    const chosen = settings().get('backup.directory')
    return { directory: chosen ?? defaultBackupDirectory(), isDefault: chosen === null }
  }

  return {
    'settings.getAll': () => settings().getAll(),
    'settings.set': ({ key, value }) => {
      const repository = settings()
      repository.set(key, value as SettingValue<RendererSettingKey>)
      if (key === 'appearance.theme') applyWindowTheme(repository.get(key))
      return null
    },
    'backups.directory': () => directory(),
    'backups.chooseDirectory': async () => {
      const window = BrowserWindow.getFocusedWindow()
      const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: directory().directory,
      }
      const choice = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      const chosen = choice.filePaths[0]
      if (choice.canceled || !chosen) return null
      try {
        await mkdir(chosen, { recursive: true })
        await access(chosen, constants.W_OK)
      } catch {
        throw new DomainError('UNAVAILABLE', 'This folder cannot be written')
      }
      settings().set('backup.directory', chosen)
      return directory()
    },
    'backups.useDefaultDirectory': () => {
      settings().set('backup.directory', null)
      return directory()
    },
    'app.openLogs': async () => {
      const error = await shell.openPath(app.getPath('logs'))
      if (error !== '') throw new DomainError('UNAVAILABLE', 'The log folder cannot be opened')
      return null
    },
  }
}
