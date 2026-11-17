import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, quickCheck, type Sqlite } from '../db/connection'
import { BackupError, BackupService, listMediaFiles } from './backup'

let root: string
let dbFile: string
let mediaRoot: string
let backupDir: string
let sqlite: Sqlite
let clock: number

const SCHEMA = `
  CREATE TABLE ingredients (id TEXT PRIMARY KEY, name TEXT NOT NULL, deleted_at INTEGER);
  CREATE TABLE recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL, notes TEXT, deleted_at INTEGER);
  CREATE TABLE tasting_notes (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id),
    overall INTEGER,
    deleted_at INTEGER
  );
`

function dump(db: Sqlite): Record<string, unknown[]> {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>
  return Object.fromEntries(
    tables.map(({ name }) => [name, db.prepare(`SELECT * FROM ${name} ORDER BY id`).all()]),
  )
}

async function mediaSnapshot(): Promise<Record<string, string>> {
  const files = await listMediaFiles(mediaRoot)
  const entries = await Promise.all(
    files.map(
      async (f) => [f, (await readFile(path.join(mediaRoot, ...f.split('/')))).toString('hex')] as const,
    ),
  )
  return Object.fromEntries(entries)
}

function service(): BackupService {
  return new BackupService({ directory: backupDir, mediaRoot, appVersion: '0.1.0', now: () => clock })
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'shakery-backup-'))
  dbFile = path.join(root, 'shakery.db')
  mediaRoot = path.join(root, 'media')
  backupDir = path.join(root, 'backups')
  clock = new Date(2026, 10, 17, 9, 0).getTime()
  await mkdir(path.join(mediaRoot, 'recipes'), { recursive: true })
  sqlite = openDatabase(dbFile)
  sqlite.exec(SCHEMA)
  sqlite.exec(`
    INSERT INTO ingredients VALUES ('i1', 'Gin London Dry', NULL), ('i2', 'Campari', NULL), ('i3', 'Ancien', 1);
    INSERT INTO recipes VALUES ('r1', 'Negroni', 'Crème, œuf, “guillemets”', NULL), ('r2', 'Bamboo', NULL, NULL);
    INSERT INTO tasting_notes VALUES ('t1', 'r1', 4, NULL);
  `)
  await writeFile(path.join(mediaRoot, 'recipes', 'r1.webp'), Buffer.from('photo-negroni'))
  await writeFile(path.join(mediaRoot, 'recipes', 'r2.webp'), Buffer.from('photo-bamboo'))
})

afterEach(async () => {
  if (sqlite.open) sqlite.close()
  await rm(root, { recursive: true, force: true })
})

describe('BackupService', () => {
  it('backs up then restores exactly the same data, photos included', async () => {
    const before = dump(sqlite)
    const mediaBefore = await mediaSnapshot()
    const manifest = await service().create(sqlite, 'manual')
    expect(manifest.integrity).toBe('ok')
    expect(manifest.counts).toEqual({ recipes: 2, tastingNotes: 1, ingredients: 2 })
    expect(manifest.media).toEqual(['recipes/r1.webp', 'recipes/r2.webp'])

    // Changes made after the backup: rows edited and deleted, a photo replaced, one added, one removed.
    sqlite.exec(`
      UPDATE recipes SET name = 'Negroni fumé' WHERE id = 'r1';
      DELETE FROM tasting_notes;
      INSERT INTO recipes VALUES ('r3', 'Nouveau', NULL, NULL);
    `)
    await writeFile(path.join(mediaRoot, 'recipes', 'r1.webp'), Buffer.from('another-photo-of-the-negroni'))
    await writeFile(path.join(mediaRoot, 'recipes', 'r3.webp'), Buffer.from('photo-new'))
    await rm(path.join(mediaRoot, 'recipes', 'r2.webp'))
    sqlite.close()

    await service().restore(manifest.id, { dbFile, mediaRoot })
    sqlite = openDatabase(dbFile)
    expect(dump(sqlite)).toEqual(before)
    expect(await mediaSnapshot()).toEqual(mediaBefore)
    expect(quickCheck(sqlite).ok).toBe(true)
  })

  it('captures the rows still in the WAL file', async () => {
    sqlite.exec("INSERT INTO recipes VALUES ('r9', 'Dans le WAL', NULL, NULL)")
    const manifest = await service().create(sqlite, 'manual')
    const copy = openDatabase(path.join(backupDir, manifest.id, 'shakery.db'), { readonly: true })
    expect(copy.prepare("SELECT name FROM recipes WHERE id = 'r9'").get()).toEqual({ name: 'Dans le WAL' })
    copy.close()
  })

  it('stores each photo once across backups', async () => {
    const backups = service()
    await backups.create(sqlite, 'daily')
    clock += 86_400_000
    await backups.create(sqlite, 'daily')
    expect(await listMediaFiles(path.join(backupDir, 'media'))).toEqual([
      'recipes/r1.webp',
      'recipes/r2.webp',
    ])
    expect(await backups.list()).toHaveLength(2)
  })

  it('rotates old backups and prunes the photos nobody references', async () => {
    const backups = new BackupService({
      directory: backupDir,
      mediaRoot,
      appVersion: '0.1.0',
      now: () => clock,
      policy: { daily: 2, weekly: 0, safety: 0, manual: 0 },
    })
    await backups.create(sqlite, 'daily')
    await rm(path.join(mediaRoot, 'recipes', 'r2.webp'))
    for (let day = 1; day <= 3; day += 1) {
      clock += 86_400_000
      await backups.create(sqlite, 'daily')
    }
    expect(await backups.list()).toHaveLength(2)
    expect(await listMediaFiles(path.join(backupDir, 'media'))).toEqual(['recipes/r1.webp'])
  })

  it('lists backups newest first and finds the latest healthy one', async () => {
    const backups = service()
    const first = await backups.create(sqlite, 'daily')
    clock += 86_400_000 // next day: two backups on the same day would be rotated to one
    const second = await backups.create(sqlite, 'shutdown')
    expect((await backups.list()).map((m) => m.id)).toEqual([second.id, first.id])
    expect((await backups.latestHealthy())?.id).toBe(second.id)
  })

  it('ignores an unfinished backup folder', async () => {
    await mkdir(path.join(backupDir, '20261117T090000000Z_daily'), { recursive: true })
    expect(await service().list()).toEqual([])
  })

  it('refuses unknown or malformed backup ids', async () => {
    await expect(service().readManifest('../../etc')).rejects.toBeInstanceOf(BackupError)
    await expect(service().readManifest('20261117T090000000Z_daily')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('refuses to restore a backup whose photos are missing', async () => {
    const manifest = await service().create(sqlite, 'manual')
    await rm(path.join(backupDir, 'media', 'recipes', 'r1.webp'))
    sqlite.close()
    await expect(service().restore(manifest.id, { dbFile, mediaRoot })).rejects.toMatchObject({
      code: 'INVALID_BACKUP',
    })
    // The current database is left untouched.
    expect((await stat(dbFile)).size).toBeGreaterThan(0)
  })

  it('reports an unavailable backup folder instead of failing silently', async () => {
    const blocker = path.join(root, 'not-a-folder')
    await writeFile(blocker, 'x')
    const backups = new BackupService({
      directory: path.join(blocker, 'backups'),
      mediaRoot,
      appVersion: '0.1.0',
    })
    await expect(backups.create(sqlite, 'daily')).rejects.toMatchObject({ code: 'DIRECTORY_UNAVAILABLE' })
  })
})

describe('quickCheck', () => {
  it('reports a corrupted file', async () => {
    sqlite.close()
    const corrupt = path.join(root, 'corrupt.db')
    await writeFile(corrupt, Buffer.alloc(8192, 0x42))
    const db = openDatabase(corrupt, { readonly: true })
    expect(quickCheck(db).ok).toBe(false)
    db.close()
    sqlite = openDatabase(dbFile)
  })
})
