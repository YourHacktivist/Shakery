import { ControlRow } from '@renderer/components/ControlRow'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { Toggle } from '@renderer/components/Toggle'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useSetSetting, useSetting } from '@renderer/lib/queries'
import { LABEL_FORMAT_VALUES, type RecipePaper } from '@shared/print'

const t = fr.settings.print

/** What the print dialogs propose first (section 10.14). */
export function PrintCard() {
  const paper = useSetting('print.paper')
  const indicators = useSetting('print.indicators')
  const format = useSetting('print.labelFormat')
  const { mutate } = useSetSetting()
  const save = (change: Parameters<typeof mutate>[0]) => {
    mutate(change, { onError: notifyError })
  }

  return (
    <SettingsBlock block="print" title={t.title} description={t.description}>
      <SettingsGroup>
        <ControlRow label={t.paper}>
          <SegmentedControl<RecipePaper>
            label={t.paper}
            value={paper}
            onChange={(value) => {
              save({ key: 'print.paper', value })
            }}
            options={[
              { value: 'a4', label: fr.recipes.sheet.papers.a4 },
              { value: 'a5', label: fr.recipes.sheet.papers.a5 },
            ]}
          />
        </ControlRow>
        <ControlRow label={t.indicators}>
          <Toggle
            label={t.indicators}
            hideLabel
            showState
            checked={indicators}
            onCheckedChange={(value) => {
              save({ key: 'print.indicators', value })
            }}
          />
        </ControlRow>
        <ControlRow label={t.label}>
          <Select
            label={t.label}
            hideLabel
            className="w-56"
            value={format}
            options={LABEL_FORMAT_VALUES.map((value) => ({
              value,
              label: fr.workshop.preps.label.formats[value],
            }))}
            onChange={(event) => {
              const next = LABEL_FORMAT_VALUES.find((value) => value === event.target.value)
              if (next) save({ key: 'print.labelFormat', value: next })
            }}
          />
        </ControlRow>
      </SettingsGroup>
    </SettingsBlock>
  )
}
