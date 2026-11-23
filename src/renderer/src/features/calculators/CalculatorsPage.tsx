import {
  Calculator,
  Droplets,
  Euro,
  FileDown,
  FlaskConical,
  Plus,
  Printer,
  Repeat,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BATCH_STEPS_ML, type BatchHint } from '@core/batch'
import { salePrice, type PricingRules } from '@core/cost'
import { dilutionFor } from '@core/dilution'
import { APPROXIMATE_UNITS, lineVolumeMl } from '@core/units'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox } from '@renderer/components/Combobox'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { isManual, useBatch } from '@renderer/features/calculators/useBatch'
import { notifyError } from '@renderer/features/shared/notify'
import { detailToInput, formatDose } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import {
  useCalculation,
  useIngredients,
  useRecipe,
  useRecipeComputation,
  useRecipes,
  useSetting,
} from '@renderer/lib/queries'
import type { RecipeDetail } from '@shared/domain/catalog'
import {
  BATCH_HINTS,
  MANUAL_BATCH_ID,
  type BatchPrintOptions,
  type ManualBatch,
  type PrintTarget,
} from '@shared/print'

const t = fr.workshop.calculators

type Tab = 'batch' | 'abv' | 'convert' | 'cost'

/** Calculators (section 10.13): batch, ABV and dilution, unit conversion, cost. */
export function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>('batch')
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        <SegmentedControl
          label={t.title}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'batch', label: t.tabs.batch, icon: <FlaskConical size={14} aria-hidden="true" /> },
            { value: 'abv', label: t.tabs.abv, icon: <Droplets size={14} aria-hidden="true" /> },
            { value: 'convert', label: t.tabs.convert, icon: <Repeat size={14} aria-hidden="true" /> },
            { value: 'cost', label: t.tabs.cost, icon: <Euro size={14} aria-hidden="true" /> },
          ]}
        />
      </header>
      <div key={tab} className="animate-rise">
        {tab === 'batch' ? <BatchCalculator /> : null}
        {tab === 'abv' ? <AbvCalculator /> : null}
        {tab === 'convert' ? <ConvertCalculator /> : null}
        {tab === 'cost' ? <CostCalculator /> : null}
      </div>
    </div>
  )
}

/** Recipe picker shared by the calculators. */
function RecipePicker({ value, onSelect }: { value: string | null; onSelect: (id: string) => void }) {
  const recipes = useRecipes()
  const options = useMemo(
    () =>
      (recipes.data ?? [])
        .filter((recipe) => recipe.kind === 'cocktail')
        .map((recipe) => ({ id: recipe.id, label: recipe.name })),
    [recipes.data],
  )
  return (
    <Combobox
      label={t.fromRecipe}
      options={options}
      value={value}
      placeholder={t.recipePlaceholder}
      onSelect={onSelect}
    />
  )
}

function Result({
  label,
  value,
  unit,
  strong = false,
}: {
  label: string
  value: string
  unit?: string
  strong?: boolean
}) {
  return (
    // Side by side, their figures share a baseline whatever the length of their labels.
    <div className="flex flex-col justify-between gap-0.5 rounded-nested border border-border bg-surface-2 px-4 py-3">
      <span className="text-caption font-medium text-fg-muted">{label}</span>
      <span className="nums flex items-baseline gap-1">
        <span className={cn('font-light text-fg', strong ? 'text-metric text-copper' : 'text-title')}>
          {value}
        </span>
        {unit ? <span className="text-small text-fg-muted">{unit}</span> : null}
      </span>
    </div>
  )
}

function Panel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-4">
      <span className="flex size-9 items-center justify-center rounded-full bg-accent/14 text-accent">
        {icon}
      </span>
      {children}
    </Card>
  )
}

// ---------------------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------------------

type ManualLine = { key: number; label: string; ml: number | null; hint: BatchHint }

function BatchCalculator() {
  const [start, setStart] = useState<'recipe' | 'manual'>('recipe')
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const recipe = useRecipe(recipeId ?? undefined)
  const [name, setName] = useState('')
  const [lines, setLines] = useState<ManualLine[]>([{ key: 1, label: '', ml: null, hint: 'ok' }])
  const [dilution, setDilution] = useState<number | null>(20)
  // Only the complete lines make the batch; it is rebuilt when they change, not at each render.
  const manual = useMemo<ManualBatch | null>(() => {
    const complete = lines.flatMap((line) =>
      line.label.trim() !== '' && line.ml !== null && line.ml > 0
        ? [{ label: line.label.trim(), ml: line.ml, hint: line.hint }]
        : [],
    )
    return complete.length === 0
      ? null
      : { name: name.trim(), dilution: Math.min(Math.max(dilution ?? 0, 0), 100) / 100, lines: complete }
  }, [lines, name, dilution])

  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-4">
      <Panel icon={<FlaskConical size={16} aria-hidden="true" />}>
        <div className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="text-small font-medium text-fg-secondary">
            {t.batch.start}
          </span>
          <SegmentedControl
            label={t.batch.start}
            value={start}
            onChange={setStart}
            options={[
              { value: 'recipe', label: t.batch.starts.recipe },
              { value: 'manual', label: t.batch.starts.manual },
            ]}
          />
        </div>
        {start === 'recipe' ? (
          <RecipePicker value={recipeId} onSelect={setRecipeId} />
        ) : (
          <p className="m-0 text-small text-fg-secondary">{t.batch.manualHint}</p>
        )}
      </Panel>
      {start === 'recipe' ? (
        recipe.data ? (
          <BatchResult key={recipe.data.id} source={recipe.data} />
        ) : (
          <Card className="min-h-[200px] items-center justify-center text-small text-fg-secondary">
            {t.batch.empty}
          </Card>
        )
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <ManualBatchCard
            name={name}
            onName={setName}
            lines={lines}
            onLines={setLines}
            dilution={dilution}
            onDilution={setDilution}
          />
          {manual ? (
            <BatchResult key="manual" source={manual} />
          ) : (
            <Card className="min-h-[120px] items-center justify-center text-small text-fg-secondary">
              {t.batch.manualEmpty}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

const HINT_OPTIONS = BATCH_HINTS.map((hint) => ({ value: hint, label: t.batch.hints[hint] }))

/** The lines of a batch without a recipe: an ingredient, its dose for one drink, where it goes. */
function ManualBatchCard({
  name,
  onName,
  lines,
  onLines,
  dilution,
  onDilution,
}: {
  name: string
  onName: (name: string) => void
  lines: ManualLine[]
  onLines: (lines: ManualLine[]) => void
  dilution: number | null
  onDilution: (dilution: number | null) => void
}) {
  const change = (key: number, patch: Partial<ManualLine>) => {
    onLines(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }
  // One row once the card is wide enough; else the ingredient above, its dose and its place below.
  const columns =
    'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2 @min-[36rem]:grid-cols-[minmax(0,1fr)_8rem_11rem_2rem]'
  return (
    <Card aria-label={t.batch.manualTitle} className="gap-3">
      <h2 className="m-0 text-body font-semibold text-fg">{t.batch.manualTitle}</h2>
      <Input
        label={t.batch.name}
        placeholder={t.batch.defaultName}
        value={name}
        maxLength={80}
        autoComplete="off"
        onChange={(event) => {
          onName(event.target.value)
        }}
      />
      <div className="@container flex flex-col gap-2">
        <div
          aria-hidden="true"
          className={cn(columns, 'hidden text-small font-medium text-fg-secondary @min-[36rem]:grid')}
        >
          <span>{t.batch.ingredient}</span>
          <span>{t.batch.dosePerDrink}</span>
          <span>{t.batch.where}</span>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0 @min-[36rem]:gap-2">
          {lines.map((line, index) => (
            <li key={line.key} className={columns}>
              <Input
                label={t.batch.lineLabel(index + 1)}
                hideLabel
                placeholder={t.batch.ingredient}
                className="col-span-2 col-start-1 row-start-1 @min-[36rem]:col-span-1"
                value={line.label}
                maxLength={80}
                autoComplete="off"
                onChange={(event) => {
                  change(line.key, { label: event.target.value })
                }}
              />
              <NumberWithUnit
                label={t.batch.lineDose(index + 1)}
                hideLabel
                placeholder={t.batch.dosePerDrink}
                className="col-start-1 row-start-2 @min-[36rem]:col-start-2 @min-[36rem]:row-start-1"
                unit="ml"
                value={line.ml}
                min={0}
                max={10_000}
                step={5}
                onChange={(ml) => {
                  change(line.key, { ml })
                }}
              />
              <Select
                label={t.batch.lineWhere(index + 1)}
                hideLabel
                className="col-start-2 row-start-2 @min-[36rem]:col-start-3 @min-[36rem]:row-start-1"
                value={line.hint}
                options={HINT_OPTIONS}
                onChange={(event) => {
                  const hint = BATCH_HINTS.find((value) => value === event.target.value)
                  if (hint) change(line.key, { hint })
                }}
              />
              <IconButton
                variant="ghost"
                label={t.batch.removeLine(index + 1)}
                icon={<Trash2 size={14} aria-hidden="true" />}
                disabled={lines.length === 1}
                className="col-start-3 row-start-1 @min-[36rem]:col-start-4"
                onClick={() => {
                  onLines(lines.filter((other) => other.key !== line.key))
                }}
              />
            </li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-[auto_8rem] items-end justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={14} aria-hidden="true" />}
          disabled={lines.length >= 30}
          onClick={() => {
            onLines([
              ...lines,
              { key: Math.max(0, ...lines.map((l) => l.key)) + 1, label: '', ml: null, hint: 'ok' },
            ])
          }}
        >
          {t.batch.addLine}
        </Button>
        <NumberWithUnit
          label={t.batch.dilution}
          unit="%"
          value={dilution}
          min={0}
          max={100}
          step={5}
          onChange={onDilution}
        />
      </div>
    </Card>
  )
}

const BATCH_GROUPS: readonly BatchHint[] = ['ok', 'fresh', 'add_at_service']

function BatchResult({ source }: { source: RecipeDetail | ManualBatch }) {
  const [target, setTarget] = useState<BatchPrintOptions['target']>('servings')
  const [servings, setServings] = useState<number | null>(10)
  const [bottle, setBottle] = useState<number | null>(700)
  const [stepMl, setStepMl] = useState<number>(BATCH_STEPS_ML[0])
  const [water, setWater] = useState(
    !isManual(source) && (source.method === 'stir' || source.method === 'build'),
  )
  const [garnish, setGarnish] = useState(false)
  const [busy, setBusy] = useState(false)
  const amount = (target === 'servings' ? servings : bottle) ?? 0
  const options: BatchPrintOptions = { target, amount, stepMl, water, garnish }
  const { ready, result } = useBatch(source, options)

  async function send(to: PrintTarget) {
    setBusy(true)
    try {
      const { done } = await unwrap(
        window.shakery.export.batch(
          isManual(source)
            ? { id: MANUAL_BATCH_ID, to, ...options, manual: source }
            : { id: source.id, to, ...options },
        ),
      )
      if (done) toast.show({ message: to === 'pdf' ? t.batch.saved : t.batch.sent })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="gap-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
        <SegmentedControl
          label={t.batch.target}
          value={target}
          onChange={setTarget}
          options={[
            { value: 'servings', label: t.batch.byServings },
            { value: 'volume', label: t.batch.byVolume },
          ]}
        />
        {target === 'servings' ? (
          <NumberWithUnit
            key="servings"
            label={t.batch.servings}
            value={servings}
            onChange={setServings}
            min={1}
            max={500}
            step={1}
            decimals={0}
          />
        ) : (
          <NumberWithUnit
            key="volume"
            label={t.batch.targetVolume}
            unit="ml"
            value={bottle}
            onChange={setBottle}
            min={50}
            max={100_000}
            step={50}
            decimals={0}
          />
        )}
        <Select
          label={t.batch.step}
          value={String(stepMl)}
          options={BATCH_STEPS_ML.map((value) => ({ value: String(value), label: t.batch.stepValue(value) }))}
          onChange={(event) => {
            setStepMl(Number(event.target.value))
          }}
        />
      </div>
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-col gap-1">
          <Toggle label={t.batch.includeWater} checked={water} onCheckedChange={setWater} />
          <span className="text-caption text-fg-muted">{t.batch.waterHint}</span>
        </div>
        <Toggle label={t.batch.includeGarnish} checked={garnish} onCheckedChange={setGarnish} />
      </div>
      {result ? (
        <>
          {target === 'volume' ? (
            <p className="nums m-0 text-small text-fg-secondary">
              {t.batch.drinks(formatNumber(Math.round(result.servings * 10) / 10))}
            </p>
          ) : null}
          <table className="w-full table-fixed border-collapse text-body">
            <colgroup>
              <col />
              <col className="w-[110px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-left text-caption text-fg-muted">
                <th className="py-1.5 font-medium">{t.batch.ingredient}</th>
                <th className="py-1.5 text-right font-medium">{t.batch.quantity}</th>
                <th className="py-1.5 text-right font-medium">{t.batch.volume}</th>
              </tr>
            </thead>
            {BATCH_GROUPS.map((hint) => {
              const lines = result.lines.filter((line) => line.hint === hint)
              const addsWater = hint === 'ok' && result.waterMl > 0
              if (lines.length === 0 && !addsWater) return null
              return (
                <tbody key={hint}>
                  <tr>
                    <th scope="rowgroup" colSpan={3} className="pt-4 pb-1.5 text-left">
                      <span className="block text-caption font-semibold text-accent-soft">
                        {t.batch.hints[hint]}
                      </span>
                      {hint === 'fresh' ? (
                        <span className="block text-caption font-normal text-fg-secondary">
                          {t.batch.freshWarning}
                        </span>
                      ) : null}
                    </th>
                  </tr>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="py-2 break-words text-fg">
                        {line.label}
                        {line.isGarnish ? (
                          <span className="text-caption text-fg-muted">{` · ${t.batch.garnish}`}</span>
                        ) : null}
                        {line.isOptional ? (
                          <span className="text-caption text-fg-muted">{` · ${t.batch.optional}`}</span>
                        ) : null}
                      </td>
                      <td className="nums py-2 text-right text-fg-secondary">
                        {line.quantity === null
                          ? '–'
                          : formatDose({ quantity: line.quantity, unit: line.unit, topEstimateMl: null })}
                      </td>
                      <td className="nums py-2 text-right text-fg">
                        {line.ml === null ? '–' : `${formatNumber(line.ml)} ml`}
                      </td>
                    </tr>
                  ))}
                  {addsWater ? (
                    <tr className="border-t border-border">
                      <td className="py-2 text-fg">{t.batch.water}</td>
                      <td />
                      <td className="nums py-2 text-right text-fg">{`${formatNumber(result.waterMl)} ml`}</td>
                    </tr>
                  ) : null}
                </tbody>
              )
            })}
          </table>
          <div className="grid grid-cols-3 gap-3">
            <Result label={t.batch.bottle} value={formatNumber(result.bottleMl)} unit="ml" strong />
            <Result label={t.batch.fresh} value={formatNumber(result.freshMl)} unit="ml" />
            <Result label={t.batch.service} value={formatNumber(result.serviceMl)} unit="ml" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<FileDown size={16} aria-hidden="true" />}
              disabled={busy}
              onClick={() => void send('pdf')}
            >
              {t.batch.savePdf}
            </Button>
            <Button
              variant="outline"
              icon={<Printer size={16} aria-hidden="true" />}
              disabled={busy}
              onClick={() => void send('printer')}
            >
              {t.batch.print}
            </Button>
          </div>
        </>
      ) : ready && amount > 0 ? (
        <p className="m-0 text-small text-fg-secondary">{t.batch.nothingKeeps}</p>
      ) : null}
    </Card>
  )
}

// ---------------------------------------------------------------------------------------
// ABV and dilution
// ---------------------------------------------------------------------------------------

type AbvLine = { key: number; volume: number | null; abv: number | null }

function AbvCalculator() {
  const { equivalences, dilution: rates } = useCalculation()
  const [lines, setLines] = useState<AbvLine[]>([
    { key: 1, volume: 30, abv: 40 },
    { key: 2, volume: 30, abv: 25 },
    { key: 3, volume: 30, abv: 15 },
  ])
  const [dilution, setDilution] = useState<number | null>(20)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const recipe = useRecipe(recipeId ?? undefined)
  const ingredients = useIngredients()
  const [loaded, setLoaded] = useState<string | null>(null)

  // Lines of a recipe, once: volumes and the ABV of each ingredient, then free to adjust.
  if (recipe.data && ingredients.data && loaded !== recipe.data.id) {
    const byId = new Map(ingredients.data.map((ingredient) => [ingredient.id, ingredient]))
    setLoaded(recipe.data.id)
    setLines(
      recipe.data.lines
        .filter((line) => !line.isGarnish && !line.isOptional)
        .map((line, index) => {
          const ingredient = byId.get(line.ingredientId)
          const volume = lineVolumeMl(line, equivalences, ingredient?.densityGPerMl ?? null)
          return {
            key: index + 1,
            volume: volume.ok ? volume.ml : null,
            // Unknown stays empty: it is not alcohol free.
            abv: ingredient?.defaultAbv ?? null,
          }
        }),
    )
    setDilution(Math.round(dilutionFor(recipe.data, rates) * 100))
  }

  const v0 = lines.reduce((sum, line) => sum + (line.volume ?? 0), 0)
  const alcohol = lines.reduce((sum, line) => sum + ((line.volume ?? 0) * (line.abv ?? 0)) / 100, 0)
  const d = (dilution ?? 0) / 100
  const known = v0 > 0 && lines.every((line) => (line.volume ?? 0) === 0 || line.abv !== null)
  const before = known ? (alcohol / v0) * 100 : null
  const after = known ? (alcohol / (v0 * (1 + d))) * 100 : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4">
      <Panel icon={<Droplets size={16} aria-hidden="true" />}>
        <RecipePicker value={recipeId} onSelect={setRecipeId} />
        <p className="-mt-2 m-0 text-caption text-fg-muted">{t.abv.fromRecipeHint}</p>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {lines.map((line, index) => (
            <li key={line.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <NumberWithUnit
                label={`${t.abv.volume} ${String(index + 1)}`}
                value={line.volume}
                unit="ml"
                min={0}
                max={5000}
                step={5}
                onChange={(volume) => {
                  setLines(lines.map((other) => (other.key === line.key ? { ...other, volume } : other)))
                }}
              />
              <NumberWithUnit
                label={`${t.abv.lineAbv} ${String(index + 1)}`}
                value={line.abv}
                unit="% vol"
                min={0}
                max={100}
                step={0.5}
                onChange={(abv) => {
                  setLines(lines.map((other) => (other.key === line.key ? { ...other, abv } : other)))
                }}
              />
              <IconButton
                variant="ghost"
                label={t.abv.removeLine(index + 1)}
                icon={<Trash2 size={14} aria-hidden="true" />}
                disabled={lines.length === 1}
                onClick={() => {
                  setLines(lines.filter((other) => other.key !== line.key))
                }}
              />
            </li>
          ))}
        </ol>
        <div className="flex items-end justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={14} aria-hidden="true" />}
            onClick={() => {
              setLines([
                ...lines,
                { key: Math.max(0, ...lines.map((l) => l.key)) + 1, volume: null, abv: null },
              ])
            }}
          >
            {t.abv.addLine}
          </Button>
          <NumberWithUnit
            label={t.abv.dilution}
            className="w-[140px]"
            value={dilution}
            unit="%"
            min={0}
            max={100}
            step={5}
            onChange={setDilution}
          />
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <Result
          label={t.abv.after}
          value={after === null ? '–' : formatNumber(after, 1)}
          unit="% vol"
          strong
        />
        <Result label={t.abv.before} value={before === null ? '–' : formatNumber(before, 1)} unit="% vol" />
        <Result label={t.abv.served} value={formatNumber(Math.round(v0 * (1 + d)))} unit="ml" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------------------

const CONVERTIBLE = ['ml', 'cl', 'oz', 'dash', 'drop', 'barspoon', 'tsp'] as const
type Convertible = (typeof CONVERTIBLE)[number]

function ConvertCalculator() {
  const { equivalences } = useCalculation()
  const [value, setValue] = useState<number | null>(1)
  const [unit, setUnit] = useState<Convertible>('oz')
  const measured = lineVolumeMl({ quantity: value, unit, topEstimateMl: null }, equivalences)
  const ml = measured.ok ? measured.ml : null
  const per = (target: Convertible) =>
    lineVolumeMl({ quantity: 1, unit: target, topEstimateMl: null }, equivalences)
  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-4">
      <Panel icon={<Repeat size={16} aria-hidden="true" />}>
        <NumberWithUnit
          label={t.convert.value}
          value={value}
          onChange={setValue}
          min={0}
          max={100_000}
          step={0.25}
        />
        <Select
          label={t.convert.unit}
          value={unit}
          options={CONVERTIBLE.map((option) => ({ value: option, label: fr.recipes.units[option] }))}
          onChange={(event) => {
            setUnit(event.target.value as Convertible)
          }}
        />
      </Panel>
      <div className="grid grid-cols-3 gap-3">
        {CONVERTIBLE.filter((target) => target !== unit).map((target) => {
          const one = per(target)
          const converted = ml === null || !one.ok ? null : ml / one.ml
          return (
            <Result
              key={target}
              label={
                APPROXIMATE_UNITS.has(target)
                  ? `${fr.recipes.units[target]} · ${t.convert.approx}`
                  : fr.recipes.units[target]
              }
              value={converted === null ? '–' : formatNumber(converted, converted < 10 ? 2 : 1)}
            />
          )
        })}
        <p className="col-span-3 m-0 text-caption text-fg-muted w-fit rounded-md bg-bg-base/90 px-2 py-1">
          {`1 oz = ${formatNumber(equivalences.ozMl)} ml · 1 ${fr.recipes.units.dash} = ${formatNumber(equivalences.dashMl, 2)} ml · 1 ${fr.recipes.units.barspoon} = ${formatNumber(equivalences.barspoonMl)} ml`}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------------------

function CostCalculator() {
  const [price, setPrice] = useState<number | null>(25)
  const [bottle, setBottle] = useState<number | null>(700)
  const [dose, setDose] = useState<number | null>(40)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const recipe = useRecipe(recipeId ?? undefined)
  const computation = useRecipeComputation(recipe.data ? detailToInput(recipe.data) : null)
  const perMl = price !== null && bottle !== null && bottle > 0 ? (price * 100) / bottle : null
  const cost = computation.data
  const rules: PricingRules = {
    multiplier: useSetting('pricing.multiplier'),
    vatRateBp: useSetting('pricing.vatRateBp'),
    roundingStepCents: useSetting('pricing.menuRoundingStepCents'),
    rounding: useSetting('pricing.menuRounding'),
  }
  const vat = rules.vatRateBp / 10_000
  const costHt =
    cost?.costCents === null || cost?.costCents === undefined
      ? null
      : cost.costBasis === 'ttc'
        ? cost.costCents / (1 + vat)
        : cost.costCents
  const sale = costHt === null ? null : salePrice(costHt, rules)

  return (
    <div className="grid grid-cols-2 items-start gap-4">
      <Panel icon={<Calculator size={16} aria-hidden="true" />}>
        <div className="grid grid-cols-3 gap-3">
          <NumberWithUnit
            label={t.cost.price}
            value={price}
            onChange={setPrice}
            unit="€"
            min={0}
            max={10_000}
            step={0.5}
            decimals={2}
          />
          <NumberWithUnit
            label={t.cost.bottleVolume}
            value={bottle}
            onChange={setBottle}
            unit="ml"
            min={1}
            max={100_000}
            step={50}
          />
          <NumberWithUnit
            label={t.cost.dose}
            value={dose}
            onChange={setDose}
            unit="ml"
            min={0}
            max={1000}
            step={5}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Result
            label={t.cost.perDose}
            value={perMl === null || dose === null ? '–' : formatNumber((perMl * dose) / 100, 2)}
            unit="€"
            strong
          />
          <Result
            label={t.cost.perLitre}
            value={perMl === null ? '–' : formatNumber((perMl * 1000) / 100, 2)}
            unit="€"
          />
        </div>
      </Panel>
      <Panel icon={<Euro size={16} aria-hidden="true" />}>
        <RecipePicker value={recipeId} onSelect={setRecipeId} />
        {recipe.data ? (
          costHt === null || !sale ? (
            <p className="m-0 text-small text-fg-secondary">{t.cost.incomplete}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Result label={t.cost.recipeCost} value={formatNumber(costHt / 100, 2)} unit="€ HT" />
                <Result
                  label={t.cost.salePrice}
                  value={formatNumber(sale.menuTtcCents / 100, 2)}
                  unit="€"
                  strong
                />
                <Result label={t.cost.ratio} value={formatNumber(sale.costRatioPct, 1)} unit="%" />
              </div>
              <p className="m-0 text-caption text-fg-muted">
                {t.cost.rules(formatNumber(rules.multiplier), formatNumber(rules.vatRateBp / 100))}
              </p>
            </>
          )
        ) : null}
      </Panel>
    </div>
  )
}
