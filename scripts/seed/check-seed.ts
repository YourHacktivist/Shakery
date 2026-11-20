/**
 * Full check of the seed recipes (D-036: every classic must work, not a sample). Loads the
 * bundled seed and the classics into a new database, then, for every seed recipe: it was loaded,
 * it opens, its calculation runs, and a search by its name finds it among the first hits.
 * Development tool, exits with code 1 on any failure.
 *
 * Usage: npx tsx scripts/seed/check-seed.ts
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { createDb, systemIds } from '../../src/main/db/client'
import { openDatabase } from '../../src/main/db/connection'
import { computeRecipe } from '../../src/main/db/facts'
import { runMigrations } from '../../src/main/db/migrate'
import { IngredientRepository } from '../../src/main/db/repositories/ingredients'
import { RecipeRepository } from '../../src/main/db/repositories/recipes'
import { SearchRepository } from '../../src/main/db/repositories/search'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from '../../src/main/seed/bundled'
import { loadSeedData } from '../../src/main/seed/load'

/** A search by the exact name must show the recipe among the first hits of the palette. */
const TOP = 5

async function main(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'shakery-seed-check-'))
  const sqlite = openDatabase(path.join(dir, 'check.db'))
  const failures: string[] = []
  try {
    runMigrations(sqlite, path.resolve(__dirname, '../../resources/migrations'))
    const db = createDb(sqlite)
    const ids = systemIds()
    const seed = withClassics(BUNDLED_SEED, path.resolve(__dirname, '../../resources/seed', CLASSICS_FILE))
    const started = performance.now()
    const report = loadSeedData(db, ids, seed)
    console.log(
      `Seed loaded in ${((performance.now() - started) / 1000).toFixed(1)} s: ${report.recipes} recipes, ${report.ingredients} ingredients`,
    )
    if (report.recipes !== seed.recipes.length) {
      failures.push(`${seed.recipes.length - report.recipes} seed recipes were not loaded`)
    }

    const recipes = new RecipeRepository(db, ids, new IngredientRepository(db, ids))
    const search = new SearchRepository(db)
    const rows = sqlite
      .prepare(
        "SELECT id, name, seed_key AS seedKey FROM recipes WHERE seed_key IS NOT NULL AND kind = 'cocktail'",
      )
      .all() as Array<{ id: string; name: string; seedKey: string }>
    let notFirst = 0
    let slowest = 0
    for (const row of rows) {
      try {
        const detail = recipes.get(row.id)
        if (detail.lines.length === 0) failures.push(`${row.seedKey}: no line`)
        computeRecipe(db, { id: detail.id, data: detail })
      } catch (error) {
        failures.push(`${row.seedKey}: ${(error as Error).message}`)
        continue
      }
      const start = performance.now()
      const hits = search.search(row.name, TOP).filter((hit) => hit.entityType === 'recipe')
      slowest = Math.max(slowest, performance.now() - start)
      const rank = hits.findIndex((hit) => hit.id === row.id)
      if (rank < 0) failures.push(`${row.seedKey}: « ${row.name} » not found by its name`)
      else if (rank > 0) notFirst += 1
    }
    console.log(
      `${rows.length} cocktails checked; found by name in the first ${TOP} hits: ${rows.length - failures.length}; not first (another recipe of the same name first): ${notFirst}; slowest search ${slowest.toFixed(0)} ms`,
    )
  } finally {
    sqlite.close()
    await rm(dir, { recursive: true, force: true })
  }
  if (failures.length > 0) {
    console.log(`${failures.length} failures:\n${failures.slice(0, 60).join('\n')}`)
    process.exitCode = 1
  }
}

void main()
