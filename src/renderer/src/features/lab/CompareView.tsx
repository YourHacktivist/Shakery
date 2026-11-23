import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@renderer/components/Card'
import { Combobox } from '@renderer/components/Combobox'
import { Checkbox } from '@renderer/components/Checkbox'
import { VersionDiff, type VersionChange } from '@renderer/components/VersionDiff'
import { computationInput, detailToInput, formatDose } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { formatDelta, formatNumber } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import { queryKeys, useDisplayUnit, useGlasses, useRecipes } from '@renderer/lib/queries'
import type { RecipeComputation, RecipeDetail, RecipeInputParsed } from '@shared/domain/catalog'
import { compareRecipes, metricDelta } from '@core/compare'
import { NoValue } from '@renderer/components/NoValue'

const t = fr.recipes.lab
const tp = fr.recipes.panel
const DRAFT = 0
const MOST = 3

type Column = {
  id: string
  label: string
  data: RecipeInputParsed | undefined
  result: RecipeComputation | undefined
}

/**
 * Comparison mode (section 10.5): two or three versions or recipes side by side, the first one
 * being the reference; lines that differ in colour and the gap of each indicator.
 */
export function CompareView({
  recipe,
  draft,
  names,
  picking = false,
}: {
  recipe: RecipeDetail
  draft: RecipeInputParsed
  names: ReadonlyMap<string, string>
  /** Opened by « Comparer avec… »: the field of the other recipe waits for a name. */
  picking?: boolean
}) {
  const display = useDisplayUnit()
  const glasses = useGlasses()
  const versions = [...recipe.history].sort((a, b) => b.version - a.version)
  // « Comparer avec… » keeps a column for each recipe to come: the draft is not proposed.
  const [selected, setSelected] = useState<number[]>(picking ? [recipe.version] : [recipe.version, DRAFT])
  const [others, setOthers] = useState<string[]>([])
  const count = selected.length + others.length
  const recipes = useRecipes()
  const otherOptions = useMemo(
    () =>
      (recipes.data ?? [])
        .filter((item) => item.id !== recipe.id && !others.includes(item.id))
        .map((item) => ({ id: item.id, label: item.name })),
    [recipes.data, recipe.id, others],
  )
  const recipeName = (id: string) => recipes.data?.find((item) => item.id === id)?.name ?? ''
  const otherDetails = useQueries({
    queries: others.map((id) => ({
      queryKey: queryKeys.recipe(id),
      queryFn: () => unwrap(window.shakery.recipes.get({ id })),
    })),
  })
  const pickerRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (picking) pickerRef.current?.focus()
  }, [picking])

  const snapshots = useQueries({
    queries: selected
      .filter((version) => version !== DRAFT)
      .map((version) => ({
        queryKey: ['recipe-version', recipe.id, version],
        queryFn: () => unwrap(window.shakery.recipes.getVersion({ id: recipe.id, version })),
        staleTime: Infinity,
      })),
  })
  const dataOf = (version: number): RecipeInputParsed | undefined => {
    if (version === DRAFT) return draft
    const index = selected.filter((v) => v !== DRAFT).indexOf(version)
    const snapshot = snapshots[index]?.data
    return snapshot ? detailToInput(snapshot) : undefined
  }
  const sources = [
    ...selected.map((version) => ({
      id: `v:${String(version)}`,
      label: version === DRAFT ? t.draft : `v${version}`,
      data: dataOf(version),
    })),
    ...others.map((id, index) => {
      const detail = otherDetails[index]?.data
      return { id, label: recipeName(id), data: detail ? detailToInput(detail) : undefined }
    }),
  ]
  const computations = useQueries({
    queries: sources.map((source) => {
      const data = source.data ? computationInput(source.data) : null
      return {
        queryKey: ['computation', data],
        queryFn: () => unwrap(window.shakery.recipes.compute({ data: data ?? { name: '' } })),
        enabled: data !== null,
      }
    }),
  })
  const columns: Column[] = sources.map((source, index) => ({ ...source, result: computations[index]?.data }))
  const reference = columns[0]

  const glassName = (id: string | null) =>
    glasses.data?.find((glass) => glass.id === id)?.name ?? fr.recipes.none
  const methodName = (method: string | null) =>
    method ? fr.recipes.methods[method as keyof typeof fr.recipes.methods] : fr.recipes.none

  function changesBetween(
    from: RecipeInputParsed,
    to: RecipeInputParsed,
  ): { list: VersionChange[]; note: string | null } {
    const diff = compareRecipes(from, to)
    const name = (id: string) => names.get(id) ?? ''
    const dose = (line: { quantity: number | null; unit: string }) =>
      line.quantity === null
        ? undefined
        : { amount: line.quantity, unit: fr.recipes.units[line.unit as keyof typeof fr.recipes.units] }
    const list: VersionChange[] = []
    for (const change of diff.lines) {
      if (change.kind === 'unchanged') continue
      if (change.kind === 'added' || change.kind === 'removed') {
        const amount = dose(change.line)
        list.push(
          amount
            ? { kind: change.kind, ingredient: name(change.line.ingredientId), dose: amount }
            : { kind: change.kind, ingredient: name(change.line.ingredientId) },
        )
      } else if (change.delta !== null && change.before.quantity !== null && change.after.quantity !== null) {
        list.push({
          kind: 'dose',
          ingredient: name(change.ingredientId),
          before: change.before.quantity,
          after: change.after.quantity,
          unit: fr.recipes.units[change.after.unit as keyof typeof fr.recipes.units],
        })
      } else {
        list.push(
          { kind: 'removed', ingredient: name(change.ingredientId) },
          { kind: 'added', ingredient: name(change.ingredientId) },
        )
      }
    }
    if (diff.method)
      list.push({
        kind: 'method',
        before: methodName(diff.method.before),
        after: methodName(diff.method.after),
      })
    if (diff.glass)
      list.push({ kind: 'glass', before: glassName(diff.glass.before), after: glassName(diff.glass.after) })
    const note = diff.identical ? (diff.reordered ? t.reordered : t.noChange) : null
    return { list, note }
  }

  const metrics = [
    {
      id: 'abv',
      label: tp.abv,
      unit: tp.units.abv,
      decimals: 1,
      pick: (r: RecipeComputation) => r.abv.value,
    },
    {
      id: 'sugar',
      label: tp.sugar,
      unit: tp.units.per100,
      decimals: 1,
      pick: (r: RecipeComputation) => r.sugarPer100Ml.value,
    },
    {
      id: 'acid',
      label: tp.acid,
      unit: tp.units.per100,
      decimals: 2,
      pick: (r: RecipeComputation) => r.acidPer100Ml.value,
    },
    {
      id: 'ratio',
      label: tp.ratio,
      unit: tp.units.ratio,
      decimals: 0,
      pick: (r: RecipeComputation) => r.ratio.value,
    },
    {
      id: 'volume',
      label: tp.volume,
      unit: tp.units.ml,
      decimals: 0,
      pick: (r: RecipeComputation) => r.finalVolumeMl,
    },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <Card aria-label={t.compareTitle} className="gap-2">
        <h2 className="m-0 text-body font-semibold text-fg">{t.compareTitle}</h2>
        <p className="m-0 text-caption text-fg-muted">{t.compareHint}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {[DRAFT, ...versions.map((entry) => entry.version)].map((version) => {
            const checked = selected.includes(version)
            return (
              <Checkbox
                key={version}
                label={version === DRAFT ? t.draft : `v${version}`}
                checked={checked}
                disabled={!checked && count >= MOST}
                onChange={() => {
                  setSelected((current) =>
                    current.includes(version) ? current.filter((v) => v !== version) : [...current, version],
                  )
                }}
              />
            )
          })}
          {others.map((id) => (
            <Checkbox
              key={id}
              label={recipeName(id)}
              checked
              onChange={() => {
                setOthers((current) => current.filter((other) => other !== id))
              }}
            />
          ))}
        </div>
        <Combobox
          ref={pickerRef}
          className="max-w-sm"
          label={t.compareWith}
          placeholder={t.compareWithPlaceholder}
          description={count >= MOST ? t.compareFull : undefined}
          options={otherOptions}
          value={null}
          disabled={count >= MOST}
          onSelect={(id) => {
            setOthers((current) => [...current, id])
          }}
        />
      </Card>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
      >
        {columns.map((column, index) => {
          const diff =
            index > 0 && reference?.data && column.data ? changesBetween(reference.data, column.data) : null
          return (
            <Card key={column.id} aria-label={column.label} className="gap-3">
              <h3 className="m-0 text-body font-semibold text-fg">{column.label}</h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-small">
                {(column.data?.lines ?? []).map((line, lineIndex) => (
                  <li key={lineIndex} className="flex justify-between gap-2">
                    <span className="truncate text-fg-secondary">{names.get(line.ingredientId) ?? ''}</span>
                    <span className="nums shrink-0 text-fg">{formatDose(line, display)}</span>
                  </li>
                ))}
              </ul>
              <dl className="m-0 flex flex-col gap-1 border-t border-border pt-2 text-small">
                {metrics.map((metric) => {
                  const value = column.result ? metric.pick(column.result) : null
                  const base = reference?.result ? metric.pick(reference.result) : null
                  const delta = index > 0 ? metricDelta(base, value) : null
                  return (
                    <div key={metric.id} className="flex items-baseline justify-between gap-2">
                      <dt className="text-fg-muted">{metric.label}</dt>
                      <dd className="nums m-0 text-fg">
                        {value === null ? (
                          <NoValue />
                        ) : (
                          `${formatNumber(value, metric.decimals)} ${metric.unit}`
                        )}
                        {delta !== null && delta !== 0 ? (
                          <span className="ml-1.5 text-caption text-fg-muted">
                            {t.delta(formatDelta(delta, metric.decimals))}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  )
                })}
              </dl>
              {diff ? (
                diff.note ? (
                  <p className="m-0 text-caption text-fg-muted">{diff.note}</p>
                ) : (
                  <VersionDiff from={reference?.label ?? ''} to={column.label} changes={diff.list} />
                )
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
