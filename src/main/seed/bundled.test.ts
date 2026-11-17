import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { SqliteReferenceRepository } from '../db/repositories/reference'
import { BUNDLED_SEED } from './bundled'
import { loadSeedData, validateSeedData } from './load'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')

describe('bundled seed data', () => {
  it('passes validation: unique keys and slugs, known parents, no cycle, nothing left to review', () => {
    const checked = validateSeedData(BUNDLED_SEED)
    expect(checked.categories.length).toBeGreaterThanOrEqual(50)
    expect(checked.categories.length).toBeLessThanOrEqual(100)
  })

  it('keeps the tree within three levels', () => {
    const parentOf = new Map(BUNDLED_SEED.categories.map((c) => [c.seed_key, c.parent]))
    for (const category of BUNDLED_SEED.categories) {
      let depth = 1
      let parent = category.parent
      while (parent) {
        depth += 1
        parent = parentOf.get(parent) ?? null
      }
      expect(depth, category.seed_key).toBeLessThanOrEqual(3)
    }
  })

  it('invents no glass capacity', () => {
    for (const glass of BUNDLED_SEED.glasses) expect(glass.capacity_ml, glass.seed_key).toBeNull()
  })

  it('loads into an empty notebook, then adds nothing the second time', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    const db = createDb(sqlite)
    const ids = {
      now: () => 1,
      newId: createUuidV7Generator(
        () => 1,
        (b) => b.fill(1),
      ),
    }
    const first = loadSeedData(db, ids, BUNDLED_SEED)
    expect(first).toEqual({
      categories: BUNDLED_SEED.categories.length,
      glasses: BUNDLED_SEED.glasses.length,
      ice: BUNDLED_SEED.ice.length,
    })
    expect(loadSeedData(db, ids, BUNDLED_SEED)).toEqual({ categories: 0, glasses: 0, ice: 0 })
    const tree = new SqliteReferenceRepository(db).listCategories()
    expect(tree).toHaveLength(BUNDLED_SEED.categories.length)
    sqlite.close()
  })

  it('gives a free slug to a new entry whose slug a user category already holds', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    const db = createDb(sqlite)
    const ids = {
      now: () => 1,
      newId: createUuidV7Generator(
        () => 1,
        (b) => b.fill(2),
      ),
    }
    sqlite
      .prepare(
        "INSERT INTO categories (id, created_at, updated_at, name, slug) VALUES ('mine', 1, 1, 'Spiritueux perso', 'spiritueux')",
      )
      .run()
    loadSeedData(db, ids, BUNDLED_SEED)
    const slugs = new SqliteReferenceRepository(db).listCategories().map((c) => c.slug)
    expect(slugs).toContain('spiritueux')
    expect(slugs).toContain('spiritueux-2')
    sqlite.close()
  })

  it('gives every parent a batch hint at least as strict as its children', () => {
    const rank = { ok: 0, add_at_service: 1, fresh: 2 } as const
    for (const parent of BUNDLED_SEED.categories) {
      for (const child of BUNDLED_SEED.categories.filter((c) => c.parent === parent.seed_key)) {
        expect(rank[parent.batch_hint], `${parent.seed_key} > ${child.seed_key}`).toBeGreaterThanOrEqual(
          rank[child.batch_hint],
        )
      }
    }
  })
})
