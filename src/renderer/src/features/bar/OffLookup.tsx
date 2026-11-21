import { useMutation } from '@tanstack/react-query'
import { ScanBarcode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { formatNumber } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import type { IpcOutput } from '@shared/ipc/contract'

type OffProduct = NonNullable<IpcOutput<'off.lookup'>['product']>
export type OffField = 'brand' | 'name' | 'volumeMl' | 'abv' | 'allergens'

const tp = fr.bar.productForm

/** Online and offline events of the window: the button hides without network (section 9). */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine)
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/**
 * « Rechercher par code-barres » (section 9): the main asks Open Food Facts, the fields found
 * are shown, and the user ticks what to take. Hidden when the setting is off or offline.
 */
export function OffLookup({
  enabled,
  barcode,
  onApply,
  lookupRef,
}: {
  enabled: boolean
  barcode: () => string | null
  onApply: (product: OffProduct, fields: ReadonlySet<OffField>) => void
  /** Lets the barcode field start the lookup on Enter (a USB scanner types the code, then Enter). */
  lookupRef?: { current: (() => void) | null }
}) {
  const online = useOnline()
  const [result, setResult] = useState<{ product: OffProduct | null } | null>(null)
  const [picked, setPicked] = useState<Set<OffField>>(new Set())
  const lookup = useMutation({
    mutationFn: (code: string) => unwrap(window.shakery.off.lookup({ barcode: code })),
    onSuccess: (answer) => {
      setResult(answer)
      const product = answer.product
      if (!product) return
      const found = new Set<OffField>()
      if (product.brand) found.add('brand')
      if (product.name) found.add('name')
      if (product.volumeMl !== null) found.add('volumeMl')
      if (product.abv !== null) found.add('abv')
      if (product.allergens.length > 0) found.add('allergens')
      setPicked(found)
    },
    onError: notifyError,
  })
  const visible = enabled && online
  const start = () => {
    const code = barcode()
    if (code && /^\d{6,14}$/.test(code)) lookup.mutate(code)
  }
  useEffect(() => {
    if (!lookupRef) return
    lookupRef.current = visible ? start : null
  })

  if (!visible) return null
  const product = result?.product ?? null
  const allergenNames = fr.components.display.allergens
  const rows: Array<{ field: OffField; label: string; value: string | null }> = product
    ? [
        { field: 'brand', label: tp.brand, value: product.brand },
        { field: 'name', label: tp.name, value: product.name },
        {
          field: 'volumeMl',
          label: tp.volume,
          value: product.volumeMl === null ? null : fr.bar.bottle.volume(formatNumber(product.volumeMl)),
        },
        {
          field: 'abv',
          label: tp.abv,
          value: product.abv === null ? null : fr.bar.bottle.abv(formatNumber(product.abv)),
        },
        {
          field: 'allergens',
          label: tp.allergens,
          value:
            product.allergens.length === 0
              ? null
              : product.allergens.map((code) => allergenNames[code]).join(', '),
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-2 rounded-field border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<ScanBarcode size={14} aria-hidden="true" />}
          disabled={lookup.isPending}
          onClick={start}
        >
          {lookup.isPending ? tp.lookupRunning : tp.lookup}
        </Button>
        <span className="text-small text-fg-muted">{tp.lookupHint}</span>
      </div>
      {result && !product ? <p className="m-0 text-small text-fg-secondary">{tp.lookupNotFound}</p> : null}
      {product ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-small text-fg-secondary">{tp.lookupFound}</p>
          {rows
            .filter((row) => row.value !== null)
            .map((row) => (
              <Checkbox
                key={row.field}
                label={tp.lookupField(row.label, row.value ?? '')}
                checked={picked.has(row.field)}
                onChange={(event) => {
                  const next = new Set(picked)
                  if (event.target.checked) next.add(row.field)
                  else next.delete(row.field)
                  setPicked(next)
                }}
              />
            ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-fg-muted">{fr.bar.offAttribution}</span>
            <Button
              type="button"
              size="sm"
              disabled={picked.size === 0}
              onClick={() => {
                onApply(product, picked)
                setResult(null)
              }}
            >
              {tp.lookupApply}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
