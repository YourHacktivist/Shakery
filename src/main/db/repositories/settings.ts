import { eq } from 'drizzle-orm'
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  settingsSchemas,
  type SettingKey,
  type Settings,
  type SettingsRepository,
  type SettingValue,
} from '../../../shared/settings'
import type { Clock, Db } from '../client'
import { settings } from '../schema'

/**
 * Settings stored as JSON, validated on read and write. A stored value that no longer
 * matches its schema (older version, hand edit) falls back to the default instead of
 * breaking the application.
 */
export class SqliteSettingsRepository implements SettingsRepository {
  constructor(
    private readonly db: Db,
    private readonly now: Clock,
  ) {}

  get<K extends SettingKey>(key: K): SettingValue<K> {
    const row = this.db.select().from(settings).where(eq(settings.key, key)).get()
    if (!row) return SETTING_DEFAULTS[key]
    const parsed = settingsSchemas[key].safeParse(row.value)
    return parsed.success ? (parsed.data as SettingValue<K>) : SETTING_DEFAULTS[key]
  }

  set<K extends SettingKey>(key: K, value: SettingValue<K>): void {
    const checked = settingsSchemas[key].parse(value)
    if (checked === null) {
      // The column refuses NULL: « none » is the absence of the row, read back as the default,
      // null for every key that accepts it (the backup folder).
      this.db.delete(settings).where(eq(settings.key, key)).run()
      return
    }
    const updatedAt = this.now()
    this.db
      .insert(settings)
      .values({ key, value: checked, updatedAt })
      .onConflictDoUpdate({ target: settings.key, set: { value: checked, updatedAt } })
      .run()
  }

  getAll(): Settings {
    const entries = SETTING_KEYS.map((key) => [key, this.get(key)] as const)
    return Object.fromEntries(entries) as Settings
  }
}
