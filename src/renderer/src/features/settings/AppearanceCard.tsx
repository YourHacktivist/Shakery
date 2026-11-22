import { Select } from '@renderer/components/Select'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Toggle } from '@renderer/components/Toggle'
import { SettingCard, SettingRow } from '@renderer/features/settings/SettingCard'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { revealTheme, type Theme } from '@renderer/lib/appearance'
import { useSetSetting, useSetting } from '@renderer/lib/queries'

const WARNING_DAYS = [0, 1, 2, 3, 5, 7, 10, 14]

/** Theme, unit of the doses, animations, alert of the preparations (section 10.14). */
export function AppearanceCard() {
  const t = fr.settings.appearance
  const theme = useSetting('appearance.theme')
  const animations = useSetting('appearance.animations')
  const unit = useSetting('display.unit')
  const warningDays = useSetting('preps.warningDays')
  const change = useSetSetting()
  const save = (setting: Parameters<typeof change.mutate>[0]) => {
    change.mutate(setting, { onError: notifyError })
  }
  const days = [...new Set([...WARNING_DAYS, warningDays])].sort((a, b) => a - b)

  return (
    <SettingCard eyebrow={t.eyebrow} title={t.title}>
      <SettingRow label={t.theme}>
        <SegmentedControl<Theme>
          label={t.theme}
          value={theme}
          onChange={(value) => {
            revealTheme(value, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
            save({ key: 'appearance.theme', value })
          }}
          options={[
            { value: 'dark', label: t.themes.dark },
            { value: 'light', label: t.themes.light },
          ]}
        />
      </SettingRow>
      <SettingRow label={t.unit}>
        <SegmentedControl<'ml' | 'cl' | 'oz'>
          label={t.unit}
          value={unit}
          onChange={(value) => {
            save({ key: 'display.unit', value })
          }}
          options={[
            { value: 'ml', label: t.units.ml },
            { value: 'cl', label: t.units.cl },
            { value: 'oz', label: t.units.oz },
          ]}
        />
      </SettingRow>
      <SettingRow label={t.warning}>
        <Select
          label={t.warning}
          hideLabel
          className="w-44"
          value={String(warningDays)}
          options={days.map((value) => ({ value: String(value), label: t.days(value) }))}
          onChange={(event) => {
            save({ key: 'preps.warningDays', value: Number(event.target.value) })
          }}
        />
      </SettingRow>
      <SettingRow label={t.animations}>
        <Toggle
          label={t.animations}
          hideLabel
          showState
          checked={animations}
          onCheckedChange={(value) => {
            save({ key: 'appearance.animations', value })
          }}
        />
      </SettingRow>
      <p className="m-0 text-small text-fg-muted">{t.note}</p>
    </SettingCard>
  )
}
