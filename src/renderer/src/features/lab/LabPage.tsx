import { NotebookPen, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { ArrowLink } from '@renderer/components/ArrowLink'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox, type ComboboxOption } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { DoseStepper } from '@renderer/components/DoseStepper'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { NoValue } from '@renderer/components/NoValue'
import { RangeGauge } from '@renderer/components/RangeGauge'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { CompareView } from '@renderer/features/lab/CompareView'
import {
  initLab,
  labReducer,
  sameRecipe,
  stepFor,
  toDraft,
  toInput,
  type LabDraft,
  type LabLine,
} from '@renderer/features/lab/labState'
import { notifyError } from '@renderer/features/shared/notify'
import {
  cleanForSave,
  computationInput,
  detailToInput,
  emptyLine,
  emptyRecipe,
} from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatEuros, formatNumber, roundServedVolume } from '@renderer/lib/format'
import {
  useCreateRecipe,
  useIngredients,
  useRecipe,
  useRecipeComputation,
  useRecipes,
  useReferenceZones,
  useSetting,
  useUpdateRecipe,
} from '@renderer/lib/queries'
import { UNIT_VALUES, type RecipeComputation, type RecipeDetail } from '@shared/domain/catalog'

/** A family counts up to some 2 500 classics: the tooltip names the first ones. */
const ZONE_MEMBERS_SHOWN = 30

const t = fr.recipes.lab
const tp = fr.recipes.panel

/** Heads of the columns of the lines: small capitals, as the facts of a recipe (D-057). */
const CAPS = 'text-[10.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-fg-muted uppercase'
/**
 * Columns of a line: the switch « Dans le verre », the name, the dose and its unit, the bin. While
 * the card is narrow, the dose and its unit go under the name, across the whole line.
 */
const LINE_GRID =
  'grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-x-2 @min-[36rem]:grid-cols-[6.5rem_minmax(0,1fr)_auto_2rem]'

/** Unknown data of an ingredient that keeps a gauge empty, in the order they are named. */
const DATA_REASONS = ['missing_sugar', 'missing_acid', 'missing_abv'] as const
type DataReason = (typeof DATA_REASONS)[number]
const isDataReason = (reason: string): reason is DataReason =>
  (DATA_REASONS as readonly string[]).includes(reason)

/**
 * What keeps the empty gauges empty: the unknown values (« le sucre et l’acidité ») and the
 * ingredients to complete, in the order of the lines.
 */
function missingData(issues: RecipeComputation['abv']['issues']) {
  const found = issues.filter(
    (issue): issue is typeof issue & { ingredientId: string } =>
      isDataReason(issue.reason) && issue.ingredientId !== undefined,
  )
  return {
    words: DATA_REASONS.filter((reason) => found.some((issue) => issue.reason === reason)).map(t.missingWord),
    ingredientIds: [...new Set(found.map((issue) => issue.ingredientId))],
  }
}

/** Lab (section 10.5): pick a recipe, or work on one at /lab/:id, or start from scratch at /lab/new. */
export function LabPage() {
  const { id } = useParams()
  if (id === undefined) return <LabPicker />
  if (id === 'new') return <Workbench key="new" recipe={null} />
  return <LoadedWorkbench id={id} />
}

function LabPicker() {
  const navigate = useNavigate()
  const recipes = useRecipes()
  const [filter, setFilter] = useState('')
  const needle = filter.trim().toLocaleLowerCase('fr')
  const rows = (recipes.data ?? [])
    .filter((recipe) => recipe.kind === 'cocktail' && recipe.name.toLocaleLowerCase('fr').includes(needle))
    .slice(0, 60)
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-small text-fg-muted">{t.title}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.pickTitle}</h1>
          <p className="m-0 text-small text-fg-secondary">{t.pickHint}</p>
        </div>
        <Button icon={<Plus size={14} aria-hidden="true" />} onClick={() => void navigate('/lab/new')}>
          {t.blank}
        </Button>
      </header>
      <Input
        type="search"
        label={t.filter}
        hideLabel
        placeholder={t.filterPlaceholder}
        value={filter}
        onChange={(event) => {
          setFilter(event.target.value)
        }}
      />
      {rows.length === 0 ? <p className="m-0 py-3 text-small text-fg-muted">{t.noRecipe}</p> : null}
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((recipe) => (
          <li key={recipe.id} className="border-t border-border first:border-t-0">
            <button
              type="button"
              onClick={() => void navigate(`/lab/${recipe.id}`)}
              className="flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left text-body text-fg-secondary transition-colors duration-150 ease-out-soft hover:text-fg"
            >
              <span className="truncate">{recipe.name}</span>
              <span className="nums shrink-0 text-caption text-fg-muted">{`v${recipe.version}`}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LoadedWorkbench({ id }: { id: string }) {
  const recipe = useRecipe(id)
  if (recipe.isError) return <EmptyState title={fr.recipes.detail.notFound} className="min-h-[320px] p-8" />
  if (!recipe.data) return <p className="m-0 text-body text-fg-muted">{fr.recipes.detail.loading}</p>
  // A new key after each save starts the history again from the saved version.
  return <Workbench key={`${recipe.data.id}:${recipe.data.version}`} recipe={recipe.data} />
}

type Mode = 'work' | 'compare'

function Workbench({ recipe }: { recipe: RecipeDetail | null }) {
  const navigate = useNavigate()
  const openTasting = useOverlayStore((state) => state.openTasting)
  const ingredients = useIngredients()
  const allRecipes = useRecipes()
  const zones = useReferenceZones()
  const update = useUpdateRecipe()
  const create = useCreateRecipe()
  const initial = useMemo(
    () => toDraft(recipe ? detailToInput(recipe) : { ...emptyRecipe(), name: '' }),
    [recipe],
  )
  const [state, dispatch] = useReducer(labReducer, initial, initLab)
  // /lab/<id>?compare, from the palette: the comparison, ready to receive another recipe.
  const { key: visitKey, search: address } = useLocation()
  const picking = recipe !== null && new URLSearchParams(address).has('compare')
  const [mode, setMode] = useState<Mode>(picking ? 'compare' : 'work')
  const [visit, setVisit] = useState(visitKey)
  if (visit !== visitKey) {
    setVisit(visitKey)
    if (picking) setMode('compare')
  }
  const [dialog, setDialog] = useState<'version' | 'variant' | null>(null)
  const [text, setText] = useState('')
  const linesId = useId()
  const indicatorsId = useId()
  const leaving = useRef(false)
  const draft = state.present
  const dirty = !sameRecipe(draft, initial)

  const computation = useRecipeComputation(computationInput(toInput(draft)))
  const saved = useRecipeComputation(recipe ? computationInput(detailToInput(recipe)) : null)
  const stepMl = useSetting('lab.stepMl')
  const stepOz = useSetting('lab.stepOz')
  const familyZones = draft.family ? zones.data?.[draft.family] : undefined
  const version = recipe ? `v${recipe.version}` : null

  const names = useMemo(
    () => new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients.data],
  )
  const recipeNames = useMemo(
    () => new Map((allRecipes.data ?? []).map((item) => [item.id, item.name])),
    [allRecipes.data],
  )
  const options = useMemo<ComboboxOption[]>(
    () =>
      (ingredients.data ?? [])
        .filter((ingredient) => recipe === null || ingredient.prepRecipeId !== recipe.id)
        .map((ingredient) => ({ id: ingredient.id, label: ingredient.name, keywords: ingredient.aliases })),
    [ingredients.data, recipe],
  )

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )

  // Read by the key listener, which is set once.
  const tasteRef = useRef<() => void>(() => undefined)

  // Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z) during the session, unlimited; Ctrl+J as the button.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      // Ctrl+Z in a window above (the search of the help) is its own.
      if (document.querySelector('dialog[open]')) return
      const key = event.key.toLowerCase()
      if (key === 'j' && !event.shiftKey) {
        event.preventDefault()
        tasteRef.current()
      } else if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        dispatch({ type: 'undo' })
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        dispatch({ type: 'redo' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const change = (next: LabDraft) => {
    dispatch({ type: 'change', draft: next })
  }
  const changeLine = (key: string, patch: Partial<LabLine>) => {
    change({ ...draft, lines: draft.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) })
  }

  // A promise, not the callbacks of `mutate`: the saved version mounts the workbench again, and
  // callbacks of an unmounted one never run (the message and the tasting note were lost).
  function saveVersion(label: string, then?: (detail: RecipeDetail) => void) {
    if (!recipe) return
    leaving.current = true
    update
      .mutateAsync({
        id: recipe.id,
        data: cleanForSave(toInput(draft)),
        newVersion: true,
        label: label.trim() || null,
      })
      .then((detail) => {
        toast.show({ message: t.saved(detail.name, `v${detail.version}`) })
        setDialog(null)
        then?.(detail)
      }, notifyError)
      .finally(() => {
        leaving.current = false
      })
  }

  function saveAsNew(name: string, parent: string | null, then?: (detail: RecipeDetail) => void) {
    leaving.current = true
    create
      .mutateAsync({
        data: { ...cleanForSave(toInput(draft)), name: name.trim(), parentRecipeId: parent, status: 'draft' },
        label: null,
      })
      .then(
        (detail) => {
          toast.show({ message: parent ? t.variantCreated(detail.name) : t.created(detail.name) })
          setDialog(null)
          void navigate(`/lab/${detail.id}`, { replace: true })
          then?.(detail)
        },
        (error: unknown) => {
          leaving.current = false
          notifyError(error)
        },
      )
  }

  /** « Noter une dégustation » (section 10.5): the draft is saved first when it changed. */
  function tasteNow() {
    const open = (detail: RecipeDetail) => {
      openTasting(detail.id, detail.version)
    }
    if (!recipe) {
      // Without a name nothing can be saved: the note opens, the recipe to choose.
      if (draft.name.trim() !== '') saveAsNew(draft.name, null, open)
      else openTasting(null)
      return
    }
    if (dirty) saveVersion('', open)
    else open(recipe)
  }
  // After each render, as the listener reads it outside of one.
  useEffect(() => {
    tasteRef.current = tasteNow
  })

  const result = computation.data
  const before = saved.data
  const gauges = [
    {
      id: 'abv',
      label: tp.abv,
      unit: tp.units.abv,
      value: result?.abv.value ?? null,
      issues: result?.abv.issues ?? [],
      saved: before?.abv.value ?? null,
      zone: familyZones?.abv,
      decimals: 1,
    },
    {
      id: 'sugar',
      label: tp.sugar,
      unit: tp.units.per100,
      value: result?.sugarPer100Ml.value ?? null,
      issues: result?.sugarPer100Ml.issues ?? [],
      saved: before?.sugarPer100Ml.value ?? null,
      zone: familyZones?.sugar,
      decimals: 1,
    },
    {
      id: 'acid',
      label: tp.acid,
      unit: tp.units.per100,
      value: result?.acidPer100Ml.value ?? null,
      issues: result?.acidPer100Ml.issues ?? [],
      saved: before?.acidPer100Ml.value ?? null,
      zone: familyZones?.acid,
      decimals: 2,
    },
    {
      id: 'ratio',
      label: tp.ratio,
      unit: tp.units.ratio,
      value: result?.ratio.value ?? null,
      issues: result?.ratio.issues ?? [],
      saved: before?.ratio.value ?? null,
      zone: familyZones?.ratio,
      decimals: 0,
    },
  ] as const
  const shownGauges = gauges.filter((gauge) => gauge.value !== null)
  const emptyGauges = gauges.filter((gauge) => gauge.value === null)
  const missing = missingData(emptyGauges.flatMap((gauge) => gauge.issues))
  const firstMissing = missing.ingredientIds[0]

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 min-h-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-small text-fg-muted">{t.eyebrow(version)}</span>
          {recipe ? (
            <h1 className="m-0 truncate text-title font-semibold tracking-tight text-fg">{recipe.name}</h1>
          ) : (
            <Input
              label={t.name}
              hideLabel
              placeholder={t.name}
              value={draft.name}
              onChange={(event) => {
                change({ ...draft, name: event.target.value })
              }}
              className="w-80"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            variant="ghost"
            label={t.undo}
            icon={<Undo2 size={16} aria-hidden="true" />}
            disabled={state.past.length === 0}
            onClick={() => {
              dispatch({ type: 'undo' })
            }}
          />
          <IconButton
            variant="ghost"
            label={t.redo}
            icon={<Redo2 size={16} aria-hidden="true" />}
            disabled={state.future.length === 0}
            onClick={() => {
              dispatch({ type: 'redo' })
            }}
          />
          {recipe ? (
            <SegmentedControl<Mode>
              label={t.compare}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'work', label: t.title },
                { value: 'compare', label: t.compare },
              ]}
            />
          ) : null}
        </div>
      </header>

      {mode === 'compare' && recipe ? (
        <CompareView
          key={picking ? visitKey : 'versions'}
          recipe={recipe}
          draft={toInput(draft)}
          names={names}
          picking={picking}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-4">
          <Card aria-labelledby={linesId}>
            <SectionTitle id={linesId}>{t.lines}</SectionTitle>
            <ul className="@container m-0 flex list-none flex-col p-0">
              {draft.lines.length > 0 ? (
                <li aria-hidden="true" className={cn(LINE_GRID, 'pb-2')}>
                  <span className={CAPS}>{t.head.inGlass}</span>
                  <span className={CAPS}>{t.head.ingredient}</span>
                  <span className="hidden gap-2 @min-[36rem]:flex">
                    <span className={cn(CAPS, 'w-44')}>{t.head.dose}</span>
                    <span className={cn(CAPS, 'w-36')}>{t.head.unit}</span>
                  </span>
                </li>
              ) : null}
              {draft.lines.map((line) => {
                const name = names.get(line.ingredientId) ?? ''
                return (
                  <li key={line.key} className={cn(LINE_GRID, 'gap-y-2 border-t border-border py-2')}>
                    <Toggle
                      label={t.lineOn(name)}
                      hideLabel
                      checked={line.enabled}
                      onCheckedChange={(enabled) => {
                        changeLine(line.key, { enabled })
                      }}
                    />
                    <span
                      className={cn(
                        'min-w-0 text-body break-words transition-colors duration-150',
                        line.enabled ? 'text-fg' : 'text-fg-muted',
                      )}
                    >
                      {name}
                    </span>
                    {/* Under the name while the card is narrow, beside it once it fits. */}
                    <div
                      className={cn(
                        'col-span-full row-start-2 flex min-w-0 items-center gap-2 transition-opacity duration-150 @min-[36rem]:col-span-1 @min-[36rem]:col-start-3 @min-[36rem]:row-start-1',
                        !line.enabled && 'opacity-50',
                      )}
                    >
                      <DoseStepper
                        label={t.dose(name)}
                        hideLabel
                        value={line.quantity}
                        unit={fr.recipes.units[line.unit]}
                        step={stepFor(line.unit, { ml: stepMl, oz: stepOz })}
                        disabled={line.unit === 'top' || line.unit === 'to_taste'}
                        onChange={(quantity) => {
                          changeLine(line.key, { quantity })
                        }}
                        className="w-44 shrink-0"
                      />
                      <Select
                        label={t.unit(name)}
                        hideLabel
                        value={line.unit}
                        options={UNIT_VALUES.map((unit) => ({ value: unit, label: fr.recipes.units[unit] }))}
                        onChange={(event) => {
                          changeLine(line.key, { unit: event.target.value as LabLine['unit'] })
                        }}
                        className="min-w-0 flex-1 @min-[36rem]:w-36 @min-[36rem]:flex-none"
                      />
                    </div>
                    <IconButton
                      variant="ghost"
                      className="col-start-3 row-start-1 justify-self-end @min-[36rem]:col-start-4"
                      label={t.remove(name)}
                      icon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => {
                        change({ ...draft, lines: draft.lines.filter((other) => other.key !== line.key) })
                      }}
                    />
                  </li>
                )
              })}
            </ul>
            {draft.lines.length > 0 ? <p className="m-0 text-caption text-fg-muted">{t.offNote}</p> : null}
            <Combobox
              label={t.add}
              hideLabel
              placeholder={t.addPlaceholder}
              options={options}
              value={null}
              onSelect={(ingredientId) => {
                if (!ingredientId) return
                const added = toDraft({ ...emptyRecipe(), lines: [{ ...emptyLine(), ingredientId }] }).lines
                change({ ...draft, lines: [...draft.lines, ...added] })
              }}
            />
          </Card>

          <Card aria-labelledby={indicatorsId}>
            <SectionTitle id={indicatorsId}>{t.indicators}</SectionTitle>
            <div className="flex flex-col gap-4">
              {shownGauges.map((gauge) => (
                <div key={gauge.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-small text-fg-secondary">{gauge.label}</span>
                    <span className="nums text-lead font-medium text-fg">
                      {`${formatNumber(gauge.value ?? 0, gauge.decimals)} ${gauge.unit}`}
                    </span>
                  </div>
                  <RangeGauge
                    label={gauge.label}
                    value={gauge.value}
                    unit={gauge.unit}
                    decimals={gauge.decimals}
                    zone={
                      gauge.zone
                        ? { from: gauge.zone.from, to: gauge.zone.to, count: gauge.zone.recipeIds.length }
                        : undefined
                    }
                    saved={gauge.saved !== null && version ? { value: gauge.saved, version } : undefined}
                    showLegend
                  />
                  {gauge.zone ? (
                    <p
                      className="m-0 w-fit cursor-help text-caption text-fg-muted underline decoration-dotted"
                      title={t.zoneMembers(
                        gauge.zone.recipeIds
                          .slice(0, ZONE_MEMBERS_SHOWN)
                          .map((id) => recipeNames.get(id) ?? '')
                          .join(', '),
                        Math.max(0, gauge.zone.recipeIds.length - ZONE_MEMBERS_SHOWN),
                      )}
                    >
                      {t.zone(gauge.zone.recipeIds.length)}
                    </p>
                  ) : null}
                </div>
              ))}
              {/* The gauges still waiting for data: one explanation, not one empty gauge each. */}
              {emptyGauges.length > 0 ? (
                <div
                  className={cn(
                    'flex flex-col gap-1.5',
                    shownGauges.length > 0 && 'border-t border-border pt-3.5',
                  )}
                >
                  <span className="text-small text-fg-secondary">
                    {t.missingTitle(emptyGauges.map((gauge) => gauge.label))}
                  </span>
                  <p className="m-0 text-small text-fg-muted">
                    {firstMissing === undefined
                      ? t.missingDosesNote
                      : t.missingData(missing.words, missing.ingredientIds.length)}
                  </p>
                  {firstMissing === undefined ? null : (
                    <ArrowLink to={`/bar?ingredient=${firstMissing}`} className="w-fit">
                      {t.complete(missing.ingredientIds.length)}
                    </ArrowLink>
                  )}
                </div>
              ) : null}
            </div>
            <dl className="m-0 grid grid-cols-3 gap-3 border-t border-border pt-3">
              <Figure
                label={tp.volume}
                value={
                  result ? `${formatNumber(roundServedVolume(result.finalVolumeMl), 0)} ${tp.units.ml}` : null
                }
              />
              <Figure
                label={tp.dilution}
                value={result ? `${formatNumber(result.dilution * 100, 0)} ${tp.units.pct}` : null}
              />
              <Figure
                label={tp.cost}
                value={
                  result && result.costCents !== null && result.costStatus !== 'incomplete'
                    ? formatEuros(result.costCents)
                    : null
                }
              />
            </dl>
            {familyZones ? null : <p className="m-0 text-caption text-fg-muted">{t.noZone}</p>}
          </Card>
        </div>
      )}

      {/* Down to the edge of the window, over the bottom padding of the screen. */}
      <footer className="sticky -bottom-8 mt-auto -mb-8 flex flex-col gap-1 border-t border-border bg-bg-base py-1.5">
        {/* Why « Enregistrer comme nouvelle version » waits (D-057). */}
        {version && !dirty ? <p className="m-0 text-small text-fg-muted">{t.unchanged(version)}</p> : null}
        <div className="flex items-center gap-2">
          {recipe ? (
            <>
              <Button
                disabled={!dirty || update.isPending}
                onClick={() => {
                  setText('')
                  setDialog('version')
                }}
              >
                {t.saveVersion}
              </Button>
              <Button
                variant="outline"
                disabled={create.isPending}
                onClick={() => {
                  setText(fr.recipes.detail.variantDialog.defaultName(recipe.name))
                  setDialog('variant')
                }}
              >
                {t.saveVariant}
              </Button>
            </>
          ) : (
            <Button
              disabled={draft.name.trim() === '' || create.isPending}
              onClick={() => {
                saveAsNew(draft.name, null)
              }}
            >
              {t.saveNew}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={!dirty}
            onClick={() => {
              dispatch({ type: 'reset', draft: initial })
            }}
          >
            {t.discard}
          </Button>
          <Button
            variant="outline"
            disabled={(!recipe && draft.name.trim() === '') || update.isPending || create.isPending}
            icon={<NotebookPen size={14} aria-hidden="true" />}
            aria-keyshortcuts="Control+J"
            className="ml-auto"
            onClick={tasteNow}
          >
            {t.taste}
          </Button>
        </div>
      </footer>

      <Dialog
        open={dialog !== null}
        onClose={() => {
          setDialog(null)
        }}
        title={dialog === 'variant' ? t.saveVariant : t.saveVersion}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDialog(null)
              }}
            >
              {t.cancel}
            </Button>
            <Button
              disabled={dialog === 'variant' && text.trim() === ''}
              onClick={() => {
                if (dialog === 'variant') saveAsNew(text, recipe?.id ?? null)
                else saveVersion(text)
              }}
            >
              {t.confirm}
            </Button>
          </>
        }
      >
        <Input
          data-autofocus=""
          label={dialog === 'variant' ? t.variantName : t.versionLabel}
          description={dialog === 'variant' ? undefined : t.versionLabelHint}
          value={text}
          maxLength={120}
          onChange={(event) => {
            setText(event.target.value)
          }}
        />
      </Dialog>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title={fr.recipes.editor.leave.title}
        description={fr.recipes.editor.leave.description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" data-autofocus="" onClick={() => blocker.reset?.()}>
              {fr.recipes.editor.leave.stay}
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              {fr.recipes.editor.leave.leave}
            </Button>
          </>
        }
      />
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-fg-muted">{label}</dt>
      <dd className="nums m-0 text-lead font-medium text-fg">{value ?? <NoValue />}</dd>
    </div>
  )
}
