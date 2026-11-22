import path from 'node:path'
import { expect, it } from 'vitest'
import { createDb } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { SqliteSettingsRepository } from '../db/repositories/settings'
import { settleOnboarding } from './onboarding'

function notebook() {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, path.resolve(__dirname, '../../../resources/migrations'))
  const db = createDb(sqlite)
  return { sqlite, db, settings: new SqliteSettingsRepository(db, () => 1) }
}

it('shows the assistant on a new notebook only', () => {
  const fresh = notebook()
  settleOnboarding(fresh.db, () => 1)
  expect(fresh.settings.get('onboarding.done')).toBe(false)
  fresh.sqlite.close()

  const used = notebook()
  used.sqlite
    .prepare(
      "INSERT INTO notebook_entries (id, created_at, updated_at, title) VALUES ('e', 1, 1, 'Une note')",
    )
    .run()
  settleOnboarding(used.db, () => 1)
  expect(used.settings.get('onboarding.done')).toBe(true)
  used.sqlite.close()
})
