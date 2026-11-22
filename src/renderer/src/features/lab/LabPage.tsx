import { NotebookPen, Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox, type ComboboxOption } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { DoseStepper } from '@renderer/components/DoseStepper'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { RangeGauge } from '@renderer/components/RangeGauge'
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
import { formatNumber, formatEuros } from '@renderer/lib/format'
import {
  useCreateRecipe,
  useIngredients,
  useRecipe,
  useRecipeComputation,
  useRecipes,
  useReferenceZones,
  useUpdateRecipe,
} from '@renderer/lib/queries'
import { UNIT_VALUES, type RecipeDetail } from '@shared/domain/catalog'

/** A family counts up to some 2 500 classics: the tooltip names the first ones. */
const ZONE_MEMBERS_SHOWN = 30

const t = fr.recipes.lab
const tp = fr.recipes.panel

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
      <Card className="gap-0 p-1.5">
        {rows.length === 0 ? <p className="m-0 p-3 text-small text-fg-muted">{t.noRecipe}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => void navigate(`/lab/${recipe.id}`)}
                className="flex h-8 w-full cursor-pointer items-center justify-between rounded-field px-2.5 text-left text-body text-fg-secondary hover:bg-surface-2 hover:text-fg"
              >
                <span className="truncate">{recipe.name}</span>
                <span className="nums text-caption text-fg-muted">{`v${recipe.version}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
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
  const [mode, setMode] = useState<Mode>('work')
  const [dialog, setDialog] = useState<'version' | 'variant' | null>(null)
  const [text, setText] = useState('')
  const leaving = useRef(false)
  const draft = state.present
  const dirty = !sameRecipe(draft, initial)

  const computation = useRecipeComputation(computationInput(toInput(draft)))
  const saved = useRecipeComputation(recipe ? computationInput(detailToInput(recipe)) : null)
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

  // Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z) during the session, unlimited.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
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

  function saveVersion(label: string, then?: (detail: RecipeDetail) => void) {
    if (!recipe) return
    leaving.current = true
    update.mutate(
      { id: recipe.id, data: cleanForSave(toInput(draft)), newVersion: true, label: label.trim() || null },
      {
        onSuccess: (detail) => {
          toast.show({ message: t.saved(detail.name, `v${detail.version}`) })
          setDialog(null)
          then?.(detail)
        },
        onError: notifyError,
        onSettled: () => {
          leaving.current = false
        },
      },
    )
  }

  function saveAsNew(name: string, parent: string | null, then?: (detail: RecipeDetail) => void) {
    leaving.current = true
    create.mutate(
      {
        data: { ...cleanForSave(toInput(draft)), name: name.trim(), parentRecipeId: parent, status: 'draft' },
        label: null,
      },
      {
        onSuccess: (detail) => {
          toast.show({ message: parent ? t.variantCreated(detail.name) : t.created(detail.name) })
          setDialog(null)
          void navigate(`/lab/${detail.id}`, { replace: true })
          then?.(detail)
        },
        onError: (error) => {
          leaving.current = false
          notifyError(error)
        },
      },
    )
  }

  /** « Noter une dégustation » (section 10.5): the draft is saved first when it changed. */
  function tasteNow() {
    const open = (detail: RecipeDetail) => {
      openTasting(detail.id, detail.version)
    }
    if (!recipe) {
      if (draft.name.trim() !== '') saveAsNew(draft.name, null, open)
      return
    }
    if (dirty) saveVersion('', open)
    else open(recipe)
  }

  const result = computation.data
  const before = saved.data
  const gauges = [
    {
      id: 'abv',
      label: tp.abv,
      unit: tp.units.abv,
      value: result?.abv.value ?? null,
      saved: before?.abv.value ?? null,
      zone: familyZones?.abv,
      decimals: 1,
    },
    {
      id: 'sugar',
      label: tp.sugar,
      unit: tp.units.per100,
      value: result?.sugarPer100Ml.value ?? null,
      saved: before?.sugarPer100Ml.value ?? null,
      zone: familyZones?.sugar,
      decimals: 1,
    },
    {
      id: 'acid',
      label: tp.acid,
      unit: tp.units.per100,
      value: result?.acidPer100Ml.value ?? null,
      saved: before?.acidPer100Ml.value ?? null,
      zone: familyZones?.acid,
      decimals: 2,
    },
    {
      id: 'ratio',
      label: tp.ratio,
      unit: tp.units.ratio,
      value: result?.ratio.value ?? null,
      saved: before?.ratio.value ?? null,
      zone: familyZones?.ratio,
      decimals: 0,
    },
  ] as const

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
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
        <CompareView recipe={recipe} draft={toInput(draft)} names={names} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-4">
          <Card aria-label={t.lines}>
            <h2 className="m-0 text-body font-semibold text-fg">{t.lines}</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {draft.lines.map((line) => {
                const name = names.get(line.ingredientId) ?? ''
                return (
                  <li
                    key={line.key}
                    className={`flex flex-wrap items-center gap-2 rounded-nested border border-border px-2 py-1.5 ${line.enabled ? 'bg-surface-2/50' : 'opacity-50'}`}
                  >
                    <Toggle
                      label={t.lineOn(name)}
                      hideLabel
                      checked={line.enabled}
                      onCheckedChange={(enabled) => {
                        changeLine(line.key, { enabled })
                      }}
                    />
                    <span className="min-w-36 flex-1 text-body text-fg">{name}</span>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <DoseStepper
                        label={t.dose(name)}
                        hideLabel
                        value={line.quantity}
                        unit={fr.recipes.units[line.unit]}
                        step={stepFor(line.unit)}
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
                        className="w-28 shrink-0"
                      />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        label={t.remove(name)}
                        icon={<Trash2 size={14} aria-hidden="true" />}
                        onClick={() => {
                          change({ ...draft, lines: draft.lines.filter((other) => other.key !== line.key) })
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
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
            {draft.lines.some((line) => !line.enabled) ? (
              <p className="m-0 text-caption text-fg-muted">{t.offNote}</p>
            ) : null}
          </Card>

          <Card aria-label={t.indicators}>
            <h2 className="m-0 text-body font-semibold text-fg">{t.indicators}</h2>
            <div className="flex flex-col gap-4">
              {gauges.map((gauge) => (
                <div key={gauge.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-small text-fg-secondary">{gauge.label}</span>
                    <span className="nums text-lead font-medium text-fg">
                      {gauge.value === null ? (
                        <span className="text-small font-normal text-fg-muted">{tp.incomplete}</span>
                      ) : (
                        `${formatNumber(gauge.value, gauge.decimals)} ${gauge.unit}`
                      )}
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
                    showLegend={gauge.value !== null}
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
            </div>
            <dl className="m-0 grid grid-cols-3 gap-3 border-t border-border pt-3">
              <Figure
                label={tp.volume}
                value={result ? `${formatNumber(result.finalVolumeMl, 0)} ${tp.units.ml}` : '–'}
              />
              <Figure
                label={tp.dilution}
                value={result ? `${formatNumber(result.dilution * 100, 0)} ${tp.units.pct}` : '–'}
              />
              <Figure
                label={tp.cost}
                value={
                  result && result.costCents !== null && result.costStatus !== 'incomplete'
                    ? formatEuros(result.costCents)
                    : '–'
                }
              />
            </dl>
            {familyZones ? null : <p className="m-0 text-caption text-fg-muted">{t.noZone}</p>}
          </Card>
        </div>
      )}

      <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-bg-base py-3">
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-fg-muted">{label}</dt>
      <dd className="nums m-0 text-lead font-medium text-fg">{value}</dd>
    </div>
  )
}
