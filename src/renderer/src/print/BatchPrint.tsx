import { useEffect, useLayoutEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import type { BatchHint } from '@core/batch'
import { formatDose } from '@renderer/features/recipes/model'
import { useBatch } from '@renderer/features/calculators/useBatch'
import { fr } from '@renderer/i18n/fr'
import { formatDate, formatNumber } from '@renderer/lib/format'
import { useRecipe } from '@renderer/lib/queries'
import { batchPrintOptions, PRINT_READY_TITLE } from '@shared/print'
import './batch-sheet.css'

const t = fr.workshop.calculators.batch
const GROUPS: readonly BatchHint[] = ['ok', 'fresh', 'add_at_service']

/** The result of a batch on paper (section 12.2): what to pour, in three times, with boxes to tick. */
export function BatchPrint() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const options = batchPrintOptions(params)
  const recipe = useRecipe(id)
  const batch = useBatch(recipe.data ?? null, options)
  const [printedAt] = useState(() => Date.now())

  useLayoutEffect(() => {
    document.documentElement.classList.add('print-light', 'no-motion')
  }, [])

  useEffect(() => {
    if (!batch.ready) return
    void document.fonts.ready.then(() => {
      document.title = PRINT_READY_TITLE
    })
  }, [batch.ready])

  if (!recipe.data || !batch.ready) return <p className="p-8 text-sm">{fr.recipes.sheet.loading}</p>
  const { result } = batch

  return (
    <article className="batch-sheet">
      <header className="batch-head">
        <p className="batch-eyebrow">{t.sheetTitle}</p>
        <h1>{recipe.data.name}</h1>
        <p>
          {result ? `${t.drinks(formatNumber(Math.round(result.servings * 10) / 10))} · ` : ''}
          {formatDate(printedAt)}
        </p>
      </header>
      {result === null ? <p>{t.nothingKeeps}</p> : null}
      {result &&
        GROUPS.map((hint) => {
          const lines = result.lines.filter((line) => line.hint === hint)
          const water = hint === 'ok' && result.waterMl > 0
          if (lines.length === 0 && !water) return null
          const total = hint === 'ok' ? result.bottleMl : hint === 'fresh' ? result.freshMl : result.serviceMl
          return (
            <section key={hint}>
              <h2>{t.hints[hint]}</h2>
              {hint === 'fresh' ? <p className="batch-warning">{t.freshWarning}</p> : null}
              <table>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="batch-box">
                        <span />
                      </td>
                      <td>
                        {line.label}
                        {line.isGarnish ? ` (${t.garnish})` : ''}
                        {line.isOptional ? ` (${t.optional})` : ''}
                      </td>
                      <td className="batch-figure">
                        {line.quantity === null
                          ? ''
                          : formatDose({ quantity: line.quantity, unit: line.unit, topEstimateMl: null })}
                      </td>
                      <td className="batch-figure batch-ml">
                        {line.ml === null || line.unit === 'ml' ? '' : `${formatNumber(line.ml)} ml`}
                      </td>
                    </tr>
                  ))}
                  {water ? (
                    <tr>
                      <td className="batch-box">
                        <span />
                      </td>
                      <td>{t.water}</td>
                      <td className="batch-figure">{`${formatNumber(result.waterMl)} ml`}</td>
                      <td />
                    </tr>
                  ) : null}
                </tbody>
                {total > 0 ? (
                  <tfoot>
                    <tr>
                      <td />
                      <td>{t.total}</td>
                      <td className="batch-figure">{`${formatNumber(total)} ml`}</td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </section>
          )
        })}
    </article>
  )
}
