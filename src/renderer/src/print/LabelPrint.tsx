import { useEffect, useLayoutEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { fr } from '@renderer/i18n/fr'
import { BottleLabel } from '@renderer/print/BottleLabel'
import { useBottleLabel } from '@renderer/print/useBottleLabel'
import { LABEL_FORMATS, labelPages, labelPrintOptions, PRINT_READY_TITLE } from '@shared/print'

/** Labels of a batch on a roll or on an A4 sheet of labels (section 12.2). */
export function LabelPrint() {
  const { id = '', batchId = '' } = useParams()
  const [params] = useSearchParams()
  const options = labelPrintOptions(params)
  const label = useBottleLabel(id, batchId, options.allergens)
  const ready = label !== null

  useLayoutEffect(() => {
    document.documentElement.classList.add('print-light', 'no-motion')
    document.body.style.margin = '0'
  }, [])

  useEffect(() => {
    if (!ready) return
    void document.fonts.ready.then(() => {
      document.title = PRINT_READY_TITLE
    })
  }, [ready])

  if (!label) return <p className="text-sm">{fr.recipes.sheet.loading}</p>
  const format = LABEL_FORMATS[options.format]

  return (
    <>
      {labelPages(options).map((slots, page) => (
        <div
          key={page}
          className="label-page"
          style={{
            width: `${String(format.page.width)}mm`,
            // A hair shorter than the paper, so that rounding never feeds an empty label.
            height: `${String(format.page.height - 0.2)}mm`,
          }}
        >
          {slots.map(({ left, top }, index) => (
            <div
              key={index}
              className="label-slot"
              style={{ left: `${String(left)}mm`, top: `${String(top)}mm` }}
            >
              <BottleLabel data={label} format={format} />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
