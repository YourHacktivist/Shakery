/**
 * Automatic backups (section 12.3). No Electron import: tested under Vitest.
 *
 * Layout of the backup folder:
 *   <dir>/<id>/shakery.db      consistent copy made with SQLite's backup API (safe in WAL mode)
 *   <dir>/<id>/manifest.json   written last: a folder without it is an unfinished backup
 *   <dir>/media/...            shared store of photos
 *
 * Photos are never modified in place (a new photo gets a new UUID file name), so each one
 * is copied into the shared store once and every manifest lists the files it needs. This
 * keeps 22 retained backups from holding 22 copies of every photo. Files that no retained
 * manifest references are pruned at rotation.
 */
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { countLiveRows, openDatabase, quickCheck, type Sqlite } from '../db/connection'
import { isPathInside } from '../security-policy'
import {
  DEFAULT_ROTATION,
  selectBackupsToKeep,
  type BackupReason,
  type RotationPolicy,
} from './backup-rotation'

export const BACKUP_FORMAT = 1
const DB_NAME = 'shakery.db'
const MANIFEST_NAME = 'manifest.json'
const MEDIA_STORE = 'media'
const BACKUP_ID = /^\d{8}T\d{9}Z_(daily|shutdown|manual|pre-migration|pre-restore)$/

export type BackupCounts = {
  readonly recipes: number | null
  readonly tastingNotes: number | null
  readonly ingredients: number | null
}

export type BackupManifest = {
  readonly format: typeof BACKUP_FORMAT
  readonly id: string
  readonly createdAt: number
  readonly reason: BackupReason
  readonly appVersion: string
  readonly integrity: 'ok' | 'failed'
  readonly counts: BackupCounts
  /** Media files, relative to the media folder, with "/" separators. */
  readonly media: readonly string[]
}

export type BackupServiceOptions = {
  readonly directory: string
  readonly mediaRoot: string
  readonly appVersion: string
  readonly now?: () => number
  readonly policy?: RotationPolicy
}

export class BackupError extends Error {
  readonly code: 'DIRECTORY_UNAVAILABLE' | 'NOT_FOUND' | 'INVALID_BACKUP'

  constructor(code: BackupError['code'], message: string) {
    super(message)
    this.name = 'BackupError'
    this.code = code
  }
}

export function isBackupId(value: string): boolean {
  return BACKUP_ID.test(value)
}

function backupId(createdAt: number, reason: BackupReason): string {
  return `${new Date(createdAt).toISOString().replace(/[-:.]/g, '')}_${reason}`
}

export function readCounts(sqlite: Sqlite): BackupCounts {
  return {
    recipes: countLiveRows(sqlite, 'recipes'),
    tastingNotes: countLiveRows(sqlite, 'tasting_notes'),
    ingredients: countLiveRows(sqlite, 'ingredients'),
  }
}

/** Every regular file under `root`, as sorted relative paths with "/" separators. Links are skipped. */
export async function listMediaFiles(root: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: string, prefix: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative)
      else if (entry.isFile()) out.push(relative)
    }
  }
  await walk(root, '')
  return out.sort()
}

async function sameSize(a: string, b: string): Promise<boolean> {
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)])
    return sa.size === sb.size
  } catch {
    return false
  }
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

function resolveInside(root: string, relative: string): string {
  const resolved = path.resolve(root, ...relative.split('/'))
  if (!isPathInside(root, resolved)) throw new BackupError('INVALID_BACKUP', 'Media path outside its folder')
  return resolved
}

export class BackupService {
  private readonly directory: string
  private readonly mediaRoot: string
  private readonly appVersion: string
  private readonly now: () => number
  private readonly policy: RotationPolicy

  constructor(options: BackupServiceOptions) {
    this.directory = path.resolve(options.directory)
    this.mediaRoot = path.resolve(options.mediaRoot)
    this.appVersion = options.appVersion
    this.now = options.now ?? Date.now
    this.policy = options.policy ?? DEFAULT_ROTATION
  }

  /** Copies the database and its photos, checks the copy, then rotates. */
  async create(sqlite: Sqlite, reason: BackupReason): Promise<BackupManifest> {
    try {
      await mkdir(path.join(this.directory, MEDIA_STORE), { recursive: true })
    } catch (error) {
      throw new BackupError('DIRECTORY_UNAVAILABLE', `Backup folder unavailable: ${(error as Error).message}`)
    }

    let createdAt = this.now()
    let id = backupId(createdAt, reason)
    // Two backups in the same millisecond (tests, fast restarts): never overwrite one.
    while (await this.exists(id)) {
      createdAt += 1
      id = backupId(createdAt, reason)
    }
    const folder = path.join(this.directory, id)
    await mkdir(folder)

    const partial = path.join(folder, `${DB_NAME}.partial`)
    await sqlite.backup(partial)
    await rename(partial, path.join(folder, DB_NAME))

    const copy = openDatabase(path.join(folder, DB_NAME), { readonly: true })
    let integrity: BackupManifest['integrity']
    let counts: BackupCounts
    try {
      integrity = quickCheck(copy).ok ? 'ok' : 'failed'
      counts = readCounts(copy)
    } finally {
      copy.close()
    }

    const media = await listMediaFiles(this.mediaRoot)
    for (const relative of media) {
      const source = resolveInside(this.mediaRoot, relative)
      const target = resolveInside(path.join(this.directory, MEDIA_STORE), relative)
      if (await sameSize(source, target)) continue
      await mkdir(path.dirname(target), { recursive: true })
      await copyFile(source, target)
    }

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      id,
      createdAt,
      reason,
      appVersion: this.appVersion,
      integrity,
      counts,
      media,
    }
    await writeFile(path.join(folder, MANIFEST_NAME), JSON.stringify(manifest, null, 2), 'utf8')
    await this.rotate()
    return manifest
  }

  /** Complete backups, newest first. Unfinished or unreadable folders are ignored. */
  async list(): Promise<BackupManifest[]> {
    let entries
    try {
      entries = await readdir(this.directory, { withFileTypes: true })
    } catch {
      return []
    }
    const manifests: BackupManifest[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || !isBackupId(entry.name)) continue
      const manifest = await this.readManifest(entry.name).catch(() => null)
      if (manifest) manifests.push(manifest)
    }
    return manifests.sort((a, b) => b.createdAt - a.createdAt)
  }

  async latestHealthy(): Promise<BackupManifest | null> {
    return (await this.list()).find((m) => m.integrity === 'ok') ?? null
  }

  async readManifest(id: string): Promise<BackupManifest> {
    if (!isBackupId(id)) throw new BackupError('NOT_FOUND', 'Unknown backup')
    let raw: string
    try {
      raw = await readFile(path.join(this.directory, id, MANIFEST_NAME), 'utf8')
    } catch {
      throw new BackupError('NOT_FOUND', 'Unknown backup')
    }
    const parsed = JSON.parse(raw) as Partial<BackupManifest>
    if (parsed.format !== BACKUP_FORMAT || parsed.id !== id || !Array.isArray(parsed.media)) {
      throw new BackupError('INVALID_BACKUP', 'Unreadable backup manifest')
    }
    return parsed as BackupManifest
  }

  /**
   * Replaces the database file and the media folder with the content of a backup. The
   * caller closes the database first, has saved the current state, and reopens after.
   * Afterwards the media folder holds exactly the files listed in the manifest.
   */
  async restore(
    id: string,
    target: { readonly dbFile: string; readonly mediaRoot: string },
  ): Promise<BackupManifest> {
    const manifest = await this.readManifest(id)
    const source = path.join(this.directory, id, DB_NAME)
    const check = openDatabase(source, { readonly: true })
    try {
      if (!quickCheck(check).ok) throw new BackupError('INVALID_BACKUP', 'Backup failed its integrity check')
    } finally {
      check.close()
    }

    const store = path.join(this.directory, MEDIA_STORE)
    for (const relative of manifest.media) {
      if (!(await isFile(resolveInside(store, relative)))) {
        throw new BackupError('INVALID_BACKUP', 'A photo of this backup is missing')
      }
    }

    await rm(`${target.dbFile}-wal`, { force: true })
    await rm(`${target.dbFile}-shm`, { force: true })
    const staging = `${target.dbFile}.restoring`
    await copyFile(source, staging)
    await rename(staging, target.dbFile)

    const mediaRoot = path.resolve(target.mediaRoot)
    const wanted = new Set(manifest.media)
    for (const relative of await listMediaFiles(mediaRoot)) {
      if (!wanted.has(relative)) await rm(resolveInside(mediaRoot, relative), { force: true })
    }
    for (const relative of manifest.media) {
      const from = resolveInside(store, relative)
      const to = resolveInside(mediaRoot, relative)
      if (await sameSize(from, to)) continue
      await mkdir(path.dirname(to), { recursive: true })
      await copyFile(from, to)
    }
    return manifest
  }

  /** Deletes the backups outside the retention policy and the photos no one references. */
  async rotate(): Promise<{ deleted: string[] }> {
    const manifests = await this.list()
    const keep = selectBackupsToKeep(manifests, this.policy)
    const deleted: string[] = []
    for (const manifest of manifests) {
      if (keep.has(manifest.id)) continue
      await rm(path.join(this.directory, manifest.id), { recursive: true, force: true })
      deleted.push(manifest.id)
    }

    const referenced = new Set(manifests.filter((m) => keep.has(m.id)).flatMap((m) => m.media))
    const store = path.join(this.directory, MEDIA_STORE)
    for (const relative of await listMediaFiles(store)) {
      if (!referenced.has(relative)) await rm(resolveInside(store, relative), { force: true })
    }
    return { deleted }
  }

  private async exists(id: string): Promise<boolean> {
    try {
      await stat(path.join(this.directory, id))
      return true
    } catch {
      return false
    }
  }
}
