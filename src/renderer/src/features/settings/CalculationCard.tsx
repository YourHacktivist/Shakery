import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_DILUTION } from '@core/dilution'
import { DEFAULT_EQUIVALENCES, EXACT_OZ_ML, type UnitEquivalences } from '@core/units'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { SettingsBlock, SettingsFields, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { formatNumber } from '@renderer/lib/format'
import { useSetSetting, useSetting } from '@renderer/lib/queries'
import { METHOD_VALUES } from '@shared/domain/catalog'
import { SETTING_DEFAULTS } from '@shared/settings'

const t = fr.settings.calculation
const SAVE_AFTER_MS = 500
const STEPS_ML = [1, 2, 2.5, 5, 10]
const STEPS_OZ = [0.125, 0.25, 0.5]
/** Rounding of the advised price, in cents. */
const PRICE_STEPS = [10, 50, 100]

type SmallMeasure = Exclude<keyof UnitEquivalences, 'ozMl'>
const SMALL_MEASURES = [
  { key: 'dashMl', max: 5, step: 0.05 },
  { key: 'dropMl', max: 1, step: 0.01 },
  { key: 'barspoonMl', max: 20, step: 0.5 },
  { key: 'tspMl', max: 20, step: 0.5 },
] as const satisfies ReadonlyArray<{ key: SmallMeasure; max: number; step: number }>

/**
 * A number saved a moment after the last key, not at each one: every save recalculates the
 * notebook. A value waiting when the screen closes is saved too.
 */
function SettingNumber({
  label,
  unit,
  saved,
  min,
  max,
  step,
  decimals,
  onSave,
}: {
  label: string
  unit: string
  saved: number
  min: number
  max: number
  step: number
  decimals: number
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState<number | null>(saved)
  const [known, setKnown] = useState(saved)
  // Changed elsewhere (« Valeurs d'origine »): the field follows.
  if (known !== saved) {
    setKnown(saved)
    setValue(saved)
  }
  const waiting = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (value === null || value === saved || value < min || value > max) {
      waiting.current = null
      return
    }
    waiting.current = () => {
      onSave(value)
    }
    const timer = window.setTimeout(() => {
      waiting.current?.()
      waiting.current = null
    }, SAVE_AFTER_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [value, saved, min, max, onSave])
  useEffect(
    () => () => {
      waiting.current?.()
    },
    [],
  )

  return (
    <NumberWithUnit
      label={label}
      unit={unit}
      value={value}
      onChange={setValue}
      min={min}
      max={max}
      step={step}
      decimals={decimals}
    />
  )
}

/** Equivalences, dilution per method, steps of the lab and advised price (sections 8 and 10.14). */
export function CalculationCard() {
  const equivalences = useSetting('units.equivalences')
  const dilution = useSetting('calc.dilution')
  const stepMl = useSetting('lab.stepMl')
  const stepOz = useSetting('lab.stepOz')
  const multiplier = useSetting('pricing.multiplier')
  const vatRateBp = useSetting('pricing.vatRateBp')
  const priceStep = useSetting('pricing.menuRoundingStepCents')
  const rounding = useSetting('pricing.menuRounding')
  const { mutate } = useSetSetting()
  const save = (change: Parameters<typeof mutate>[0]) => {
    mutate(change, { onError: notifyError })
  }

  return (
    <SettingsBlock block="calculation" title={t.title} description={t.description}>
      <SettingsGroup title={fr.settings.groups.equivalences}>
        <ControlRow label={t.ounce}>
          <SegmentedControl<'bar' | 'exact'>
            label={t.ounce}
            value={equivalences.ozMl === DEFAULT_EQUIVALENCES.ozMl ? 'bar' : 'exact'}
            onChange={(choice) => {
              const ozMl = choice === 'bar' ? DEFAULT_EQUIVALENCES.ozMl : EXACT_OZ_ML
              save({ key: 'units.equivalences', value: { ...equivalences, ozMl } })
            }}
            options={[
              { value: 'bar', label: t.ounces.bar },
              { value: 'exact', label: t.ounces.exact },
            ]}
          />
        </ControlRow>
        <SettingsFields>
          {SMALL_MEASURES.map(({ key, max, step }) => (
            <SettingNumber
              key={key}
              label={t.measures[key]}
              unit="ml"
              saved={equivalences[key]}
              min={0.01}
              max={max}
              step={step}
              decimals={2}
              onSave={(value) => {
                save({ key: 'units.equivalences', value: { ...equivalences, [key]: value } })
              }}
            />
          ))}
        </SettingsFields>
      </SettingsGroup>

      <SettingsGroup title={t.dilution} note={t.dilutionHint}>
        <SettingsFields>
          {METHOD_VALUES.map((method) => (
            <SettingNumber
              key={method}
              label={fr.recipes.methods[method]}
              unit="%"
              saved={Math.round(dilution[method] * 1000) / 10}
              min={0}
              max={100}
              step={1}
              decimals={1}
              onSave={(value) => {
                save({ key: 'calc.dilution', value: { ...dilution, [method]: value / 100 } })
              }}
            />
          ))}
        </SettingsFields>
      </SettingsGroup>

      <SettingsGroup title={t.steps}>
        <SettingsFields>
          <Select
            label={t.stepMl}
            value={String(stepMl)}
            options={[...new Set([...STEPS_ML, stepMl])].map((value) => ({
              value: String(value),
              label: t.inMl(formatNumber(value)),
            }))}
            onChange={(event) => {
              save({ key: 'lab.stepMl', value: Number(event.target.value) })
            }}
          />
          <Select
            label={t.stepOz}
            value={String(stepOz)}
            options={[...new Set([...STEPS_OZ, stepOz])].map((value) => ({
              value: String(value),
              label: t.inOz(value),
            }))}
            onChange={(event) => {
              save({ key: 'lab.stepOz', value: Number(event.target.value) })
            }}
          />
        </SettingsFields>
      </SettingsGroup>

      <SettingsGroup title={t.pricing} note={t.pricingHint}>
        <SettingsFields>
          <SettingNumber
            label={t.multiplier}
            unit="×"
            saved={multiplier}
            min={1}
            max={20}
            step={0.5}
            decimals={1}
            onSave={(value) => {
              save({ key: 'pricing.multiplier', value })
            }}
          />
          <SettingNumber
            label={t.vat}
            unit="%"
            saved={vatRateBp / 100}
            min={0}
            max={100}
            step={0.5}
            decimals={1}
            onSave={(value) => {
              save({ key: 'pricing.vatRateBp', value: Math.round(value * 100) })
            }}
          />
          <Select
            label={t.step}
            value={String(priceStep)}
            options={[...new Set([...PRICE_STEPS, priceStep])]
              .sort((x, y) => x - y)
              .map((value) => ({ value: String(value), label: `${formatNumber(value / 100, 2)} €` }))}
            onChange={(event) => {
              save({ key: 'pricing.menuRoundingStepCents', value: Number(event.target.value) })
            }}
          />
        </SettingsFields>
        <ControlRow label={t.rounding}>
          <SegmentedControl<'up' | 'nearest'>
            label={t.rounding}
            value={rounding}
            onChange={(value) => {
              save({ key: 'pricing.menuRounding', value })
            }}
            options={[
              { value: 'up', label: t.roundings.up },
              { value: 'nearest', label: t.roundings.nearest },
            ]}
          />
        </ControlRow>
      </SettingsGroup>

      <div className="flex border-t border-border pt-2.5 pb-2">
        <Button
          variant="ghost"
          className="-ml-2.5"
          icon={<RotateCcw size={16} aria-hidden="true" />}
          onClick={() => {
            save({ key: 'units.equivalences', value: DEFAULT_EQUIVALENCES })
            save({ key: 'calc.dilution', value: DEFAULT_DILUTION })
            save({ key: 'pricing.multiplier', value: SETTING_DEFAULTS['pricing.multiplier'] })
            save({ key: 'pricing.vatRateBp', value: SETTING_DEFAULTS['pricing.vatRateBp'] })
            save({
              key: 'pricing.menuRoundingStepCents',
              value: SETTING_DEFAULTS['pricing.menuRoundingStepCents'],
            })
            save({ key: 'pricing.menuRounding', value: SETTING_DEFAULTS['pricing.menuRounding'] })
          }}
        >
          {t.reset}
        </Button>
      </div>
    </SettingsBlock>
  )
}
