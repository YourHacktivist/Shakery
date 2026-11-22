/** What the settings give to the calculations (sections 8 and 10.14), in one place for both sides. */
import type { DilutionRates } from '../core/dilution'
import type { UnitEquivalences } from '../core/units'
import type { SettingKey, Settings } from './settings'

export const CALCULATION_KEYS = [
  'units.equivalences',
  'calc.dilution',
] as const satisfies readonly SettingKey[]

export type CalculationSettings = {
  readonly equivalences: UnitEquivalences
  readonly dilution: DilutionRates
}

export function calculationFrom(
  values: Pick<Settings, (typeof CALCULATION_KEYS)[number]>,
): CalculationSettings {
  return { equivalences: values['units.equivalences'], dilution: values['calc.dilution'] }
}
