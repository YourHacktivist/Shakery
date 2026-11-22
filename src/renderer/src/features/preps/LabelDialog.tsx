import { FileDown, Printer } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'
import { BottleLabel } from '@renderer/print/BottleLabel'
import { useBottleLabel } from '@renderer/print/useBottleLabel'
import {
  LABEL_FORMAT_VALUES,
  LABEL_FORMATS,
  MAX_LABELS,
  type LabelFormat,
  type PrintTarget,
} from '@shared/print'
import type { Batch } from '@shared/domain/workshop'

const t = fr.workshop.preps.label
/** Box of the preview, in pixels. */
const PREVIEW = { width: 300, height: 190 }
const PX_PER_MM = 96 / 25.4

/** The label of a batch: format, copies, preview, PDF or printer (section 10.9). */
export function LabelDialog({ batch, onClose }: { batch: Batch | null; onClose: () => void }) {
  return (
    <Dialog open={batch !== null} onClose={onClose} title={t.title} description={t.description} size="xl">
      {batch ? <LabelForm batch={batch} /> : null}
    </Dialog>
  )
}

function LabelForm({ batch }: { batch: Batch }) {
  const [format, setFormat] = useState<LabelFormat>('roll62x29')
  const [count, setCount] = useState<number | null>(1)
  const [first, setFirst] = useState<number | null>(1)
  const [allergens, setAllergens] = useState(true)
  const [busy, setBusy] = useState(false)
  const label = useBottleLabel(batch.recipeId, batch.id, allergens)
  const spec = LABEL_FORMATS[format]
  const perPage = spec.columns * spec.rows
  const scale = Math.min(PREVIEW.width / (spec.width * PX_PER_MM), PREVIEW.height / (spec.height * PX_PER_MM))

  async function send(to: PrintTarget) {
    setBusy(true)
    try {
      const { done } = await unwrap(
        window.shakery.export.labels({
          id: batch.recipeId,
          batchId: batch.id,
          to,
          format,
          count: Math.min(Math.max(Math.round(count ?? 1), 1), MAX_LABELS),
          skip: Math.min(Math.max(Math.round(first ?? 1), 1), perPage) - 1,
          allergens,
        }),
      )
      if (done) toast.show({ message: to === 'pdf' ? t.saved : t.sent })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-[312px_minmax(0,1fr)] gap-6">
      <div className="flex min-h-[240px] items-center justify-center rounded-field border border-border bg-surface-2">
        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-[3px] bg-white shadow-float"
          style={{ width: spec.width * PX_PER_MM * scale, height: spec.height * PX_PER_MM * scale }}
        >
          {label ? (
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ transform: `scale(${String(scale)})` }}
            >
              <BottleLabel key={format} data={label} format={spec} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <Select
          label={t.format}
          value={format}
          options={LABEL_FORMAT_VALUES.map((value) => ({ value, label: t.formats[value] }))}
          onChange={(event) => {
            const next = LABEL_FORMAT_VALUES.find((value) => value === event.target.value)
            if (!next) return
            setFormat(next)
            setFirst(1)
            // A sheet of labels is filled, a roll gives one.
            setCount(LABEL_FORMATS[next].columns * LABEL_FORMATS[next].rows)
          }}
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberWithUnit
            label={t.count}
            value={count}
            onChange={setCount}
            min={1}
            max={MAX_LABELS}
            step={1}
            decimals={0}
          />
          {perPage > 1 ? (
            <NumberWithUnit
              label={t.first}
              description={t.firstHint}
              value={first}
              onChange={setFirst}
              min={1}
              max={perPage}
              step={1}
              decimals={0}
            />
          ) : null}
        </div>
        <Checkbox
          label={t.allergens}
          description={t.allergensHint}
          checked={allergens}
          onChange={(event) => {
            setAllergens(event.target.checked)
          }}
        />
        <p className="m-0 text-caption text-fg-muted">{t.scaleHint}</p>
        <div className="mt-auto flex w-full flex-col gap-2">
          <Button
            data-autofocus=""
            className="w-full"
            icon={<FileDown size={16} aria-hidden="true" />}
            disabled={busy || !label}
            onClick={() => void send('pdf')}
          >
            {t.savePdf}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            icon={<Printer size={16} aria-hidden="true" />}
            disabled={busy || !label}
            onClick={() => void send('printer')}
          >
            {t.print}
          </Button>
        </div>
      </div>
    </div>
  )
}
