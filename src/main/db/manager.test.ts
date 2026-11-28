import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { loadSeedData, type SeedData } from '../seed/load'
import type { Ids } from './client'
import { openDatabase } from './connection'
import { DatabaseManager, type Logger } from './manager'
import { SqliteReferenceRepository } from './repositories/reference'
import { SqliteSettingsRepository } from './repositories/settings'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')

const SEED: SeedData = {
  categories: [
    {
      seed_key: 'cat.spirits',
      name: 'Spiritueux',
      slug: 'spiritueux',
      parent: null,
      sort_order: 1,
      batch_hint: 'ok',
    },
    { seed_key: 'cat.gin', name: 'Gin', slug: 'gin', parent: 'cat.spirits', sort_order: 1, batch_hint: 'ok' },
    {
      seed_key: 'cat.soft',
      name: 'Sodas et tonics',
      slug: 'sodas-et-tonics',
      parent: null,
      sort_order: 2,
      batch_hint: 'add_at_service',
    },
  ],
  glasses: [
    { seed_key: 'glass.coupe', name: 'Coupe', capacity_ml: null, sort_order: 1 },
    { seed_key: 'glass.rocks', name: 'Rocks', capacity_ml: null, sort_order: 2 },
  ],
  ice: [{ seed_key: 'ice.cubes', name: 'Glaçons', sort_order: 1 }],
  ingredients: [],
  recipes: [],
}

let root: string
let clock: number
let ids: Ids
const log: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

function manager(seed: SeedData = SEED): DatabaseManager {
  return new DatabaseManager({
    dbFile: path.join(root, 'shakery.db'),
    mediaRoot: path.join(root, 'media'),
    migrationsFolder: MIGRATIONS,
    defaultBackupDirectory: path.join(root, 'backups'),
    appVersion: '0.1.0',
    ids,
    log,
    seed: (db, i) => {
      loadSeedData(db, i, seed)
    },
  })
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'shakery-manager-'))
  clock = new Date(2026, 10, 17, 9, 0).getTime()
  ids = {
    now: () => clock,
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(7),
    ),
  }
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('DatabaseManager', () => {
  it('creates the database and its reference data at first launch', async () => {
    const m = manager()
    expect(await m.open()).toBe('ready')
    const reference = new SqliteReferenceRepository(m.db)
    expect(reference.listGlasses().map((g) => g.name)).toEqual(['Coupe', 'Rocks'])
    expect(reference.listIceTypes().map((i) => i.name)).toEqual(['Glaçons'])
    expect(reference.listCategories().map((c) => c.slug)).toEqual(['spiritueux', 'gin', 'sodas-et-tonics'])
    expect((await m.health()).database).toBe('ready')
    m.close()
  })

  it('never recreates a seed entry the user deleted, and adds new ones on update', async () => {
    const first = manager()
    await first.open()
    first.db.$client.prepare("UPDATE glasses SET deleted_at = ? WHERE seed_key = 'glass.rocks'").run(clock)
    first.close()

    const updated: SeedData = {
      ...SEED,
      glasses: [
        ...SEED.glasses,
        { seed_key: 'glass.flute', name: 'Flûte', capacity_ml: null, sort_order: 3 },
      ],
    }
    const second = manager(updated)
    await second.open()
    expect(new SqliteReferenceRepository(second.db).listGlasses().map((g) => g.name)).toEqual([
      'Coupe',
      'Flûte',
    ])
    second.close()
  })

  it('backs up once a day at startup', async () => {
    const m = manager()
    await m.open()
    expect(await m.backupIfDue()).not.toBeNull()
    clock += 60 * 60 * 1000
    expect(await m.backupIfDue()).toBeNull()
    clock += 24 * 60 * 60 * 1000
    expect(await m.backupIfDue()).not.toBeNull()
    expect((await m.health()).lastBackupAt).toBe(clock)
    m.close()
  })

  it('reports an unreachable backup folder on the health status', async () => {
    const m = manager()
    await m.open()
    const blocker = path.join(root, 'blocker')
    await writeFile(blocker, 'x')
    new SqliteSettingsRepository(m.db, ids.now).set('backup.directory', path.join(blocker, 'backups'))
    await expect(m.backup('manual')).rejects.toMatchObject({ code: 'DIRECTORY_UNAVAILABLE' })
    expect((await m.health()).backupError).toBe('DIRECTORY_UNAVAILABLE')
    m.close()
  })

  it('backs up before applying a pending migration to an existing notebook', async () => {
    const m = manager()
    await m.open()
    m.close()
    // Simulate a notebook created by an older version: forget the last migration, which
    // rebuilds the ingredients table and can run again on the current schema (0004).
    const raw = openDatabase(path.join(root, 'shakery.db'))
    // Drizzle's id column stays NULL in SQLite: the order is given by created_at.
    raw.exec(
      'DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)',
    )
    raw.close()

    const again = manager()
    expect(await again.open()).toBe('ready')
    const backups = await again.listBackups()
    expect(backups.map((b) => b.reason)).toEqual(['pre-migration'])
    again.close()
  })

  it('does not migrate nor write a damaged file, and keeps it before restoring', async () => {
    const m = manager()
    await m.open()
    const reference = new SqliteReferenceRepository(m.db)
    const glassesBefore = reference.listGlasses()
    const healthy = await m.backup('manual')
    m.close()

    await writeFile(path.join(root, 'shakery.db'), Buffer.alloc(16_384, 0x42))
    const broken = manager()
    expect(await broken.open()).toBe('corrupt')
    expect(() => broken.db).toThrow()
    const health = await broken.health()
    expect(health.database).toBe('corrupt')
    expect(health.integrityMessages.length).toBeGreaterThan(0)
    expect(health.latestHealthyBackupId).toBe(healthy.id)

    clock += 1_000
    await broken.restore(healthy.id)
    expect(broken.status).toBe('ready')
    expect(new SqliteReferenceRepository(broken.db).listGlasses()).toEqual(glassesBefore)
    const kept = (await readdir(path.join(root, 'backups'))).filter((name) => name.startsWith('damaged-'))
    expect(kept).toHaveLength(1)
    broken.close()
  })

  it('resets to a new notebook after a backup that brings the old one back', async () => {
    const m = manager()
    await m.open()
    const elsewhere = path.join(root, 'elsewhere')
    new SqliteSettingsRepository(m.db, () => clock).set('backup.directory', elsewhere)
    m.db.$client.prepare("UPDATE glasses SET name = 'Ma coupe' WHERE seed_key = 'glass.coupe'").run()
    await mkdir(path.join(root, 'media', 'recipes'), { recursive: true })
    await writeFile(path.join(root, 'media', 'recipes', 'photo.webp'), 'photo')

    const backup = await m.reset()

    expect(backup.reason).toBe('pre-reset')
    expect(m.status).toBe('ready')
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Coupe')
    expect(new SqliteSettingsRepository(m.db, () => clock).get('backup.directory')).toBe(elsewhere)
    expect(await readdir(path.join(root, 'media', 'recipes'))).toEqual([])
    expect((await readdir(root)).filter((name) => name.includes('resetting'))).toEqual([])
    expect((await m.listBackups()).map((b) => b.id)).toContain(backup.id)

    clock += 60_000
    await m.restore(backup.id)
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Ma coupe')
    expect(await readdir(path.join(root, 'media', 'recipes'))).toEqual(['photo.webp'])
    m.close()
  })

  it('erases nothing when the backup before a reset fails', async () => {
    const m = manager()
    await m.open()
    const blocked = path.join(root, 'not-a-folder')
    await writeFile(blocked, 'a file where the folder should be')
    new SqliteSettingsRepository(m.db, () => clock).set('backup.directory', blocked)
    m.db.$client.prepare("UPDATE glasses SET name = 'Ma coupe' WHERE seed_key = 'glass.coupe'").run()

    await expect(m.reset()).rejects.toThrow()
    await expect(m.backupBeforeErasing('pre-purge')).rejects.toThrow()

    expect(m.status).toBe('ready')
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Ma coupe')
    m.close()
  })

  it('puts the notebook back when the new one does not open', async () => {
    const first = manager()
    await first.open()
    first.db.$client.prepare("UPDATE glasses SET name = 'Ma coupe' WHERE seed_key = 'glass.coupe'").run()
    first.close()
    let starts = 0
    const m = new DatabaseManager({
      dbFile: path.join(root, 'shakery.db'),
      mediaRoot: path.join(root, 'media'),
      migrationsFolder: MIGRATIONS,
      defaultBackupDirectory: path.join(root, 'backups'),
      appVersion: '0.1.0',
      ids,
      log,
      seed: () => {
        starts += 1
        if (starts === 2) throw new Error('seed failure')
      },
    })
    await m.open()

    await expect(m.reset()).rejects.toThrow(/previous one is back/)

    expect(m.status).toBe('ready')
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Ma coupe')
    m.close()
  })

  it('goes back to the default backup folder, and resets from it', async () => {
    const m = manager()
    await m.open()
    const settings = new SqliteSettingsRepository(m.db, () => clock)
    settings.set('backup.directory', path.join(root, 'elsewhere'))
    settings.set('backup.directory', null)
    expect(settings.get('backup.directory')).toBeNull()
    expect((await m.reset()).reason).toBe('pre-reset')
    expect(await readdir(path.join(root, 'backups'))).not.toEqual([])
    m.close()
  })

  it('follows the frequency and the retention of the settings', async () => {
    const m = manager()
    await m.open()
    const settings = new SqliteSettingsRepository(m.db, () => clock)
    settings.set('backup.frequencyHours', 72)
    settings.set('backup.keepDaily', 3)
    settings.set('backup.keepWeekly', 0)
    await m.backup('daily')
    clock += 2 * 86_400_000
    expect(await m.backupIfDue()).toBeNull()
    for (let day = 0; day < 5; day += 1) {
      clock += 86_400_000
      await m.backup('daily')
    }
    expect(await m.listBackups()).toHaveLength(3)
    m.close()
  })

  it('saves the current state before restoring a healthy notebook', async () => {
    const m = manager()
    await m.open()
    const backup = await m.backup('manual')
    clock += 86_400_000
    m.db.$client.prepare("UPDATE glasses SET name = 'Coupe modifiée' WHERE seed_key = 'glass.coupe'").run()
    await m.restore(backup.id)
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Coupe')
    expect((await m.listBackups()).some((b) => b.reason === 'pre-restore')).toBe(true)
    m.close()
  })

  it('restores a backup made the same day, which the rotation must not delete first', async () => {
    const m = manager()
    await m.open()
    await m.backupIfDue()
    clock += 60_000
    const daily = (await m.listBackups())[0]
    if (!daily) throw new Error('no daily backup')
    clock += 60_000
    m.db.$client.prepare("UPDATE glasses SET name = 'Coupe modifiée' WHERE seed_key = 'glass.coupe'").run()
    await m.restore(daily.id)
    expect(new SqliteReferenceRepository(m.db).listGlasses()[0]?.name).toBe('Coupe')
    m.close()
  })

  it('creates its folders when they do not exist', async () => {
    const nested = path.join(root, 'a', 'b')
    await mkdir(nested, { recursive: true })
    const m = new DatabaseManager({
      dbFile: path.join(nested, 'c', 'shakery.db'),
      mediaRoot: path.join(nested, 'media'),
      migrationsFolder: MIGRATIONS,
      defaultBackupDirectory: path.join(nested, 'backups'),
      appVersion: '0.1.0',
      ids,
      log,
    })
    expect(await m.open()).toBe('ready')
    m.close()
  })
})
