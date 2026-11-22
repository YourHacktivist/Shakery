/**
 * Owns the notebook database: startup checks, migrations, seed data, backups, restore.
 * No Electron import, so the whole lifecycle is tested under Vitest.
 *
 * Startup (sections 7 and 12.3):
 * 1. open the file and run `PRAGMA quick_check`. On failure, nothing is migrated or
 *    written: the app starts in « corrupt » state and offers to restore the latest
 *    healthy backup, without overwriting anything before the user confirms;
 * 2. if the file already holds a notebook and migrations are pending, back up first;
 * 3. migrate, then add the missing seed entries.
 */
import { copyFile, mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import type { DatabaseHealth } from '../../shared/domain/health'
import { SETTING_DEFAULTS, settingsSchemas, type SettingKey, type SettingValue } from '../../shared/settings'
import { BackupError, BackupService, listMediaFiles, type BackupManifest } from '../services/backup'
import { DEFAULT_ROTATION, type BackupReason } from '../services/backup-rotation'
import { createDb, type Db, type Ids } from './client'
import { openDatabase, quickCheck, tableExists, type Sqlite } from './connection'
import { hasSchema, pendingMigrationCount, runMigrations } from './migrate'
import { SqliteSettingsRepository } from './repositories/settings'

export type Logger = {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export type DatabaseManagerOptions = {
  readonly dbFile: string
  readonly mediaRoot: string
  readonly migrationsFolder: string
  readonly defaultBackupDirectory: string
  readonly appVersion: string
  readonly ids: Ids
  readonly log: Logger
  /** Adds the missing reference data after migrations. */
  readonly seed?: (db: Db, ids: Ids) => void
}

const HOUR_MS = 60 * 60 * 1000
export const DAILY_BACKUP_AGE_MS = 24 * HOUR_MS

export class DatabaseManager {
  private sqlite: Sqlite | null = null
  private drizzleDb: Db | null = null
  private state: DatabaseHealth['database'] = 'error'
  private integrityMessages: string[] = []
  private backupError: DatabaseHealth['backupError'] = null

  constructor(private readonly options: DatabaseManagerOptions) {}

  get status(): DatabaseHealth['database'] {
    return this.state
  }

  /** The Drizzle database; only available once startup succeeded. */
  get db(): Db {
    if (this.state !== 'ready' || !this.drizzleDb) throw new Error('Database is not ready')
    return this.drizzleDb
  }

  async open(): Promise<DatabaseHealth['database']> {
    const { dbFile, log } = this.options
    await mkdir(path.dirname(dbFile), { recursive: true })
    this.integrityMessages = []

    let sqlite: Sqlite
    try {
      sqlite = openDatabase(dbFile)
    } catch (error) {
      return this.markCorrupt([error instanceof Error ? error.message : String(error)])
    }

    const integrity = quickCheck(sqlite)
    if (!integrity.ok) {
      sqlite.close()
      return this.markCorrupt(integrity.messages)
    }

    try {
      if (hasSchema(sqlite) && pendingMigrationCount(sqlite, this.options.migrationsFolder) > 0) {
        log.info('Pending migrations: backing up first')
        await this.backupService(sqlite).create(sqlite, 'pre-migration')
      }
      runMigrations(sqlite, this.options.migrationsFolder)
      const db = createDb(sqlite)
      this.options.seed?.(db, this.options.ids)
      this.sqlite = sqlite
      this.drizzleDb = db
      this.state = 'ready'
      log.info('Database ready')
      return this.state
    } catch (error) {
      log.error('Database startup failed', error)
      sqlite.close()
      this.state = 'error'
      return this.state
    }
  }

  /** Backup at startup when the latest one is older than the frequency chosen (section 12.3). */
  async backupIfDue(chosenAgeMs?: number): Promise<BackupManifest | null> {
    if (this.state !== 'ready' || !this.sqlite) return null
    const maxAgeMs = chosenAgeMs ?? this.setting(this.sqlite, 'backup.frequencyHours') * HOUR_MS
    const latest = (await this.backupService(this.sqlite).list())[0]
    if (latest && this.options.ids.now() - latest.createdAt < maxAgeMs) return null
    return this.backup('daily')
  }

  /** Backs up now. A failure is recorded for the home screen, never silent. */
  async backup(reason: BackupReason, protect: readonly string[] = []): Promise<BackupManifest> {
    if (this.state !== 'ready' || !this.sqlite) throw new Error('Database is not ready')
    try {
      const manifest = await this.backupService(this.sqlite).create(this.sqlite, reason, { protect })
      this.backupError = null
      return manifest
    } catch (error) {
      this.backupError =
        error instanceof BackupError && error.code === 'DIRECTORY_UNAVAILABLE'
          ? 'DIRECTORY_UNAVAILABLE'
          : 'FAILED'
      this.options.log.error(`Backup (${reason}) failed`, error)
      throw error
    }
  }

  async listBackups(): Promise<BackupManifest[]> {
    return this.backupService(this.sqlite).list()
  }

  /**
   * Replaces the notebook with a backup. The current state is saved first: a regular
   * pre-restore backup when the database is healthy, a raw copy of the files when it is
   * corrupt (SQLite's backup API cannot read a damaged file).
   */
  async restore(id: string): Promise<BackupManifest> {
    const backups = this.backupService(this.sqlite)
    await backups.readManifest(id)
    if (this.state === 'ready') {
      // The backup being restored must survive the rotation this backup triggers.
      await this.backup('pre-restore', [id])
    } else {
      await this.preserveRawFiles()
    }
    this.close()
    const manifest = await backups.restore(id, {
      dbFile: this.options.dbFile,
      mediaRoot: this.options.mediaRoot,
    })
    await this.open()
    return manifest
  }

  /** The backup that must succeed, and be readable, before anything is erased. */
  async backupBeforeErasing(reason: 'pre-purge' | 'pre-reset'): Promise<BackupManifest> {
    const manifest = await this.backup(reason)
    if (manifest.integrity !== 'ok') {
      throw new BackupError(
        'INVALID_BACKUP',
        'The backup before erasing failed its check: nothing was erased',
      )
    }
    return manifest
  }

  /**
   * A new notebook in place of this one (section 10.14, D-043). In this order: a verified
   * backup, or nothing is touched; the file set aside; the new notebook opened, or the old one
   * put back; only then the old file and the photos, which the backup holds, are removed.
   * The backup folder is kept, so that the backup just made stays in sight.
   */
  async reset(): Promise<BackupManifest> {
    if (this.state !== 'ready' || !this.sqlite) throw new Error('Database is not ready')
    const { dbFile, mediaRoot, log, ids } = this.options
    const manifest = await this.backupBeforeErasing('pre-reset')
    const before = new SqliteSettingsRepository(this.db, ids.now)
    const directory = before.get('backup.directory')
    const theme = before.get('appearance.theme')

    this.close()
    const aside = `${dbFile}.resetting`
    try {
      await rm(aside, { force: true })
      await rename(dbFile, aside)
    } catch (error) {
      await this.open()
      throw error
    }
    await rm(`${dbFile}-wal`, { force: true })
    await rm(`${dbFile}-shm`, { force: true })
    if ((await this.open()) !== 'ready') {
      this.close()
      for (const suffix of ['', '-wal', '-shm']) await rm(`${dbFile}${suffix}`, { force: true })
      await rename(aside, dbFile)
      await this.open()
      throw new Error('The new notebook did not open: the previous one is back')
    }

    const after = new SqliteSettingsRepository(this.db, ids.now)
    after.set('backup.directory', directory)
    after.set('appearance.theme', theme)
    await rm(aside, { force: true })
    for (const relative of await listMediaFiles(mediaRoot)) {
      await rm(path.join(mediaRoot, relative), { force: true })
    }
    log.info('Notebook reset after a backup')
    return manifest
  }

  async health(): Promise<DatabaseHealth> {
    const backups = await this.backupService(this.sqlite)
      .list()
      .catch(() => [])
    return {
      database: this.state,
      integrityMessages: this.integrityMessages.map((m) => m.slice(0, 500)).slice(0, 20),
      lastBackupAt: backups[0]?.createdAt ?? null,
      backupError: this.backupError,
      latestHealthyBackupId: backups.find((b) => b.integrity === 'ok')?.id ?? null,
    }
  }

  close(): void {
    if (this.sqlite?.open) {
      try {
        this.sqlite.pragma('wal_checkpoint(TRUNCATE)')
      } catch {
        // A failed checkpoint only leaves the WAL file in place; closing still works.
      }
      this.sqlite.close()
    }
    this.sqlite = null
    this.drizzleDb = null
    if (this.state === 'ready') this.state = 'error'
  }

  private markCorrupt(messages: string[]): DatabaseHealth['database'] {
    this.state = 'corrupt'
    this.integrityMessages = messages
    this.options.log.error('Database failed its integrity check', messages.slice(0, 3))
    return this.state
  }

  /** A setting read straight from the file, which may be unreadable or not migrated yet. */
  private setting<K extends SettingKey>(sqlite: Sqlite | null, key: K): SettingValue<K> {
    if (sqlite?.open && tableExists(sqlite, 'settings')) {
      const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
        { value: string } | undefined
      if (row) {
        try {
          const parsed = settingsSchemas[key].safeParse(JSON.parse(row.value))
          if (parsed.success) return parsed.data as SettingValue<K>
        } catch {
          // Unreadable setting: its default.
        }
      }
    }
    return SETTING_DEFAULTS[key]
  }

  /** Backup folder from the settings when readable, else the default one. */
  private backupDirectory(sqlite: Sqlite | null): string {
    return this.setting(sqlite, 'backup.directory') ?? this.options.defaultBackupDirectory
  }

  private backupService(sqlite: Sqlite | null): BackupService {
    return new BackupService({
      directory: this.backupDirectory(sqlite),
      mediaRoot: this.options.mediaRoot,
      appVersion: this.options.appVersion,
      now: this.options.ids.now,
      policy: {
        ...DEFAULT_ROTATION,
        daily: this.setting(sqlite, 'backup.keepDaily'),
        weekly: this.setting(sqlite, 'backup.keepWeekly'),
      },
    })
  }

  private async preserveRawFiles(): Promise<void> {
    const stamp = new Date(this.options.ids.now()).toISOString().replace(/[-:.]/g, '')
    const target = path.join(this.backupDirectory(null), `damaged-${stamp}`)
    await mkdir(target, { recursive: true })
    for (const suffix of ['', '-wal', '-shm']) {
      await copyFile(`${this.options.dbFile}${suffix}`, path.join(target, `shakery.db${suffix}`)).catch(
        () => undefined,
      )
    }
    this.options.log.warn('Damaged database files kept before restore')
  }
}
