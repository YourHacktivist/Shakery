import { app } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { RendererTarget } from './security-policy'

/**
 * End-to-end tests run several isolated instances, each with its own data folder.
 * The override is ignored in a packaged build.
 */
export function applyUserDataOverride(): void {
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

export function windowIconFile(): string | undefined {
  return app.isPackaged ? undefined : join(app.getAppPath(), 'resources', 'icon.png')
}
