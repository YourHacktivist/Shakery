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
  /** Optional bottle lookup by barcode on Open Food Facts (section 9); false = no request. */
  'off.enabled': z.boolean(),
  /** Unit in which the doses in ml, cl or oz are shown (section 10.15); stored doses never change. */
  'display.unit': z.enum(['ml', 'cl', 'oz']),
  /** First-launch assistant done (section 10.15). */
  'onboarding.done': z.boolean(),
  /** Days before its best-before date when a preparation is flagged (section 10.9). */
  'preps.warningDays': z.number().int().min(0).max(60),
  /** Interface animations; the system « reduce motion » setting is always respected. */
  'appearance.animations': z.boolean(),
  /** Dark (the default) or warm light theme, title bar included (D-038). */
  'appearance.theme': z.enum(['dark', 'light']),
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
  'off.enabled': true,
  'display.unit': 'ml',
  'onboarding.done': false,
  'preps.warningDays': 2,
  'appearance.animations': true,
  'appearance.theme': 'dark',
}

export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[]

/** Settings the renderer may change. The backup folder is only set through the folder dialog of the main. */
export const RENDERER_SETTING_KEYS = [
  'pricing.multiplier',
  'pricing.vatRateBp',
  'pricing.menuRoundingStepCents',
  'pricing.menuRounding',
  'off.enabled',
  'display.unit',
  'onboarding.done',
  'preps.warningDays',
  'appearance.animations',
  'appearance.theme',
] as const satisfies readonly SettingKey[]

export type RendererSettingKey = (typeof RENDERER_SETTING_KEYS)[number]

/** One change of a renderer setting, validated with the schema of its key. */
export const settingChangeSchema = z.union(
  RENDERER_SETTING_KEYS.map((key) =>
    z.object({ key: z.literal(key), value: settingsSchemas[key] }).strict(),
  ) as unknown as [
    z.ZodObject<{ key: z.ZodLiteral<RendererSettingKey>; value: z.ZodType }>,
    z.ZodObject<{ key: z.ZodLiteral<RendererSettingKey>; value: z.ZodType }>,
  ],
)

export const settingsValuesSchema = z.object(settingsSchemas).strict()

export function isSettingKey(value: string): value is SettingKey {
  return Object.hasOwn(settingsSchemas, value)
}

export interface SettingsRepository {
  get<K extends SettingKey>(key: K): SettingValue<K>
  set<K extends SettingKey>(key: K, value: SettingValue<K>): void
  getAll(): Settings
}
