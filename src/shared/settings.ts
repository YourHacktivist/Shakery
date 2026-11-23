import { z } from 'zod'
import { DEFAULT_DILUTION } from '../core/dilution'
import { DEFAULT_EQUIVALENCES } from '../core/units'
import { VERSION_PATTERN } from './domain/updates'
import { LABEL_FORMAT_VALUES, RECIPE_PAPERS } from './print'

/**
 * Application settings: one Zod schema and one default per key. Values are stored as JSON
 * in the `settings` table and validated on every read and write.
 *
 * Pricing defaults follow D-017 (coefficient 5, VAT 20 %, menu price rounded up to the
 * next 0.50 €). They are user-adjustable defaults, shown as such in the interface.
 */
const rate = z.number().min(0).max(1)

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
  /** Look for a newer release on GitHub at launch (D-051); false = no request at launch. */
  'updates.autoCheck': z.boolean(),
  /** Release the user chose to ignore: no window opens by itself for it. Written by the main only. */
  'updates.skippedVersion': z.string().regex(VERSION_PATTERN).nullable(),
  /** First-launch assistant done (section 10.15). */
  'onboarding.done': z.boolean(),
  /** Days before its best-before date when a preparation is flagged (section 10.9). */
  'preps.warningDays': z.number().int().min(0).max(60),
  /** Interface animations; the system « reduce motion » setting is always respected. */
  'appearance.animations': z.boolean(),
  /** Dark (the default) or warm light theme, title bar included (D-038). */
  'appearance.theme': z.enum(['dark', 'light']),
  /** Glass behind the floating elements (section 11). */
  'appearance.blur': z.enum(['full', 'light', 'none']),
  /** Neither blur, animation, backdrop nor shadow, for a modest PC. */
  'appearance.performance': z.boolean(),
  /** Millilitres of one ounce, dash, drop, bar spoon and teaspoon (section 8, D-026). */
  'units.equivalences': z
    .object({
      ozMl: z.number().min(25).max(35),
      dashMl: z.number().positive().max(5),
      dropMl: z.number().positive().max(1),
      barspoonMl: z.number().positive().max(20),
      tspMl: z.number().positive().max(20),
    })
    .strict(),
  /** Water added by the ice, as a fraction of the volume, per method (D-026). */
  'calc.dilution': z
    .object({
      shake: rate,
      dry_shake: rate,
      stir: rate,
      build: rate,
      throw: rate,
      swizzle: rate,
      blend: rate,
      other: rate,
    })
    .strict(),
  /** Steps of the dose arrows of the lab (section 8, « Atelier »). */
  'lab.stepMl': z.number().positive().max(30),
  'lab.stepOz': z.number().positive().max(2),
  /** What the print dialogs propose first. */
  'print.paper': z.enum(RECIPE_PAPERS),
  'print.indicators': z.boolean(),
  'print.labelFormat': z.enum(LABEL_FORMAT_VALUES),
  /** A backup at start-up when the last one is older than this (section 12.3). */
  'backup.frequencyHours': z.number().int().min(1).max(720),
  'backup.keepDaily': z.number().int().min(3).max(90),
  'backup.keepWeekly': z.number().int().min(0).max(52),
  /** What was deleted before this moment left the trash (D-043). Written by the main only. */
  'trash.emptiedAt': z.number().int().min(0),
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
  'updates.autoCheck': true,
  'updates.skippedVersion': null,
  'display.unit': 'ml',
  'onboarding.done': false,
  'preps.warningDays': 2,
  'appearance.animations': true,
  'appearance.theme': 'dark',
  'appearance.blur': 'full',
  'appearance.performance': false,
  'units.equivalences': DEFAULT_EQUIVALENCES,
  'calc.dilution': DEFAULT_DILUTION,
  'lab.stepMl': 2.5,
  'lab.stepOz': 0.25,
  'print.paper': 'a4',
  'print.indicators': true,
  'print.labelFormat': 'roll62x29',
  'backup.frequencyHours': 24,
  'backup.keepDaily': 14,
  'backup.keepWeekly': 8,
  'trash.emptiedAt': 0,
}

export const SETTING_KEYS = Object.keys(settingsSchemas) as SettingKey[]

/** Settings the renderer may change. The backup folder is only set through the folder dialog of the main. */
export const RENDERER_SETTING_KEYS = [
  'pricing.multiplier',
  'pricing.vatRateBp',
  'pricing.menuRoundingStepCents',
  'pricing.menuRounding',
  'off.enabled',
  'updates.autoCheck',
  'display.unit',
  'onboarding.done',
  'preps.warningDays',
  'appearance.animations',
  'appearance.theme',
  'appearance.blur',
  'appearance.performance',
  'units.equivalences',
  'calc.dilution',
  'lab.stepMl',
  'lab.stepOz',
  'print.paper',
  'print.indicators',
  'print.labelFormat',
  'backup.frequencyHours',
  'backup.keepDaily',
  'backup.keepWeekly',
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
