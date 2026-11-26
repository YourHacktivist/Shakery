import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { toast } from '@renderer/components/Toast'
import { errorMessage } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { ShakeryError, unwrap } from '@renderer/lib/ipc'
import type { IpcOutput } from '@shared/ipc/contract'

type Preview = NonNullable<IpcOutput<'import.choose'>>
type Strategy = 'ignore' | 'replace' | 'duplicate'

/** Referentials matched by key on import: they are not news for the user. */
const REFERENTIALS = new Set(['categories', 'glasses', 'ice_types'])

type Row = { key: string; label: string; total: number; added: number; matched: number }

/** The tables the user knows by name, then everything else in one line. */
function previewRows(tables: Preview['tables']): Row[] {
  const t = fr.settings.import
  const rows: Row[] = []
  const other: Row = { key: 'other', label: t.otherTables, total: 0, added: 0, matched: 0 }
  for (const table of tables) {
    if (table.total === 0 || (REFERENTIALS.has(table.table) && table.added === 0)) continue
    const label = t.tables[table.table]
    if (label) rows.push({ key: table.table, label, ...table })
    else {
      other.total += table.total
      other.added += table.added
      other.matched += table.matched
    }
  }
  return other.total > 0 ? [...rows, other] : rows
}

/**
 * Import of a .shakery file as a row of the transfer block: choose, read the preview under the
 * row, decide for the conflicts, import.
 */
export function ImportRow() {
  const t = fr.settings.import
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [strategy, setStrategy] = useState<Strategy>('ignore')

  const choose = useMutation({
    mutationFn: () => unwrap(window.shakery.import.choose()),
    onSuccess: (result) => {
      if (!result) return
      setPreview(result)
      setStrategy('ignore')
    },
    onError: (error) => {
      const invalid = error instanceof ShakeryError && error.code === 'INVALID_INPUT'
      toast.show({ message: invalid ? t.invalid : errorMessage(error), tone: 'error' })
    },
  })

  const apply = useMutation({
    mutationFn: (token: string) => unwrap(window.shakery.import.apply({ token, strategy })),
    onSuccess: (result) => {
      setPreview(null)
      // Everything may have changed: recipes, ingredients, bottles, sheets.
      void queryClient.invalidateQueries()
      toast.show({ message: t.done(result.inserted, result.updated) })
    },
    onError: (error) => {
      const expired = error instanceof ShakeryError && error.code === 'NOT_FOUND'
      if (expired) setPreview(null)
      toast.show({ message: expired ? t.expired : errorMessage(error), tone: 'error' })
    },
  })

  const conflicts = preview?.tables.reduce((sum, table) => sum + table.conflicts, 0) ?? 0
  const busy = choose.isPending || apply.isPending

  return (
    <>
      <ControlRow label={t.title} hint={t.description}>
        <Button
          variant="outline"
          icon={<FileUp size={16} aria-hidden="true" />}
          onClick={() => {
            choose.mutate()
          }}
          disabled={busy}
        >
          {choose.isPending ? t.reading : t.choose}
        </Button>
      </ControlRow>

      {preview ? (
        <div className="flex flex-col gap-4 border-t border-border pt-3 pb-4">
          <p className="m-0 text-small text-fg-secondary">{t.source(preview.label)}</p>
          <table className="w-full border-collapse text-small">
            <thead>
              <tr className="text-left text-caption text-fg-muted">
                <th scope="col" className="py-2 font-medium">
                  {t.tableHead.table}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t.tableHead.total}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t.tableHead.added}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t.tableHead.matched}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {previewRows(preview.tables).map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <th scope="row" className="py-2 text-left font-normal text-fg">
                    {row.label}
                  </th>
                  <td className="py-2 text-right text-fg">{row.total}</td>
                  <td className="py-2 text-right text-fg">{row.added}</td>
                  <td className="py-2 text-right text-fg-secondary">{row.matched}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {conflicts > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-small text-fg">{t.conflicts(conflicts)}</p>
              <SegmentedControl<Strategy>
                label={t.strategyLabel}
                options={[
                  { value: 'ignore', label: t.strategies.ignore },
                  { value: 'replace', label: t.strategies.replace },
                  { value: 'duplicate', label: t.strategies.duplicate },
                ]}
                value={strategy}
                onChange={setStrategy}
                disabled={busy}
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                apply.mutate(preview.token)
              }}
              disabled={busy}
            >
              {apply.isPending ? t.applying : t.apply}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(null)
              }}
              disabled={busy}
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
