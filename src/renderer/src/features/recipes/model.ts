/**
 * Conversions between what the main process returns and what the editor and the
 * calculations take. No business rule here: the calculations stay in core/ (recipes.compute).
 */
import { DEFAULT_EQUIVALENCES } from '@core/units'
import { fr } from '@renderer/i18n/fr'
import { formatNumber } from '@renderer/lib/format'
import type { RecipeDetail, RecipeInput, RecipeInputParsed } from '@shared/domain/catalog'

const t = fr.recipes

export type RecipeLineValues = RecipeInputParsed['lines'][number]

/** A blank recipe with every field present, so the form knows all of them from the start. */
export function emptyRecipe(): RecipeInputParsed {
  return {
    name: '',
    kind: 'cocktail',
    status: 'draft',
    origin: 'mine',
    credit: null,
    family: null,
    method: null,
    glassId: null,
    iceId: null,
    garnish: null,
    steps: [],
    notes: null,
    tags: [],
    dilutionOverridePct: null,
    parentRecipeId: null,
    yieldMl: null,
    shelfLifeDays: null,
    storageNotes: null,
    drinkLength: null,
    servingMoment: null,
    profile: null,
    garnishCostHtCents: null,
    prepCategoryId: null,
    lines: [],
  }
}

/** A new line: the ingredient is chosen next, the dose in millilitres by default. */
export function emptyLine(): RecipeLineValues {
  return {
    ingredientId: '',
    preferredProductId: null,
    quantity: null,
    unit: 'ml',
    topEstimateMl: null,
    isOptional: false,
    isGarnish: false,
    note: null,
  }
}

/** The editable part of a saved recipe. */
export function detailToInput(detail: RecipeDetail): RecipeInputParsed {
  return {
    name: detail.name,
    kind: detail.kind,
    status: detail.status,
    origin: detail.origin,
    credit: detail.credit,
    family: detail.family,
    method: detail.method,
    glassId: detail.glassId,
    iceId: detail.iceId,
    garnish: detail.garnish,
    steps: [...detail.steps],
    notes: detail.notes,
    tags: [...detail.tags],
    dilutionOverridePct: detail.dilutionOverridePct,
    parentRecipeId: detail.parentRecipeId,
    yieldMl: detail.yieldMl,
    shelfLifeDays: detail.shelfLifeDays,
    storageNotes: detail.storageNotes,
    drinkLength: detail.drinkLength,
    servingMoment: detail.servingMoment,
    profile: detail.profile,
    garnishCostHtCents: detail.garnishCostHtCents,
    prepCategoryId: detail.prepCategoryId,
    lines: detail.lines.map(({ id: _id, ...line }) => ({ ...line })),
  }
}

/** Steps typed one per line: blank ones are dropped before saving. */
export function cleanForSave(values: RecipeInputParsed): RecipeInputParsed {
  return {
    ...values,
    steps: values.steps.map((step) => step.trim()).filter((step) => step !== ''),
  }
}

/**
 * What the calculated panel needs from a draft: the lines with an ingredient and the fields
 * that change the result. The name is required by the schema, not by the calculation.
 */
export function computationInput(values: RecipeInput): RecipeInput | null {
  const lines = (values.lines ?? []).filter((line) => line.ingredientId !== '')
  if (lines.length === 0) return null
  return {
    name: values.name.trim() === '' ? t.editor.newTitle : values.name,
    kind: values.kind ?? 'cocktail',
    method: values.method ?? null,
    dilutionOverridePct: values.dilutionOverridePct ?? null,
    yieldMl: values.yieldMl ?? null,
    garnishCostHtCents: values.garnishCostHtCents ?? null,
    lines,
  }
}

export type DisplayUnit = 'ml' | 'cl' | 'oz'

const ML_PER: Record<DisplayUnit, number> = { ml: 1, cl: 10, oz: DEFAULT_EQUIVALENCES.ozMl }

/** An ounce reads in quarters, as long as that moves the dose by a tenth at most. */
const QUARTER_TOLERANCE = 0.1

/**
 * A volume in ml, cl or oz shown in the display unit chosen in the settings (section 10.15):
 * ml to one decimal, cl to two (22,5 ml is 2,25 cl), oz to the quarter when it stays true to
 * the dose, else to two decimals (2,5 ml is never 0 oz). The stored dose never changes.
 */
export function inDisplayUnit(
  quantity: number,
  unit: string,
  display: DisplayUnit,
): { quantity: number; unit: string } {
  if (!(unit in ML_PER) || unit === display) return { quantity, unit }
  const value = (quantity * ML_PER[unit as DisplayUnit]) / ML_PER[display]
  if (display === 'ml') return { quantity: Math.round(value * 10) / 10, unit: display }
  const quarter = Math.round(value * 4) / 4
  if (display === 'oz' && Math.abs(quarter - value) <= value * QUARTER_TOLERANCE) {
    return { quantity: quarter, unit: display }
  }
  return { quantity: Math.round(value * 100) / 100, unit: display }
}

/** « 45 ml », « 2 traits », « à compléter, environ 60 ml », « dose à définir ». */
export function formatDose(
  line: Pick<RecipeLineValues, 'quantity' | 'unit' | 'topEstimateMl'>,
  display: DisplayUnit = 'ml',
): string {
  if (line.unit === 'top') {
    if (line.topEstimateMl === null) return t.units.top
    const estimate = inDisplayUnit(line.topEstimateMl, 'ml', display)
    return t.doseTopEstimate(formatNumber(estimate.quantity), estimate.unit)
  }
  if (line.unit === 'to_taste') return t.units.to_taste
  if (line.quantity === null) return t.doseMissing
  const shown = inDisplayUnit(line.quantity, line.unit, display)
  return t.dose(formatNumber(shown.quantity), shown.quantity, shown.unit as typeof line.unit)
}
