/**
 * Composition of a recipe (section 8, « Degré estimé » and « Équilibre sucre et acidité »):
 * volume, alcohol, sugar and acid, recursive through homemade preparations.
 *
 * For each enabled, non-optional, non-garnish volumetric line (grams count through the
 * ingredient's density, D-031), the value used is the preferred
 * bottle's, else the ingredient's, else the one computed from the preparation's recipe.
 * V0 = Σ vᵢ ; A = Σ vᵢ·aᵢ/100 ; Vf = V0·(1+d) ; ABVf = A/Vf·100 ;
 * S = Σ vᵢ·sᵢ/1000 ; C = Σ vᵢ·cᵢ/1000 ; sugar and acid in g per 100 ml of the served drink.
 * A preparation is computed the same way, without dilution, divided by its yield when set.
 */
import { dilutionFor, DEFAULT_DILUTION, type DilutionRates } from './dilution'
import type { Completeness, FactsResolver, Issue, IssueReason, LineInput, RecipeInput } from './model'
import { worst } from './model'
import { DEFAULT_EQUIVALENCES, lineVolumeMl, type UnitEquivalences } from './units'

export type CompositionContext = {
  readonly resolver: FactsResolver
  readonly equivalences?: UnitEquivalences
  readonly dilution?: DilutionRates
}

export type Metric = {
  readonly value: number | null
  readonly status: Completeness
  readonly issues: readonly Issue[]
}

export type Composition = {
  /** Sum of the counted volumes, before dilution. */
  readonly initialVolumeMl: number
  readonly dilution: number
  readonly finalVolumeMl: number
  /** A line in dash, drop, barspoon, tsp or top: the volume is an approximation. */
  readonly approximate: boolean
  /** % vol of the served drink (or of the preparation). */
  readonly abv: Metric
  /** g per 100 ml of the served drink. */
  readonly sugarPer100Ml: Metric
  readonly acidPer100Ml: Metric
  /** Sugar to acid ratio S / C. */
  readonly ratio: Metric
}

/** Per litre facts of an ingredient or a preparation, as one line sees them. */
type Facts = {
  readonly abv: number | null
  readonly sugarGPerL: number | null
  readonly acidGPerL: number | null
  readonly abvStatus: Completeness
  readonly sugarStatus: Completeness
  readonly acidStatus: Completeness
}

type Accumulator = { total: number; status: Completeness; issues: Issue[] }

function acc(): Accumulator {
  return { total: 0, status: 'complete', issues: [] }
}

function add(
  target: Accumulator,
  line: LineInput,
  volume: number,
  value: number | null,
  status: Completeness,
  missing: IssueReason,
  divisor: number,
): void {
  if (value === null || status === 'incomplete') {
    target.status = 'incomplete'
    target.issues.push({ lineId: line.id, reason: missing, ingredientId: line.ingredientId })
    return
  }
  target.total += (volume * value) / divisor
  target.status = worst(target.status, status)
}

/** Lines that take part in the volume: enabled, not optional, not a garnish. */
export function countedLines(recipe: RecipeInput): LineInput[] {
  return recipe.lines.filter((line) => line.enabled !== false && !line.isOptional && !line.isGarnish)
}

export function computeComposition(recipe: RecipeInput, context: CompositionContext): Composition {
  return compose(recipe, context, new Set([recipe.id]), new Map())
}

function compose(
  recipe: RecipeInput,
  context: CompositionContext,
  visiting: Set<string>,
  cache: Map<string, Facts>,
): Composition {
  const eq = context.equivalences ?? DEFAULT_EQUIVALENCES
  const alcohol = acc()
  const sugar = acc()
  const acid = acc()
  const volumeIssues: Issue[] = []
  let volume = 0
  let approximate = false

  for (const line of countedLines(recipe)) {
    const density = context.resolver.ingredient(line.ingredientId)?.densityGPerMl ?? null
    const measured = lineVolumeMl(line, eq, density)
    if (!measured.ok) {
      if (measured.reason === 'not_volumetric') continue
      volumeIssues.push({ lineId: line.id, reason: measured.reason, ingredientId: line.ingredientId })
      continue
    }
    volume += measured.ml
    approximate ||= measured.approximate

    const facts = lineFacts(line, context, visiting, cache)
    if (facts === 'unknown' || facts === 'cycle') {
      const reason: IssueReason = facts === 'cycle' ? 'cycle' : 'unknown_ingredient'
      for (const target of [alcohol, sugar, acid]) {
        target.status = 'incomplete'
        target.issues.push({ lineId: line.id, reason, ingredientId: line.ingredientId })
      }
      continue
    }
    add(alcohol, line, measured.ml, facts.abv, facts.abvStatus, 'missing_abv', 100)
    add(sugar, line, measured.ml, facts.sugarGPerL, facts.sugarStatus, 'missing_sugar', 1000)
    add(acid, line, measured.ml, facts.acidGPerL, facts.acidStatus, 'missing_acid', 1000)
  }

  const dilution = dilutionFor(recipe, context.dilution ?? DEFAULT_DILUTION)
  const finalVolume = volume * (1 + dilution)
  // A preparation is expressed per its yield when known (section 8).
  const denominator = recipe.kind === 'prep' && recipe.yieldMl !== null ? recipe.yieldMl : finalVolume

  const metric = (a: Accumulator, scale: number): Metric => {
    const issues = [...volumeIssues, ...a.issues]
    const status: Completeness = volumeIssues.length > 0 ? 'incomplete' : a.status
    const value = status === 'incomplete' || denominator <= 0 ? null : (a.total / denominator) * scale
    return { value, status: value === null ? 'incomplete' : status, issues }
  }

  const sugarMetric = metric(sugar, 100)
  const acidMetric = metric(acid, 100)
  const ratioStatus = worst(sugarMetric.status, acidMetric.status)
  const ratio: Metric =
    sugarMetric.value !== null && acidMetric.value !== null && acidMetric.value > 0
      ? { value: sugarMetric.value / acidMetric.value, status: ratioStatus, issues: [] }
      : { value: null, status: 'incomplete', issues: [...sugarMetric.issues, ...acidMetric.issues] }

  return {
    initialVolumeMl: volume,
    dilution,
    finalVolumeMl: finalVolume,
    approximate,
    abv: metric(alcohol, 100),
    sugarPer100Ml: sugarMetric,
    acidPer100Ml: acidMetric,
    ratio,
  }
}

function lineFacts(
  line: LineInput,
  context: CompositionContext,
  visiting: Set<string>,
  cache: Map<string, Facts>,
): Facts | 'unknown' | 'cycle' {
  const { resolver } = context
  const ingredient = resolver.ingredient(line.ingredientId)
  if (!ingredient) return 'unknown'
  const product = line.preferredProductId === null ? undefined : resolver.product(line.preferredProductId)

  let prep: Facts | null = null
  if (ingredient.prepRecipeId !== null) {
    if (visiting.has(ingredient.prepRecipeId)) return 'cycle'
    const cached = cache.get(ingredient.prepRecipeId)
    if (cached) {
      prep = cached
    } else {
      const prepRecipe = resolver.recipe(ingredient.prepRecipeId)
      if (prepRecipe) {
        visiting.add(prepRecipe.id)
        const nested = compose(prepRecipe, context, visiting, cache)
        visiting.delete(prepRecipe.id)
        if (nested.abv.issues.some((i) => i.reason === 'cycle')) return 'cycle'
        prep = {
          abv: nested.abv.value,
          sugarGPerL: nested.sugarPer100Ml.value === null ? null : nested.sugarPer100Ml.value * 10,
          acidGPerL: nested.acidPer100Ml.value === null ? null : nested.acidPer100Ml.value * 10,
          abvStatus: nested.abv.status,
          sugarStatus: nested.sugarPer100Ml.status,
          acidStatus: nested.acidPer100Ml.status,
        }
        cache.set(prepRecipe.id, prep)
      }
    }
  }

  const ingredientStatus: Completeness =
    ingredient.compositionConfidence === 'estimated' ? 'estimated' : 'complete'
  const pick = (
    fromProduct: number | null | undefined,
    fromIngredient: number | null,
    fromPrep: number | null | undefined,
    prepStatus: Completeness | undefined,
    ingredientIsSourced: boolean,
  ): [number | null, Completeness] => {
    if (fromProduct !== null && fromProduct !== undefined) return [fromProduct, 'complete']
    if (fromIngredient !== null) return [fromIngredient, ingredientIsSourced ? 'complete' : ingredientStatus]
    if (fromPrep !== null && fromPrep !== undefined) return [fromPrep, prepStatus ?? 'complete']
    return [null, 'incomplete']
  }

  // The ABV of a generic ingredient is a label value, not an estimated composition.
  const [abv, abvStatus] = pick(product?.abv, ingredient.abv, prep?.abv, prep?.abvStatus, true)
  const [sugarGPerL, sugarStatus] = pick(
    product?.sugarGPerL,
    ingredient.sugarGPerL,
    prep?.sugarGPerL,
    prep?.sugarStatus,
    false,
  )
  const [acidGPerL, acidStatus] = pick(
    product?.acidGPerL,
    ingredient.acidGPerL,
    prep?.acidGPerL,
    prep?.acidStatus,
    false,
  )
  return { abv, sugarGPerL, acidGPerL, abvStatus, sugarStatus, acidStatus }
}
