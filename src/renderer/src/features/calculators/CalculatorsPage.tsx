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
import { DEFAULT_PRICING, salePrice } from '@core/cost'
import { dilutionFor } from '@core/dilution'
import { APPROXIMATE_UNITS, DEFAULT_EQUIVALENCES, lineVolumeMl } from '@core/units'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox } from '@renderer/components/Combobox'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { useBatch } from '@renderer/features/calculators/useBatch'
import { notifyError } from '@renderer/features/shared/notify'
import { detailToInput, formatDose } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import { useIngredients, useRecipe, useRecipeComputation, useRecipes } from '@renderer/lib/queries'
import type { RecipeDetail } from '@shared/domain/catalog'
import type { BatchPrintOptions, PrintTarget } from '@shared/print'

const t = fr.workshop.calculators

type Tab = 'batch' | 'abv' | 'convert' | 'cost'

/** Calculators (section 10.13): batch, ABV and dilution, unit conversion, cost. */
export function CalculatorsPage() {
  const [tab, setTab] = useState<Tab>('batch')
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
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
    <div className="flex flex-col gap-0.5 rounded-nested border border-border bg-surface-2 px-4 py-3">
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

function BatchCalculator() {
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const recipe = useRecipe(recipeId ?? undefined)
  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-4">
      <Panel icon={<FlaskConical size={16} aria-hidden="true" />}>
        <RecipePicker value={recipeId} onSelect={setRecipeId} />
      </Panel>
      {recipe.data ? (
        <BatchResult key={recipe.data.id} recipe={recipe.data} />
      ) : (
        <Card className="min-h-[200px] items-center justify-center text-small text-fg-secondary">
          {t.batch.empty}
        </Card>
      )}
    </div>
  )
}

const BATCH_GROUPS: readonly BatchHint[] = ['ok', 'fresh', 'add_at_service']

function BatchResult({ recipe }: { recipe: RecipeDetail }) {
  const [target, setTarget] = useState<BatchPrintOptions['target']>('servings')
  const [servings, setServings] = useState<number | null>(10)
  const [bottle, setBottle] = useState<number | null>(700)
  const [stepMl, setStepMl] = useState<number>(BATCH_STEPS_ML[0])
  const [water, setWater] = useState(recipe.method === 'stir' || recipe.method === 'build')
  const [garnish, setGarnish] = useState(false)
  const [busy, setBusy] = useState(false)
  const amount = (target === 'servings' ? servings : bottle) ?? 0
  const options: BatchPrintOptions = { target, amount, stepMl, water, garnish }
  const { ready, result } = useBatch(recipe, options)

  async function send(to: PrintTarget) {
    setBusy(true)
    try {
      const { done } = await unwrap(window.shakery.export.batch({ id: recipe.id, to, ...options }))
      if (done) toast.show({ message: to === 'pdf' ? t.batch.saved : t.batch.sent })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-end gap-4">
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
            className="w-[160px]"
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
            className="w-[160px]"
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
          className="w-[150px]"
          value={String(stepMl)}
          options={BATCH_STEPS_ML.map((value) => ({ value: String(value), label: t.batch.stepValue(value) }))}
          onChange={(event) => {
            setStepMl(Number(event.target.value))
          }}
        />
      </div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
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
    const abvOf = new Map(ingredients.data.map((ingredient) => [ingredient.id, ingredient.defaultAbv]))
    setLoaded(recipe.data.id)
    setLines(
      recipe.data.lines
        .filter((line) => !line.isGarnish && !line.isOptional)
        .map((line, index) => {
          const volume = lineVolumeMl(line)
          return {
            key: index + 1,
            volume: volume.ok ? volume.ml : null,
            abv: abvOf.get(line.ingredientId) ?? 0,
          }
        }),
    )
    setDilution(Math.round(dilutionFor(recipe.data) * 100))
  }

  const v0 = lines.reduce((sum, line) => sum + (line.volume ?? 0), 0)
  const alcohol = lines.reduce((sum, line) => sum + ((line.volume ?? 0) * (line.abv ?? 0)) / 100, 0)
  const d = (dilution ?? 0) / 100
  const before = v0 > 0 ? (alcohol / v0) * 100 : null
  const after = v0 > 0 ? (alcohol / (v0 * (1 + d))) * 100 : null

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
  const [value, setValue] = useState<number | null>(1)
  const [unit, setUnit] = useState<Convertible>('oz')
  const measured = lineVolumeMl({ quantity: value, unit, topEstimateMl: null })
  const ml = measured.ok ? measured.ml : null
  const per = (target: Convertible) => lineVolumeMl({ quantity: 1, unit: target, topEstimateMl: null })
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
        <p className="col-span-3 m-0 text-caption text-fg-muted">
          {`1 oz = ${formatNumber(DEFAULT_EQUIVALENCES.ozMl)} ml · 1 ${fr.recipes.units.dash} = ${formatNumber(DEFAULT_EQUIVALENCES.dashMl, 2)} ml · 1 ${fr.recipes.units.barspoon} = ${formatNumber(DEFAULT_EQUIVALENCES.barspoonMl)} ml`}
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
  const vat = DEFAULT_PRICING.vatRateBp / 10_000
  const costHt =
    cost?.costCents === null || cost?.costCents === undefined
      ? null
      : cost.costBasis === 'ttc'
        ? cost.costCents / (1 + vat)
        : cost.costCents
  const sale = costHt === null ? null : salePrice(costHt)

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
                {t.cost.rules(
                  formatNumber(DEFAULT_PRICING.multiplier),
                  formatNumber(DEFAULT_PRICING.vatRateBp / 100),
                )}
              </p>
            </>
          )
        ) : null}
      </Panel>
    </div>
  )
}
