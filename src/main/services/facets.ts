/**
 * Facets of every recipe for the filters of section 10.4 (D-040): glass, base spirit, tags,
 * flavour profile, allergens and rating. Computed over the notebook read at once.
 */
import { and, isNull } from 'drizzle-orm'
import { recipeAllergens } from '../../core/allergens'
import type { LineInput } from '../../core/model'
import { lineVolumeMl } from '../../core/units'
import { NO_SPIRIT, type RecipeFacets } from '../../shared/domain/facets'
import type { Db } from '../db/client'
import { notebookFacts, savedCalculation } from '../db/facts'
import { categories, ingredients, recipes } from '../db/schema'

const SPIRITS_SEED_KEY = 'cat.spirits'
/** Under this volume a line only flavours: a dash of bitters, a rinse of absinthe. */
const FLAVOURING_ML = 5

/** Category just under « Spiritueux » of each spirit category, by category id. */
function spiritGroups(db: Db): Map<string, string> {
  const rows = db
    .select({ id: categories.id, parentId: categories.parentId, seedKey: categories.seedKey })
    .from(categories)
    .where(and(isNull(categories.deletedAt)))
    .all()
  const root = rows.find((row) => row.seedKey === SPIRITS_SEED_KEY)?.id
  const groups = new Map<string, string>()
  if (root === undefined) return groups
  const parents = new Map(rows.map((row) => [row.id, row.parentId]))
  for (const { id } of rows) {
    const seen = new Set<string>()
    let current: string | null | undefined = id
    while (current && !seen.has(current)) {
      seen.add(current)
      const parent: string | null | undefined = parents.get(current)
      if (parent === root) {
        groups.set(id, current)
        break
      }
      current = parent
    }
    // An ingredient filed directly under « Spiritueux » counts as that category.
    if (id === root) groups.set(id, root)
  }
  return groups
}

/** Average grade of the last version that was graded, as on the home screen. */
function ratings(db: Db): Map<string, number> {
  const rows = db.$client
    .prepare(
      `SELECT t.recipe_id AS id, AVG(t.overall) AS rating
         FROM tasting_notes t
         JOIN (SELECT recipe_id, MAX(recipe_version) AS version
                 FROM tasting_notes
                WHERE deleted_at IS NULL AND overall IS NOT NULL
                GROUP BY recipe_id) last
           ON last.recipe_id = t.recipe_id AND last.version = t.recipe_version
        WHERE t.deleted_at IS NULL AND t.overall IS NOT NULL
        GROUP BY t.recipe_id`,
    )
    .all() as Array<{ id: string; rating: number }>
  return new Map(rows.map((row) => [row.id, row.rating]))
}

export function recipeFacets(db: Db): RecipeFacets[] {
  const notebook = notebookFacts(db)
  const groups = spiritGroups(db)
  const { equivalences } = savedCalculation(db)
  const rated = ratings(db)
  const ingredientRows = new Map(
    db
      .select({ id: ingredients.id, categoryId: ingredients.categoryId, flavorTags: ingredients.flavorTags })
      .from(ingredients)
      .where(isNull(ingredients.deletedAt))
      .all()
      .map((row) => [row.id, row] as const),
  )
  const rows = db
    .select({ id: recipes.id, glassId: recipes.glassId, tags: recipes.tags })
    .from(recipes)
    .where(isNull(recipes.deletedAt))
    .all()

  return rows.map((row) => {
    const recipe = notebook.recipes.get(row.id)
    const lines: readonly LineInput[] = recipe?.lines ?? []
    const poured = new Map<string, number>()
    const flavors = new Set<string>()
    for (const line of lines) {
      if (line.isGarnish) continue
      const ingredient = ingredientRows.get(line.ingredientId)
      if (!ingredient) continue
      const measured = lineVolumeMl(line, equivalences)
      // Without a measure (to taste, a piece, a top) a line still gives its flavour.
      if (measured.ok && measured.ml < FLAVOURING_ML) continue
      for (const tag of ingredient.flavorTags) flavors.add(tag)
      const group = groups.get(ingredient.categoryId)
      if (group === undefined || line.isOptional) continue
      poured.set(group, (poured.get(group) ?? 0) + (measured.ok ? measured.ml : 0))
    }
    let spirit: string = NO_SPIRIT
    let most = -1
    for (const [group, ml] of poured) {
      if (ml > most) {
        spirit = group
        most = ml
      }
    }
    const allergens = recipe ? recipeAllergens(recipe, notebook.resolver) : null
    return {
      id: row.id,
      glassId: row.glassId,
      spirit,
      tags: row.tags.slice(0, 30),
      flavors: [...flavors],
      allergens: allergens ? [...allergens.required, ...allergens.optional] : [],
      allergensUnknown: allergens === null || allergens.unresolvedLineIds.length > 0,
      rating: rated.get(row.id) ?? null,
    }
  })
}
