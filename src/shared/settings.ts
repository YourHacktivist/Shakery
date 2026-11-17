import { z } from 'zod'

/**
 * Application settings: one Zod schema and one default per key. Values are stored as JSON
 * in the `settings` table and validated on every read and write.
 *
 * Pricing defaults follow D-017 (coefficient 5, VAT 20 %, menu price rounded up to the
 * next 0.50 €). They are user-adjustable defaults, shown as such in the interface.
 */
export const settingsSchemas = {
  /** Backup folder chosen by the user; null means `userData/backups`. */
  'backup.directory': z.string().min(1).max(1024).nullable(),
  'pricing.multiplier': z.number().positive().max(100),
  'pricing.vatRateBp': z.number().int().min(0).max(10_000),
  'pricing.menuRoundingStepCents': z.number().int().positive().max(100_000),
  'pricing.menuRounding': z.enum(['up', 'nearest']),
} as const

export type SettingKey = keyof typeof settingsSchemas
export type SettingValue<K extends SettingKey> = z.output<(typeof settingsSchemas)[K]>
export type Settings = { readonly [K in SettingKey]: SettingValue<K> }

export const SETTING_DEFAULTS: Settings = {
  'backup.directory': null,
  'pricing.multiplier': 5,
  'pricing.vatRateBp': 2000,
  'pricing.menuRoundingStepCents': 50,
  'pricing.menuRounding': 'up',
}

export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[]

export function isSettingKey(value: string): value is SettingKey {
  return Object.hasOwn(settingsSchemas, value)
}

export interface SettingsRepository {
  get<K extends SettingKey>(key: K): SettingValue<K>
  set<K extends SettingKey>(key: K, value: SettingValue<K>): void
  getAll(): Settings
}
