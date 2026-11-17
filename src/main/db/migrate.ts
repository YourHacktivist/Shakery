import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { tableExists, type Sqlite } from './connection'

/** Drizzle's bookkeeping table for applied migrations. */
export const MIGRATIONS_TABLE = '__drizzle_migrations'

/** Migrations of `folder` not yet applied to the database. */
export function pendingMigrationCount(sqlite: Sqlite, folder: string): number {
  const files = readMigrationFiles({ migrationsFolder: folder })
  if (!tableExists(sqlite, MIGRATIONS_TABLE)) return files.length
  const row = sqlite.prepare(`SELECT max(created_at) AS last FROM ${MIGRATIONS_TABLE}`).get() as {
    last: number | null
  }
  const last = row.last ?? 0
  return files.filter((file) => file.folderMillis > last).length
}

/** True once at least one migration ran: the file holds a notebook, not an empty new database. */
export function hasSchema(sqlite: Sqlite): boolean {
  return tableExists(sqlite, MIGRATIONS_TABLE)
}

/**
 * Applies the pending migrations in one transaction (Drizzle wraps them). Foreign keys are
 * switched off during the migration, as SQLite requires to rebuild tables, then checked.
 */
export function runMigrations(sqlite: Sqlite, folder: string): void {
  sqlite.pragma('foreign_keys = OFF')
  try {
    migrate(drizzle(sqlite), { migrationsFolder: folder })
    const violations = sqlite.pragma('foreign_key_check') as unknown[]
    if (violations.length > 0) {
      throw new Error(`Migration left ${violations.length} foreign key violation(s)`)
    }
  } finally {
    sqlite.pragma('foreign_keys = ON')
  }
}
