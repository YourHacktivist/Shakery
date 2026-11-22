import { useLayoutEffect, useRef } from 'react'
import logoUrl from '@renderer/assets/logo-512.png'
import { formatDose, inDisplayUnit, type Display } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { formatDate, formatNumber } from '@renderer/lib/format'
import { fitSheet } from '@renderer/print/fitSheet'
import { TYPICAL_STEPS_CREDIT } from '@shared/classics'
import type { RecipeComputation, RecipeDetail } from '@shared/domain/catalog'
import type { RecipePaper } from '@shared/print'
import { InlineText, RichText } from '@renderer/components/RichText'
import './recipe-sheet.css'

const t = fr.recipes
const ts = fr.recipes.sheet

/** Above this many lines and steps, the rows tighten and the ruled lines give their room. */
const DENSE_ROWS: Record<RecipePaper, number> = { a4: 14, a5: 11 }
const LONG_NAME = 28
/** More ruled lines than any paper holds; fitSheet keeps those that fit. */
const RULES = 40
/** Without these, the served volume would be wrong rather than approximate. */
const VOLUME_REASONS = new Set(['missing_quantity', 'top_without_estimate'])

export type RecipeSheetProps = {
  recipe: RecipeDetail
  names: ReadonlyMap<string, string>
  glass: string | null
  ice: string | null
  /** null while nothing can be calculated (no line). */
  computation: RecipeComputation | null
  indicators: boolean
  paper: RecipePaper
  display: Display
  printedAt: number
  /** Drawn with the margins of the paper, for the preview of the dialog. */
  preview?: boolean
}

/** The technical sheet of a recipe, A4 or A5 (section 12.2). */
export function RecipeSheet({
  recipe,
  names,
  glass,
  ice,
  computation,
  indicators,
  paper,
  display,
  printedAt,
  preview = false,
}: RecipeSheetProps) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const sheet = ref.current
    if (!sheet) return
    fitSheet(sheet)
    // The widths of the text change when Manrope arrives.
    void document.fonts.ready.then(() => {
      if (sheet.isConnected) fitSheet(sheet)
    })
  })
  const dense = recipe.lines.length + recipe.steps.length > DENSE_ROWS[paper]
  const eyebrow = [ts.eyebrow, recipe.family ? t.families[recipe.family] : null].filter(Boolean).join(' · ')

  const facts: Array<{ label: string; value: string }> = []
  if (recipe.method) facts.push({ label: ts.method, value: t.methods[recipe.method] })
  if (glass) facts.push({ label: ts.glass, value: glass })
  if (ice) facts.push({ label: ts.ice, value: ice })
  if (computation && !computation.abv.issues.some((issue) => VOLUME_REASONS.has(issue.reason))) {
    const volume = inDisplayUnit(Math.round(computation.finalVolumeMl), 'ml', display)
    if (volume.quantity > 0) {
      facts.push({ label: ts.volume, value: ts.amount(formatNumber(volume.quantity), volume.unit) })
    }
  }

  const figures = (
    indicators && computation
      ? ([
          ['abv', computation.abv, t.panel.units.abv],
          ['sugar', computation.sugarPer100Ml, t.panel.units.per100],
          ['acid', computation.acidPer100Ml, t.panel.units.per100],
          ['ratio', computation.ratio, t.panel.units.ratio],
        ] as const)
      : []
  ).filter(([, metric]) => metric.status !== 'incomplete' && metric.value !== null)
  const allergens = indicators ? (computation?.allergens ?? []) : []

  return (
    <article
      ref={ref}
      className="sheet"
      data-paper={paper}
      data-preview={preview ? '' : undefined}
      data-dense={dense ? '' : undefined}
    >
      <header className="sheet-head">
        <span className="sheet-logo">
          <img src={logoUrl} alt="" />
        </span>
        <div className="sheet-title">
          <p className="sheet-eyebrow">{eyebrow}</p>
          <h1 className="sheet-name" data-long={recipe.name.length > LONG_NAME ? '' : undefined}>
            {recipe.name}
          </h1>
          {recipe.credit && recipe.credit !== TYPICAL_STEPS_CREDIT ? (
            <p className="sheet-credit">{recipe.credit}</p>
          ) : null}
        </div>
      </header>

      {facts.length > 0 ? (
        <dl className="sheet-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="sheet-fact">
              <dt className="sheet-label">{fact.label}</dt>
              <dd className="sheet-value">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="sheet-body" data-steps={recipe.steps.length > 0 ? '' : undefined}>
        <section>
          <h2 className="sheet-heading">{t.detail.sections.lines}</h2>
          <ul className="sheet-lines">
            {recipe.lines.map((line) => {
              const details = [
                line.note,
                line.isOptional ? t.detail.optional : null,
                line.isGarnish ? t.detail.garnishLine : null,
              ].filter(Boolean)
              return (
                <li key={line.id} className="sheet-line">
                  <span className="sheet-dose">{formatDose(line, display)}</span>
                  <span className="sheet-ingredient">
                    {names.get(line.ingredientId) ?? ''}
                    {details.length > 0 ? <span className="sheet-note">{details.join(', ')}</span> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        {recipe.steps.length > 0 ? (
          <section>
            <h2 className="sheet-heading">{t.detail.sections.steps}</h2>
            <ol className="sheet-steps">
              {recipe.steps.map((step, index) => (
                <li key={index}>
                  <span>
                    <InlineText text={step} />
                  </span>
                </li>
              ))}
            </ol>
            {recipe.credit === TYPICAL_STEPS_CREDIT ? <p className="sheet-typical">{recipe.credit}</p> : null}
          </section>
        ) : null}
      </div>

      {recipe.garnish ? (
        <div className="sheet-garnish">
          <p className="sheet-label">{ts.garnish}</p>
          <p>{recipe.garnish}</p>
        </div>
      ) : null}

      {figures.length > 0 ? (
        <dl className="sheet-figures">
          {figures.map(([id, metric, unit]) => (
            <div key={id} className="sheet-figure">
              <dt className="sheet-label">{t.panel[id]}</dt>
              <dd>
                {formatNumber(metric.value ?? 0, 1)} <span className="sheet-unit">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {allergens.length > 0 ? (
        <p className="sheet-allergens">
          <span className="sheet-label">{t.panel.allergens}</span>{' '}
          {allergens.map((code) => fr.components.display.allergens[code]).join(', ')}
        </p>
      ) : null}

      <section className="sheet-writing">
        <h2 className="sheet-heading">{ts.notes}</h2>
        {recipe.notes ? <RichText text={recipe.notes} className="sheet-text" /> : null}
        {dense ? null : (
          <div aria-hidden="true" className="sheet-rules">
            <div className="sheet-rules-list">
              {Array.from({ length: RULES }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="sheet-foot">
        <span>{ts.brand}</span>
        <span>{ts.printed(recipe.version, formatDate(printedAt))}</span>
      </footer>
    </article>
  )
}
