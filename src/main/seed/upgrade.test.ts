import path from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb, type Ids } from '../db/client'
import { openDatabase } from '../db/connection'
import { MIGRATIONS_TABLE, runMigrations } from '../db/migrate'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from './bundled'
import { loadSeedData, type SeedData } from './load'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
const ALL = withClassics(BUNDLED_SEED, path.resolve(__dirname, '../../../resources/seed', CLASSICS_FILE))
const PREFIX = 'classic.'
const EXTRA = ALL.recipes.filter((recipe) => recipe.seed_key.startsWith(PREFIX)).slice(0, 25)

/** The seed of a version before D-054: the same classics under their former key. */
const FORMER: SeedData = {
  ...BUNDLED_SEED,
  recipes: [
    ...BUNDLED_SEED.recipes,
    ...EXTRA.map((recipe) => ({ ...recipe, seed_key: `c24.${recipe.seed_key.slice(PREFIX.length)}` })),
  ],
}
const CURRENT: SeedData = { ...BUNDLED_SEED, recipes: [...BUNDLED_SEED.recipes, ...EXTRA] }
const FIRST = EXTRA[0]?.seed_key ?? ''

describe('a notebook made before D-054', () => {
  it('keeps its extra classics after the update: renamed, none created twice, a deleted one stays deleted', () => {
    let clock = 5_000
    const ids: Ids = {
      now: () => (clock += 1),
      newId: createUuidV7Generator(
        () => clock,
        (b) => b.fill(3),
      ),
    }
    const sqlite = openDatabase(':memory:')
    // The schema as it was before migration 0003, applied the way Drizzle records it.
    sqlite.exec(
      `CREATE TABLE ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`,
    )
    const files = readMigrationFiles({ migrationsFolder: MIGRATIONS })
    const last = files.at(-1)?.folderMillis ?? 0
    for (const file of files.filter((entry) => entry.folderMillis < last)) {
      for (const statement of file.sql) if (statement.trim()) sqlite.exec(statement)
      sqlite
        .prepare(`INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`)
        .run(file.hash, file.folderMillis)
    }
    const db = createDb(sqlite)
    loadSeedData(db, ids, FORMER)
    const count = () => (sqlite.prepare('SELECT count(*) AS n FROM recipes').get() as { n: number }).n
    const before = count()
    const deleted = `c24.${FIRST.slice(PREFIX.length)}`
    sqlite.prepare('UPDATE recipes SET deleted_at = 1 WHERE seed_key = ?').run(deleted)

    runMigrations(sqlite, MIGRATIONS)
    const report = loadSeedData(db, ids, CURRENT)

    expect(FIRST).not.toBe('')
    expect(report.recipes).toBe(0)
    expect(count()).toBe(before)
    const former = sqlite.prepare("SELECT count(*) AS n FROM recipes WHERE seed_key LIKE 'c24.%'").get() as {
      n: number
    }
    expect(former.n).toBe(0)
    const first = sqlite.prepare('SELECT deleted_at AS gone FROM recipes WHERE seed_key = ?').get(FIRST) as {
      gone: number | null
    }
    expect(first.gone).toBe(1)
    sqlite.close()
  })
})
