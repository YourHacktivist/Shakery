import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { Toggle } from '@renderer/components/Toggle'
import { SettingCard, SettingRow } from '@renderer/features/settings/SettingCard'
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
    <SettingCard eyebrow={t.eyebrow} title={t.title} description={t.description}>
      <SettingRow label={t.paper}>
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
      </SettingRow>
      <SettingRow label={t.indicators}>
        <Toggle
          label={t.indicators}
          hideLabel
          showState
          checked={indicators}
          onCheckedChange={(value) => {
            save({ key: 'print.indicators', value })
          }}
        />
      </SettingRow>
      <Select
        label={t.label}
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
    </SettingCard>
  )
}
