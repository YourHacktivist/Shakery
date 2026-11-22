import { useQueries } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { formatDose } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { formatDate, formatEuros } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import {
  queryKeys,
  useCollection,
  useDisplayUnit,
  useGlasses,
  useIngredients,
  useSettings,
} from '@renderer/lib/queries'
import { PRINT_READY_TITLE } from '@shared/print'
import { InlineText, RichText } from '@renderer/components/RichText'

const t = fr.workshop

/**
 * A collection as a PDF (section 12.2): light theme, black on white, no decoration. Rendered
 * in a hidden window; the title tells the main process when everything is on the page.
 */
export function CollectionPrint() {
  const display = useDisplayUnit()
  const settings = useSettings()
  const { id = '' } = useParams()
  const collection = useCollection(id)
  const [printedAt] = useState(() => Date.now())
  const ingredients = useIngredients()
  const glasses = useGlasses()
  const recipeIds = (collection.data?.items ?? [])
    .map((item) => item.recipeId)
    .filter((value): value is string => value !== null)
  const details = useQueries({
    queries: recipeIds.map((recipeId) => ({
      queryKey: queryKeys.recipe(recipeId),
      queryFn: () => unwrap(window.shakery.recipes.get({ id: recipeId })),
    })),
  })
  const names = useMemo(
    () => new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients.data],
  )
  const ready =
    !settings.isPending &&
    collection.isSuccess &&
    ingredients.isSuccess &&
    glasses.isSuccess &&
    details.every((query) => query.isSuccess)

  useLayoutEffect(() => {
    document.documentElement.classList.add('print-light')
  }, [])

  useEffect(() => {
    if (!ready) return
    void document.fonts.ready.then(() => {
      document.title = PRINT_READY_TITLE
    })
  }, [ready])

  if (!ready) return <p className="p-8 text-sm">{t.print.loading}</p>
  const byId = new Map(details.map((query) => [query.data.id, query.data]))

  return (
    <main className="mx-auto max-w-[720px] px-2 py-4 text-[11pt] leading-snug text-black">
      <header className="mb-6 border-b border-black/30 pb-3">
        <h1 className="m-0 text-[20pt] font-semibold">{collection.data.name}</h1>
        <p className="m-0 text-[9pt] text-black/60">
          {`${t.collections.kinds[collection.data.kind]} · ${t.print.collection(collection.data.items.length)} · ${formatDate(printedAt)}`}
        </p>
        {collection.data.description ? (
          <RichText text={collection.data.description} className="mt-2" />
        ) : null}
      </header>
      <ol className="m-0 flex list-none flex-col gap-5 p-0">
        {collection.data.items.map((item, index) => {
          const recipe = item.recipeId ? byId.get(item.recipeId) : undefined
          const glass = glasses.data.find((candidate) => candidate.id === recipe?.glassId)?.name
          const facts = [
            recipe?.method ? fr.recipes.methods[recipe.method] : null,
            glass ?? null,
            recipe?.garnish ?? null,
          ].filter((value): value is string => value !== null)
          return (
            <li key={item.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-4 border-b border-black/15 pb-1">
                <h2 className="m-0 text-[13pt] font-semibold">{`${String(index + 1)}. ${item.title}`}</h2>
                {item.salePriceCents === null ? null : (
                  <span className="font-semibold tabular-nums">{formatEuros(item.salePriceCents)}</span>
                )}
              </div>
              {recipe ? (
                <>
                  <ul className="mt-1.5 mb-0 list-none p-0">
                    {recipe.lines.map((line) => (
                      <li key={line.id} className="flex gap-3">
                        <span className="w-[90px] shrink-0 text-right tabular-nums">
                          {formatDose(line, display)}
                        </span>
                        <span>{names.get(line.ingredientId) ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                  {facts.length > 0 ? (
                    <p className="mt-1.5 mb-0 text-[9.5pt] text-black/70">{facts.join(' · ')}</p>
                  ) : null}
                  {recipe.steps.length > 0 ? (
                    <ol className="mt-1.5 mb-0 pl-5 text-[9.5pt]">
                      {recipe.steps.map((step, stepIndex) => (
                        <li key={stepIndex}>
                          <InlineText text={step} />
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 mb-0 text-[9.5pt] text-black/70">{t.collections.sheet}</p>
              )}
              {item.note ? <p className="mt-1.5 mb-0 text-[9.5pt] italic">{item.note}</p> : null}
            </li>
          )
        })}
      </ol>
    </main>
  )
}
