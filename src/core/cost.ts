/**
 * Cost (section 8, « Coût de revient ») and sale price (D-017).
 *
 * Cost per ml = price paid / volume of the preferred bottle, else the median of the owned
 * bottles of the ingredient; a preparation costs the sum of its lines divided by its yield.
 * A counted article (D-016: 10 mint leaves, half a lime, a flat seasoning) costs
 * quantity / pack quantity × price, or its price per drink for `serving`.
 * Costs add up in fractions of a cent and are rounded only at the end. A cost mixing HT and
 * TTC purchase prices is incomplete: no VAT is ever guessed.
 */
import { countedLines } from './composition'
import type {
  Completeness,
  FactsResolver,
  Issue,
  LineInput,
  PriceBasis,
  ProductFacts,
  RecipeInput,
} from './model'
import { DEFAULT_EQUIVALENCES, lineVolumeMl, type UnitEquivalences } from './units'

export type CostContext = {
  readonly resolver: FactsResolver
  readonly equivalences?: UnitEquivalences
}

export type LineCost = { readonly lineId: string; readonly cents: number | null }

export type CostResult = {
  /** Cost of one drink (or of the whole preparation), in cents, not rounded. */
  readonly cents: number | null
  readonly basis: PriceBasis | null
  readonly status: Completeness
  readonly lines: readonly LineCost[]
  readonly issues: readonly Issue[]
}

type Priced = { cents: number; basis: PriceBasis } | 'missing' | 'cycle'

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

function perMl(product: ProductFacts): { cents: number; basis: PriceBasis } | null {
  if (product.purchasePriceCents === null || product.purchasePriceBasis === null) return null
  if (product.volumeMl === null || product.volumeMl <= 0) return null
  return { cents: product.purchasePriceCents / product.volumeMl, basis: product.purchasePriceBasis }
}

/** Cost of a whole recipe: every enabled, non-optional line, plus the flat garnish cost. */
export function recipeCost(recipe: RecipeInput, context: CostContext): CostResult {
  return cost(recipe, context, new Set([recipe.id]))
}

function cost(recipe: RecipeInput, context: CostContext, visiting: Set<string>): CostResult {
  const issues: Issue[] = []
  const lines: LineCost[] = []
  let total = 0
  let status: Completeness = 'complete'
  // An object, not plain variables: TypeScript does not track writes made inside `take`.
  const prices: { basis: PriceBasis | null; mixed: boolean } = { basis: null, mixed: false }

  const take = (b: PriceBasis): void => {
    if (prices.basis === null) prices.basis = b
    else if (prices.basis !== b) prices.mixed = true
  }

  for (const line of recipe.lines) {
    if (line.enabled === false || line.isOptional) continue
    const priced = lineCost(line, context, visiting)
    if (priced === 'missing' || priced === 'cycle') {
      status = 'incomplete'
      issues.push({
        lineId: line.id,
        reason: priced === 'cycle' ? 'cycle' : 'missing_price',
        ingredientId: line.ingredientId,
      })
      lines.push({ lineId: line.id, cents: null })
      continue
    }
    take(priced.basis)
    total += priced.cents
    lines.push({ lineId: line.id, cents: priced.cents })
  }

  if (recipe.garnishCostHtCents !== null) {
    take('ht')
    total += recipe.garnishCostHtCents
  }

  if (prices.mixed) {
    status = 'incomplete'
    issues.push({ lineId: recipe.id, reason: 'mixed_price_basis' })
  }
  return {
    cents: status === 'incomplete' ? null : total,
    basis: prices.mixed ? null : prices.basis,
    status,
    lines,
    issues,
  }
}

function lineCost(line: LineInput, context: CostContext, visiting: Set<string>): Priced {
  const { resolver } = context
  const eq = context.equivalences ?? DEFAULT_EQUIVALENCES
  const product = line.preferredProductId === null ? undefined : resolver.product(line.preferredProductId)

  // Counted article bought by the piece, or a flat cost per drink.
  if (
    product?.packUnit &&
    product.packQuantity !== null &&
    product.purchasePriceCents !== null &&
    product.purchasePriceBasis !== null
  ) {
    if (product.packUnit === 'serving')
      return { cents: product.purchasePriceCents, basis: product.purchasePriceBasis }
    if (product.packUnit === line.unit && line.quantity !== null) {
      return {
        cents: (line.quantity / product.packQuantity) * product.purchasePriceCents,
        basis: product.purchasePriceBasis,
      }
    }
    return 'missing'
  }

  const volume = lineVolumeMl(line, eq)
  if (!volume.ok) return 'missing'

  const fromProduct = product ? perMl(product) : null
  if (fromProduct) return { cents: fromProduct.cents * volume.ml, basis: fromProduct.basis }

  const owned = resolver
    .productsOfIngredient(line.ingredientId)
    .filter((p) => p.owned)
    .map(perMl)
    .filter((p): p is { cents: number; basis: PriceBasis } => p !== null)
  if (owned.length > 0) {
    const bases = new Set(owned.map((p) => p.basis))
    if (bases.size === 1) {
      return { cents: median(owned.map((p) => p.cents)) * volume.ml, basis: owned[0]?.basis ?? 'ttc' }
    }
  }

  const ingredient = resolver.ingredient(line.ingredientId)
  if (ingredient?.prepRecipeId) {
    if (visiting.has(ingredient.prepRecipeId)) return 'cycle'
    const prep = resolver.recipe(ingredient.prepRecipeId)
    if (!prep) return 'missing'
    visiting.add(prep.id)
    const prepCost = cost(prep, context, visiting)
    visiting.delete(prep.id)
    if (prepCost.issues.some((i) => i.reason === 'cycle')) return 'cycle'
    const prepVolume = prep.yieldMl ?? countedVolume(prep, eq)
    if (prepCost.cents === null || prepCost.basis === null || prepVolume <= 0) return 'missing'
    return { cents: (prepCost.cents / prepVolume) * volume.ml, basis: prepCost.basis }
  }
  return 'missing'
}

function countedVolume(recipe: RecipeInput, eq: UnitEquivalences): number {
  let total = 0
  for (const line of countedLines(recipe)) {
    const v = lineVolumeMl(line, eq)
    if (v.ok) total += v.ml
  }
  return total
}

export type PricingRules = {
  /** Coefficient applied to the cost excluding VAT (5 in the MAF notebook). */
  readonly multiplier: number
  /** VAT rate in basis points: 2000 = 20 %. */
  readonly vatRateBp: number
  readonly roundingStepCents: number
  readonly rounding: 'up' | 'nearest'
}

export const DEFAULT_PRICING: PricingRules = {
  multiplier: 5,
  vatRateBp: 2000,
  roundingStepCents: 50,
  rounding: 'up',
}

export type SalePrice = {
  /** Cost × coefficient, computed on the unrounded cost, then rounded to the cent. */
  readonly suggestedTtcCents: number
  /** Menu price, rounded to the step (up to the next 0,50 € by default). */
  readonly menuTtcCents: number
  /** Cost / menu price excluding VAT, in %. */
  readonly costRatioPct: number
}

/** Menu price from a cost excluding VAT (D-017). */
export function salePrice(costHtCents: number, rules: PricingRules = DEFAULT_PRICING): SalePrice {
  const suggested = Math.round(costHtCents * rules.multiplier)
  const steps = (costHtCents * rules.multiplier) / rules.roundingStepCents
  // A float error on an exact step (913.9999) must not jump to the next step.
  const rounded = rules.rounding === 'up' ? Math.ceil(steps - 1e-9) : Math.round(steps)
  const menu = rounded * rules.roundingStepCents
  return {
    suggestedTtcCents: suggested,
    menuTtcCents: menu,
    costRatioPct: costRatio(costHtCents, menu, rules.vatRateBp),
  }
}

/** Cost excluding VAT over the menu price excluding VAT, in %. */
export function costRatio(costHtCents: number, menuTtcCents: number, vatRateBp: number): number {
  if (menuTtcCents <= 0) return Number.NaN
  return (costHtCents / (menuTtcCents / (1 + vatRateBp / 10_000))) * 100
}
