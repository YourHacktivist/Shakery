/**
 * Allergens of a recipe (section 8, « Allergènes »): union of those of its lines, recursive
 * through preparations. Allergens brought only by optional lines are listed apart. The
 * interface reminds that the result depends on the data entered.
 */
import type { AllergenCode } from '../shared/domain/allergens'
import { ALLERGEN_CODES } from '../shared/domain/allergens'
import type { FactsResolver, LineInput, RecipeInput } from './model'
import { normalizeName } from './normalize'

export type AllergenResult = {
  readonly required: readonly AllergenCode[]
  /** Brought only by optional lines. */
  readonly optional: readonly AllergenCode[]
  /** Lines whose ingredient is unknown or loops through preparations. */
  readonly unresolvedLineIds: readonly string[]
}

/**
 * Words of a line note that name an allergen the generic ingredient does not carry: a whisky
 * « aromatisé au beurre de cacahuète », a gin « infusé aux crevettes » (D-040). Only words that
 * leave no doubt; a note that says « sans céleri » counts too, which is the careful mistake.
 */
const NAMED_IN_NOTES: ReadonlyArray<readonly [AllergenCode, RegExp]> = [
  ['peanuts', /\b(cacahuetes?|cacahouetes?|arachides?|peanuts?)\b/],
  ['nuts', /\b(amandes?|almonds?|hazelnuts?|pistaches?|pralines?|noix de (cajou|pecan|grenoble))\b/],
  ['celery', /\b(celeri|celery)\b/],
  ['crustaceans', /\b(crevettes?|langoustines?|homards?)\b/],
  ['molluscs', /\b(huitres?|palourdes?)\b/],
  ['mustard', /\b(moutarde|mustard)\b/],
  ['sesame', /\b(sesame|tahini)\b/],
  ['soy', /\b(soja|soy)\b/],
  ['milk', /\b(beurre sale|salted caramel|lait de vache|creme fouettee|chantilly|mascarpone)\b/],
]

export function allergensNamedIn(note: string | null | undefined): AllergenCode[] {
  if (!note) return []
  const text = normalizeName(note)
  return NAMED_IN_NOTES.filter(([, pattern]) => pattern.test(text)).map(([code]) => code)
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
  for (const code of allergensNamedIn(line.note)) codes.add(code)
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
