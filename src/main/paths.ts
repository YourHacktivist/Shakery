import { app } from 'electron'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { RendererTarget } from './security-policy'

/** Folder of the notebook of a portable copy, beside its executable (D-055). */
export const PORTABLE_DATA_FOLDER = 'Shakery Data'

/**
 * Folder of a portable copy, null for an installed or a development build (D-056). The portable
 * archive puts a « Shakery Data » folder beside Shakery.exe; the self-extracting executable of
 * 0.2.2 gave its own folder through PORTABLE_EXECUTABLE_DIR.
 */
export function portableDirectory(): string | null {
  if (!app.isPackaged) return null
  const launcher = process.env['PORTABLE_EXECUTABLE_DIR']
  if (launcher) return launcher
  const beside = dirname(process.execPath)
  return existsSync(join(beside, PORTABLE_DATA_FOLDER)) ? beside : null
}

/**
 * A portable copy keeps its notebook, backups and logs beside it, on a USB key as on a disk.
 * End-to-end tests run several isolated instances, each with its own data folder; that
 * override is ignored in a packaged build.
 */
export function applyUserDataOverride(): void {
  const portable = portableDirectory()
  if (portable) {
    app.setPath('userData', join(portable, PORTABLE_DATA_FOLDER))
    app.setAppLogsPath()
    return
  }
  const dir = process.env['SHAKERY_USER_DATA_DIR']
  if (!app.isPackaged && dir) app.setPath('userData', dir)
}

export function devServerUrl(): string | null {
  const url = process.env['ELECTRON_RENDERER_URL']
  return !app.isPackaged && url ? url : null
}

export function rendererIndexFile(): string {
  return join(__dirname, '../renderer/index.html')
}

/** Start-up window (D-056), built beside the interface. */
export function splashFile(): string {
  return join(__dirname, '../renderer/splash.html')
}

export function preloadFile(): string {
  return join(__dirname, '../preload/index.js')
}

export function rendererTarget(): RendererTarget {
  const dev = devServerUrl()
  if (dev) return { kind: 'dev', origin: dev }
  return {
    kind: 'file',
    indexFileUrl: pathToFileURL(rendererIndexFile()).toString(),
    caseInsensitive: process.platform === 'win32' || process.platform === 'darwin',
  }
}

export function mediaRoot(): string {
  return join(app.getPath('userData'), 'media')
}

export function databaseFile(): string {
  return join(app.getPath('userData'), 'shakery.db')
}

export function defaultBackupDirectory(): string {
  return join(app.getPath('userData'), 'backups')
}

/** Shipped migrations (inside the asar archive once packaged). */
export function migrationsFolder(): string {
  return join(app.getAppPath(), 'resources', 'migrations')
}

/** Generated seed files read at start-up (resources/seed, section 9). */
export function seedFolder(): string {
  return join(app.getAppPath(), 'resources', 'seed')
}

export function windowIconFile(): string | undefined {
  return app.isPackaged ? undefined : join(app.getAppPath(), 'resources', 'icon.png')
}
