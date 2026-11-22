import { useLayoutEffect, useRef } from 'react'
import { fr } from '@renderer/i18n/fr'
import { formatDate, formatNumber } from '@renderer/lib/format'
import type { LabelFormatSpec } from '@shared/print'
import './bottle-label.css'

const t = fr.workshop.preps.label
/** Under this, in points, a label is unreadable whatever it says. */
const SMALLEST_PT = 4

export type BottleLabelData = {
  name: string
  madeAt: number
  bestBefore: number | null
  quantityMl: number | null
  /** Names of the declared allergens; null when they are not to be printed. */
  allergens: readonly string[] | null
}

/** A label of a homemade bottle (section 12.2): name, made on, best before. Never cropped. */
export function BottleLabel({ data, format }: { data: BottleLabelData; format: LabelFormatSpec }) {
  const ref = useRef<HTMLDivElement>(null)
  const start = Math.min(format.height * 0.4, format.width * 0.16)

  // Everything stays: the type shrinks until it fits, the allergens above all.
  useLayoutEffect(() => {
    const label = ref.current
    if (!label) return
    let size = start
    label.style.fontSize = `${String(size)}pt`
    while (
      size - 0.25 >= SMALLEST_PT &&
      (label.scrollHeight > label.clientHeight + 1 || label.scrollWidth > label.clientWidth + 1)
    ) {
      size -= 0.25
      label.style.fontSize = `${String(size)}pt`
    }
  }, [data, start])

  return (
    <div
      ref={ref}
      className="bottle-label"
      style={{ width: `${String(format.width)}mm`, height: `${String(format.height)}mm` }}
    >
      <p className="bottle-label-name">{data.name}</p>
      <dl>
        <div>
          <dt>{t.madeOn}</dt>
          <dd>{formatDate(data.madeAt)}</dd>
        </div>
        <div className="bottle-label-before">
          <dt>{t.bestBefore}</dt>
          {/* Without a duration, a line to write the date by hand: none is ever proposed. */}
          <dd>
            {data.bestBefore === null ? <span className="bottle-label-blank" /> : formatDate(data.bestBefore)}
          </dd>
        </div>
        {data.quantityMl === null ? null : (
          <div>
            <dt>{t.quantity}</dt>
            <dd>{`${formatNumber(data.quantityMl)} ml`}</dd>
          </div>
        )}
      </dl>
      {data.allergens && data.allergens.length > 0 ? (
        <p className="bottle-label-allergens">{t.contains(data.allergens.join(', '))}</p>
      ) : null}
    </div>
  )
}
