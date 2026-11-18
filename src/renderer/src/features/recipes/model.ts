/**
 * Conversions between what the main process returns and what the editor and the
 * calculations take. No business rule here: the calculations stay in core/ (recipes.compute).
 */
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

/** « 45 ml », « 2 traits », « à compléter, environ 60 ml », « dose à définir ». */
export function formatDose(line: Pick<RecipeLineValues, 'quantity' | 'unit' | 'topEstimateMl'>): string {
  if (line.unit === 'top') {
    return line.topEstimateMl === null ? t.units.top : t.doseTopEstimate(formatNumber(line.topEstimateMl))
  }
  if (line.unit === 'to_taste') return t.units.to_taste
  if (line.quantity === null) return t.doseMissing
  return t.dose(formatNumber(line.quantity), line.quantity, line.unit)
}
