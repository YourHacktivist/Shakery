import { useMutation } from '@tanstack/react-query'
import { FileDown, Sheet } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { toast } from '@renderer/components/Toast'
import { ImportRow } from '@renderer/features/settings/ImportCard'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

type Table = 'recipes' | 'journal' | 'ingredients'

/**
 * Export and import of a whole notebook, then the CSV tables (section 12.4): the notebook moves
 * from one computer to another, or goes into a spreadsheet.
 */
export function TransferBlock() {
  const t = fr.settings.export
  const full = useMutation({
    mutationFn: () => unwrap(window.shakery.export.notebook({ kind: 'full' })),
    onSuccess: (result) => {
      if (result.saved) toast.show({ message: t.done })
    },
    onError: notifyError,
  })
  const csv = useMutation({
    mutationFn: (table: Table) => unwrap(window.shakery.export.csv({ table })),
    onSuccess: (result) => {
      if (result.saved) toast.show({ message: t.csvDone })
    },
    onError: notifyError,
  })
  const busy = full.isPending || csv.isPending

  return (
    <SettingsBlock
      block="transfer"
      title={fr.settings.transfer.title}
      description={fr.settings.transfer.description}
    >
      <SettingsGroup title={fr.settings.groups.whole}>
        <ControlRow label={t.title} hint={t.description}>
          <Button
            variant="outline"
            icon={<FileDown size={16} aria-hidden="true" />}
            disabled={busy}
            onClick={() => {
              full.mutate()
            }}
          >
            {full.isPending ? t.running : t.full}
          </Button>
        </ControlRow>
        <ImportRow />
      </SettingsGroup>
      <SettingsGroup title={t.csvTitle}>
        <ControlRow label={t.csvLabel} hint={t.csvDescription}>
          {(['recipes', 'journal', 'ingredients'] as const).map((table) => (
            <Button
              key={table}
              variant="outline"
              icon={<Sheet size={16} aria-hidden="true" />}
              disabled={busy}
              onClick={() => {
                csv.mutate(table)
              }}
            >
              {t.csv[table]}
            </Button>
          ))}
        </ControlRow>
      </SettingsGroup>
    </SettingsBlock>
  )
}
