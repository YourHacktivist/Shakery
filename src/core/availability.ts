/**
 * What can be made with my bar (section 8, « Disponibilité »).
 *
 * An ingredient is available if a bottle of it is owned, if it is a staple, or, for a homemade
 * preparation, if an active batch that has not expired exists. A recipe can be made when all
 * its lines that are neither optional nor garnish are available. Recipes missing exactly one
 * ingredient are grouped by that ingredient, which gives a useful shopping list.
 */

export type AvailabilityFacts = {
  /** Ingredients with at least one owned bottle. */
  readonly owned: ReadonlySet<string>
  /** Ingredients always at hand (water, sugar, ice). */
  readonly staples: ReadonlySet<string>
  /** Preparation ingredients with an active batch that has not expired. */
  readonly activePreps: ReadonlySet<string>
}

export type AvailabilityLine = {
  readonly ingredientId: string
  readonly isOptional: boolean
  readonly isGarnish: boolean
}

export function isAvailable(ingredientId: string, facts: AvailabilityFacts): boolean {
  return (
    facts.owned.has(ingredientId) || facts.staples.has(ingredientId) || facts.activePreps.has(ingredientId)
  )
}

/** Required ingredients that are not available, each once, in line order. */
export function missingIngredients(lines: readonly AvailabilityLine[], facts: AvailabilityFacts): string[] {
  const missing: string[] = []
  for (const line of lines) {
    if (line.isOptional || line.isGarnish) continue
    if (!isAvailable(line.ingredientId, facts) && !missing.includes(line.ingredientId))
      missing.push(line.ingredientId)
  }
  return missing
}

/**
 * Ingredients that would unlock recipes missing only them, most useful first
 * (« un vermouth rouge débloque 7 fiches »).
 */
export function unlockers(
  recipes: ReadonlyArray<{ readonly id: string; readonly missing: readonly string[] }>,
): Array<{ ingredientId: string; recipeIds: string[] }> {
  const byIngredient = new Map<string, string[]>()
  for (const recipe of recipes) {
    if (recipe.missing.length !== 1) continue
    const ingredientId = recipe.missing[0] ?? ''
    const list = byIngredient.get(ingredientId) ?? []
    list.push(recipe.id)
    byIngredient.set(ingredientId, list)
  }
  return [...byIngredient.entries()]
    .map(([ingredientId, recipeIds]) => ({ ingredientId, recipeIds }))
    .sort((a, b) => b.recipeIds.length - a.recipeIds.length || a.ingredientId.localeCompare(b.ingredientId))
}
