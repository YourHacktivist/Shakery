/**
 * Allergens of a recipe (section 8, « Allergènes »): union of those of its lines, recursive
 * through preparations. Allergens brought only by optional lines are listed apart. The
 * interface reminds that the result depends on the data entered.
 */
import type { AllergenCode } from '../shared/domain/allergens'
import { ALLERGEN_CODES } from '../shared/domain/allergens'
import type { FactsResolver, LineInput, RecipeInput } from './model'

export type AllergenResult = {
  readonly required: readonly AllergenCode[]
  /** Brought only by optional lines. */
  readonly optional: readonly AllergenCode[]
  /** Lines whose ingredient is unknown or loops through preparations. */
  readonly unresolvedLineIds: readonly string[]
}

const ORDER = new Map(ALLERGEN_CODES.map((code, index) => [code, index]))

function sorted(codes: Iterable<AllergenCode>): AllergenCode[] {
  return [...new Set(codes)].sort((a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0))
}

export function recipeAllergens(recipe: RecipeInput, resolver: FactsResolver): AllergenResult {
  const required = new Set<AllergenCode>()
  const optional = new Set<AllergenCode>()
  const unresolved: string[] = []
  const memo = new Map<string, Set<AllergenCode> | 'cycle'>()

  for (const line of recipe.lines) {
    if (line.enabled === false) continue
    const found = lineAllergens(line, resolver, new Set([recipe.id]), memo)
    if (found === null) {
      unresolved.push(line.id)
      continue
    }
    for (const code of found) (line.isOptional ? optional : required).add(code)
  }
  for (const code of required) optional.delete(code)
  return { required: sorted(required), optional: sorted(optional), unresolvedLineIds: unresolved }
}

function lineAllergens(
  line: LineInput,
  resolver: FactsResolver,
  visiting: Set<string>,
  memo: Map<string, Set<AllergenCode> | 'cycle'>,
): Set<AllergenCode> | null {
  const ingredient = resolver.ingredient(line.ingredientId)
  if (!ingredient) return null
  const codes = new Set<AllergenCode>(ingredient.allergens)
  if (line.preferredProductId !== null) {
    for (const code of resolver.product(line.preferredProductId)?.allergens ?? []) codes.add(code)
  }
  const prepId = ingredient.prepRecipeId
  if (prepId === null) return codes
  if (visiting.has(prepId)) return null
  let nested = memo.get(prepId)
  if (nested === undefined) {
    const prep = resolver.recipe(prepId)
    nested = new Set<AllergenCode>()
    if (prep) {
      visiting.add(prepId)
      for (const prepLine of prep.lines) {
        if (prepLine.enabled === false || prepLine.isOptional) continue
        const inner = lineAllergens(prepLine, resolver, visiting, memo)
        if (inner === null) {
          nested = 'cycle'
          break
        }
        for (const code of inner) nested.add(code)
      }
      visiting.delete(prepId)
    }
    memo.set(prepId, nested)
  }
  if (nested === 'cycle') return null
  for (const code of nested) codes.add(code)
  return codes
}
