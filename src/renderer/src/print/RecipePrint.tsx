import { useEffect, useLayoutEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { fr } from '@renderer/i18n/fr'
import { RecipeSheet } from '@renderer/print/RecipeSheet'
import { useRecipeSheet } from '@renderer/print/useRecipeSheet'
import { PRINT_READY_TITLE, recipePrintOptions } from '@shared/print'

/**
 * A recipe as a PDF or on the printer (section 12.2). Rendered in a hidden window; the title
 * tells the main process when the fonts and the logo are on the page.
 */
export function RecipePrint() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { paper, indicators } = recipePrintOptions(params)
  const sheet = useRecipeSheet(id)
  const ready = sheet !== null

  useLayoutEffect(() => {
    // No entrance and no transition on paper: they would be caught half-way.
    document.documentElement.classList.add('print-light', 'no-motion')
  }, [])

  useEffect(() => {
    if (!ready) return
    const images = [...document.images].map((image) => image.decode().catch(() => undefined))
    void Promise.all([document.fonts.ready, ...images]).then(() => {
      document.title = PRINT_READY_TITLE
    })
  }, [ready])

  if (!sheet) return <p className="p-8 text-sm">{fr.recipes.sheet.loading}</p>
  return <RecipeSheet {...sheet} paper={paper} indicators={indicators} />
}
