import { useMutation } from '@tanstack/react-query'
import { FileDown, Sheet } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

type Table = 'recipes' | 'journal' | 'ingredients'

/** Full .shakery export, photos included, and the CSV tables (section 12.4). */
export function ExportCard() {
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
    <Card aria-label={t.title} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{t.eyebrow}</span>
        <h2 className="m-0 text-body font-semibold text-fg">{t.title}</h2>
        <p className="m-0 text-small text-fg-secondary">{t.description}</p>
      </div>
      <div>
        <Button
          icon={<FileDown size={16} aria-hidden="true" />}
          disabled={busy}
          onClick={() => {
            full.mutate()
          }}
        >
          {full.isPending ? t.running : t.full}
        </Button>
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <h3 className="m-0 text-small font-semibold text-fg">{t.csvTitle}</h3>
        <p className="m-0 text-small text-fg-secondary">{t.csvDescription}</p>
        <div className="flex flex-wrap gap-2">
          {(['recipes', 'journal', 'ingredients'] as const).map((table) => (
            <Button
              key={table}
              variant="outline"
              size="sm"
              icon={<Sheet size={14} aria-hidden="true" />}
              disabled={busy}
              onClick={() => {
                csv.mutate(table)
              }}
            >
              {t.csv[table]}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}
