/**
 * First-launch assistant (section 10.15): shown on a new notebook only. A notebook that already
 * holds the user's own data (a version before the assistant existed) is marked as done.
 */
import type { Clock, Db } from '../db/client'
import { SqliteSettingsRepository } from '../db/repositories/settings'

export function settleOnboarding(db: Db, now: Clock, options: { skip?: boolean } = {}): void {
  const sqlite = db.$client
  if (sqlite.prepare("SELECT 1 FROM settings WHERE key = 'onboarding.done'").get()) return
  const used = sqlite
    .prepare(
      `SELECT EXISTS (SELECT 1 FROM recipes WHERE source = 'user')
           OR EXISTS (SELECT 1 FROM tasting_notes)
           OR EXISTS (SELECT 1 FROM notebook_entries)
           OR EXISTS (SELECT 1 FROM products)
           OR EXISTS (SELECT 1 FROM study_guides) AS used`,
    )
    .get() as { used: number }
  if (used.used === 1 || options.skip) new SqliteSettingsRepository(db, now).set('onboarding.done', true)
}
