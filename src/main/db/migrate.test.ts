import { readMigrationFiles } from 'drizzle-orm/migrator'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { openDatabase, quickCheck, type Sqlite } from './connection'
import { hasSchema, MIGRATIONS_TABLE, pendingMigrationCount, runMigrations } from './migrate'

const FOLDER = path.resolve(__dirname, '../../../resources/migrations')

const EXPECTED_TABLES = [
  // section 7
  'categories',
  'collection_items',
  'collections',
  'glasses',
  'ice_types',
  'ingredient_aliases',
  'ingredients',
  'notebook_entries',
  'notebook_links',
  'off_cache',
  'practice_sessions',
  'prep_batches',
  'products',
  'recent_views',
  'recipe_history',
  'recipe_lines',
  'recipes',
  'settings',
  'tasting_notes',
  // D-016
  'guide_sources',
  'knowledge_items',
  'knowledge_links',
  'knowledge_sections',
  'knowledge_sheets',
  'practice_answers',
  'reference_spec_lines',
  'reference_specs',
  'source_citations',
  'study_guides',
  'study_table_rows',
  'study_tables',
].sort()

function schemaOf(sqlite: Sqlite): Array<{ type: string; name: string; sql: string | null }> {
  return sqlite
    .prepare(
      `SELECT type, name, sql FROM sqlite_master
       WHERE name NOT LIKE 'sqlite_%' AND name <> '${MIGRATIONS_TABLE}'
       ORDER BY type, name`,
    )
    .all() as Array<{ type: string; name: string; sql: string | null }>
}

function memory(): Sqlite {
  return openDatabase(':memory:')
}

describe('migrations', () => {
  it('create the whole schema from an empty database', () => {
    const db = memory()
    expect(hasSchema(db)).toBe(false)
    expect(pendingMigrationCount(db, FOLDER)).toBeGreaterThan(0)
    runMigrations(db, FOLDER)

    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'search_index%' AND name <> ?",
        )
        .all(MIGRATIONS_TABLE) as Array<{ name: string }>
    ).map((r) => r.name)
    expect(tables.sort()).toEqual(EXPECTED_TABLES)
    expect(hasSchema(db)).toBe(true)
    expect(pendingMigrationCount(db, FOLDER)).toBe(0)
    expect(quickCheck(db).ok).toBe(true)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.close()
  })

  it('create a trigram FTS5 search table', () => {
    const db = memory()
    runMigrations(db, FOLDER)
    db.prepare(
      "INSERT INTO search_index (entity_type, entity_id, title, aliases, body) VALUES ('recipe', 'r1', 'negroni', '', 'gin vermouth campari')",
    ).run()
    const hit = db.prepare('SELECT entity_id FROM search_index WHERE search_index MATCH ?').get('"groni"')
    expect(hit).toEqual({ entity_id: 'r1' })
    db.close()
  })

  it('are idempotent', () => {
    const db = memory()
    runMigrations(db, FOLDER)
    const before = schemaOf(db)
    runMigrations(db, FOLDER)
    expect(schemaOf(db)).toEqual(before)
    db.close()
  })

  it('replay from every previous schema version to the same result', () => {
    const reference = memory()
    runMigrations(reference, FOLDER)
    const expected = schemaOf(reference)
    reference.close()

    const files = readMigrationFiles({ migrationsFolder: FOLDER })
    for (let applied = 1; applied < files.length; applied += 1) {
      const db = memory()
      // Bring the database to version `applied` exactly as Drizzle would have.
      db.exec(
        `CREATE TABLE ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`,
      )
      for (const file of files.slice(0, applied)) {
        for (const statement of file.sql) if (statement.trim()) db.exec(statement)
        db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`).run(
          file.hash,
          file.folderMillis,
        )
      }
      expect(pendingMigrationCount(db, FOLDER)).toBe(files.length - applied)
      runMigrations(db, FOLDER)
      expect(schemaOf(db)).toEqual(expected)
      db.close()
    }
  })

  it('give the extra classics of an older notebook their new seed key, deleted ones included', () => {
    const files = readMigrationFiles({ migrationsFolder: FOLDER })
    const before = files.length - 1
    const db = memory()
    db.exec(
      `CREATE TABLE ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`,
    )
    for (const file of files.slice(0, before)) {
      for (const statement of file.sql) if (statement.trim()) db.exec(statement)
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`).run(
        file.hash,
        file.folderMillis,
      )
    }
    const insert = db.prepare(
      'INSERT INTO recipes (id, created_at, updated_at, deleted_at, name, name_normalized, seed_key) VALUES (?, 1, 1, ?, ?, ?, ?)',
    )
    insert.run('a', null, 'Boulevardier', 'boulevardier', 'c24.boulevardier')
    insert.run('b', 5, 'Bijou', 'bijou', 'c24.bijou')
    insert.run('c', null, 'Negroni', 'negroni', 'iba.negroni')
    insert.run('d', null, 'Mien', 'mien', null)
    runMigrations(db, FOLDER)
    const keys = db.prepare('SELECT id, seed_key AS key FROM recipes ORDER BY id').all()
    expect(keys).toEqual([
      { id: 'a', key: 'classic.boulevardier' },
      { id: 'b', key: 'classic.bijou' },
      { id: 'c', key: 'iba.negroni' },
      { id: 'd', key: null },
    ])
    db.close()
  })

  it('enforce the integrity rules of the schema', () => {
    const db = memory()
    runMigrations(db, FOLDER)
    const now = Date.now()
    db.prepare(
      "INSERT INTO categories (id, created_at, updated_at, name, slug) VALUES ('c1', ?, ?, 'Gin', 'gin')",
    ).run(now, now)
    // A collection item targets exactly one of recipe or sheet.
    db.prepare("INSERT INTO collections (id, created_at, updated_at, name) VALUES ('col', ?, ?, 'MAF')").run(
      now,
      now,
    )
    expect(() =>
      db
        .prepare(
          "INSERT INTO collection_items (id, created_at, updated_at, collection_id) VALUES ('ci', ?, ?, 'col')",
        )
        .run(now, now),
    ).toThrow(/CHECK constraint failed/)
    // Unknown enumeration values are refused.
    expect(() =>
      db
        .prepare(
          "INSERT INTO recipes (id, created_at, updated_at, name, name_normalized, status) VALUES ('r', ?, ?, 'X', 'x', 'published')",
        )
        .run(now, now),
    ).toThrow(/CHECK constraint failed/)
    // A product with a purchase price states whether it is HT or TTC.
    db.prepare(
      "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id) VALUES ('i1', ?, ?, 'Gin', 'gin', 'c1')",
    ).run(now, now)
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (id, created_at, updated_at, ingredient_id, name, purchase_price_cents) VALUES ('p1', ?, ?, 'i1', 'Beefeater', 1600)",
        )
        .run(now, now),
    ).toThrow(/CHECK constraint failed/)
    // Foreign keys are enforced.
    expect(() =>
      db
        .prepare(
          "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id) VALUES ('i2', ?, ?, 'X', 'x', 'missing')",
        )
        .run(now, now),
    ).toThrow(/FOREIGN KEY constraint failed/)
    // Two live ingredients cannot share a normalized name in one category, a deleted one can.
    expect(() =>
      db
        .prepare(
          "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id) VALUES ('i3', ?, ?, 'GIN', 'gin', 'c1')",
        )
        .run(now, now),
    ).toThrow(/UNIQUE constraint failed/)
    db.prepare("UPDATE ingredients SET deleted_at = ? WHERE id = 'i1'").run(now)
    db.prepare(
      "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id) VALUES ('i3', ?, ?, 'GIN', 'gin', 'c1')",
    ).run(now, now)
    db.close()
  })
})
