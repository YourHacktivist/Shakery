/**
 * Reference zones of the families (section 8), computed from the final recipes and the classics.
 * The computation runs every recipe through the calculator, so it is cached until a recipe, an
 * ingredient or a bottle changes (latest update time and row counts of these tables).
 */
import { referenceZones, type ZoneSource } from '../../core/balance'
import { computeComposition } from '../../core/composition'
import type { ReferenceZones } from '../../shared/domain/zones'
import type { Db } from '../db/client'
import { notebookFacts } from '../db/facts'
import type { RecipeRepository } from '../db/repositories/recipes'

function stamp(db: Db): string {
  const row = db.$client
    .prepare(
      `SELECT (SELECT COUNT(*) || ':' || IFNULL(MAX(updated_at), 0) FROM recipes) || '|' ||
              (SELECT COUNT(*) || ':' || IFNULL(MAX(updated_at), 0) FROM recipe_lines) || '|' ||
              (SELECT COUNT(*) || ':' || IFNULL(MAX(updated_at), 0) FROM ingredients) || '|' ||
              (SELECT COUNT(*) || ':' || IFNULL(MAX(updated_at), 0) FROM products) AS stamp`,
    )
    .get() as { stamp: string }
  return row.stamp
}

export function createZonesCache() {
  let cached: { stamp: string; zones: ReferenceZones } | null = null
  return {
    get(db: Db, recipes: RecipeRepository): ReferenceZones {
      const current = stamp(db)
      if (cached && cached.stamp === current) return cached.zones
      const sources: ZoneSource[] = []
      const notebook = notebookFacts(db)
      for (const summary of recipes.zoneCandidates()) {
        const recipe = notebook.recipes.get(summary.id)
        if (!recipe) continue
        const result = computeComposition(recipe, { resolver: notebook.resolver })
        const value = (metric: { value: number | null; status: string }) =>
          metric.status === 'incomplete' ? null : metric.value
        sources.push({
          id: summary.id,
          family: summary.family,
          status: summary.status,
          origin: summary.origin,
          values: {
            abv: value(result.abv),
            sugar: value(result.sugarPer100Ml),
            acid: value(result.acidPer100Ml),
            ratio: value(result.ratio),
          },
        })
      }
      const zones = referenceZones(sources)
      cached = { stamp: current, zones }
      return zones
    },
  }
}
