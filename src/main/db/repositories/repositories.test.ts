import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS } from '../../../shared/settings'
import { createDb, systemIds } from '../client'
import { openDatabase } from '../connection'
import { runMigrations } from '../migrate'
import { SqliteReferenceRepository, sortTree } from './reference'
import { SqliteSettingsRepository } from './settings'

const MIGRATIONS = path.resolve(__dirname, '../../../../resources/migrations')

function freshDb() {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  return { sqlite, db: createDb(sqlite) }
}

describe('SqliteSettingsRepository', () => {
  it('returns defaults, then stored values', () => {
    const { db, sqlite } = freshDb()
    const repo = new SqliteSettingsRepository(db, () => 1)
    expect(repo.getAll()).toEqual(SETTING_DEFAULTS)
    repo.set('pricing.multiplier', 4.5)
    repo.set('pricing.multiplier', 4)
    expect(repo.get('pricing.multiplier')).toBe(4)
    expect(repo.getAll()['pricing.vatRateBp']).toBe(2000)
    sqlite.close()
  })

  it('refuses invalid values', () => {
    const { db, sqlite } = freshDb()
    const repo = new SqliteSettingsRepository(db, () => 1)
    expect(() => {
      repo.set('pricing.vatRateBp', 20.5)
    }).toThrow()
    expect(() => {
      repo.set('pricing.multiplier', -1)
    }).toThrow()
    sqlite.close()
  })

  it('falls back to the default when a stored value is unreadable', () => {
    const { db, sqlite } = freshDb()
    sqlite
      .prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES ('pricing.menuRounding', '\"sideways\"', 1)",
      )
      .run()
    expect(new SqliteSettingsRepository(db, () => 1).get('pricing.menuRounding')).toBe('up')
    sqlite.close()
  })
})

describe('SqliteReferenceRepository', () => {
  it('hides deleted rows and sorts by sort order', () => {
    const { db, sqlite } = freshDb()
    const ids = systemIds(() => 10)
    for (const [name, order, deleted] of [
      ['Rocks', 2, null],
      ['Coupe', 1, null],
      ['Ancien', 0, 5],
    ] as const) {
      sqlite
        .prepare(
          'INSERT INTO glasses (id, created_at, updated_at, deleted_at, name, sort_order) VALUES (?, 1, 1, ?, ?, ?)',
        )
        .run(ids.newId(), deleted, name, order)
    }
    expect(new SqliteReferenceRepository(db).listGlasses().map((g) => g.name)).toEqual(['Coupe', 'Rocks'])
    sqlite.close()
  })
})

describe('sortTree', () => {
  it('lists each parent before its children, depth first', () => {
    const cat = (id: string, parentId: string | null, sortOrder: number) => ({
      id,
      name: id,
      slug: id,
      parentId,
      sortOrder,
      batchHint: 'ok' as const,
    })
    const rows = [
      cat('b', null, 2),
      cat('a2', 'a', 2),
      cat('a', null, 1),
      cat('a1', 'a', 1),
      cat('b1', 'b', 1),
    ]
    const sorted = [...rows].sort((x, y) => x.sortOrder - y.sortOrder)
    expect(sortTree(sorted).map((c) => c.id)).toEqual(['a', 'a1', 'a2', 'b', 'b1'])
  })

  it('keeps orphans at the end instead of dropping them', () => {
    const rows = [
      { id: 'x', name: 'x', slug: 'x', parentId: 'missing', sortOrder: 0, batchHint: 'ok' as const },
    ]
    expect(sortTree(rows)).toHaveLength(1)
  })
})
