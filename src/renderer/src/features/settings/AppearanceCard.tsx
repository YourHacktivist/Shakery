import { ControlRow } from '@renderer/components/ControlRow'
import { Select } from '@renderer/components/Select'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Toggle } from '@renderer/components/Toggle'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { revealTheme, type Theme } from '@renderer/lib/appearance'
import { useSetSetting, useSetting } from '@renderer/lib/queries'

const WARNING_DAYS = [0, 1, 2, 3, 5, 7, 10, 14]

/**
 * Theme, glass effect, animations, unit of the doses and alert of the preparations (section
 * 10.14). The theme lives only here since it left the top bar (D-057).
 */
export function AppearanceCard() {
  const t = fr.settings.appearance
  const groups = fr.settings.groups
  const theme = useSetting('appearance.theme')
  const animations = useSetting('appearance.animations')
  const performance = useSetting('appearance.performance')
  const unit = useSetting('display.unit')
  const warningDays = useSetting('preps.warningDays')
  const change = useSetSetting()
  const save = (setting: Parameters<typeof change.mutate>[0]) => {
    change.mutate(setting, { onError: notifyError })
  }
  const days = [...new Set([...WARNING_DAYS, warningDays])].sort((a, b) => a - b)

  return (
    <SettingsBlock block="appearance" title={t.title} description={t.description}>
      <SettingsGroup title={groups.display}>
        <ControlRow label={t.theme}>
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
        </ControlRow>
        <ControlRow label={t.animations}>
          <Toggle
            label={t.animations}
            hideLabel
            showState
            checked={animations}
            onCheckedChange={(value) => {
              save({ key: 'appearance.animations', value })
            }}
          />
        </ControlRow>
        <ControlRow label={t.performance} hint={t.note}>
          <Toggle
            label={t.performance}
            hideLabel
            showState
            checked={performance}
            onCheckedChange={(value) => {
              save({ key: 'appearance.performance', value })
            }}
          />
        </ControlRow>
      </SettingsGroup>
      <SettingsGroup title={groups.reminders}>
        <ControlRow label={t.unit}>
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
        </ControlRow>
        <ControlRow label={t.warning} hint={t.warningHint}>
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
        </ControlRow>
      </SettingsGroup>
    </SettingsBlock>
  )
}
