/**
 * Performance budgets of section 13.1, measured on the seed (about 7 000 recipes since D-036) plus
 * a generated notebook: 5 000 ingredients, 2 000 recipes with 5 versions each and 10 000 tasting
 * notes. Development tool.
 *
 * Budgets checked here: search under 50 ms, opening a recipe under 100 ms, calculation of a
 * recipe under 100 ms. Start-up, scrolling and idle CPU are checked in the application.
 *
 * Usage: npm run perf
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { normalizeName } from '../../src/core/normalize'
import { createDb, systemIds } from '../../src/main/db/client'
import { openDatabase } from '../../src/main/db/connection'
import { computeRecipe } from '../../src/main/db/facts'
import { runMigrations } from '../../src/main/db/migrate'
import { IngredientRepository } from '../../src/main/db/repositories/ingredients'
import { RecipeRepository } from '../../src/main/db/repositories/recipes'
import { SearchRepository } from '../../src/main/db/repositories/search'
import { indexEntity } from '../../src/main/db/repositories/search-index'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from '../../src/main/seed/bundled'
import { loadSeedData } from '../../src/main/seed/load'

const SYLLABLES = [
  'ba',
  'ko',
  'ri',
  'ne',
  'ta',
  'mo',
  'li',
  'su',
  'ga',
  'ro',
  'vi',
  'de',
  'pa',
  'cu',
  'zo',
  'fe',
]

function word(n: number): string {
  let out = ''
  let value = n
  for (let i = 0; i < 4; i += 1) {
    out += SYLLABLES[value % SYLLABLES.length] ?? ''
    value = Math.floor(value / SYLLABLES.length) + i * 7
  }
  return out
}

function measure(label: string, budget: number, run: () => unknown, times = 30): boolean {
  const samples: number[] = []
  for (let i = 0; i < times; i += 1) {
    const start = performance.now()
    run()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const median = samples[Math.floor(samples.length / 2)] ?? 0
  const worst = samples[samples.length - 1] ?? 0
  const ok = worst < budget
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${label}: median ${median.toFixed(1)} ms, worst ${worst.toFixed(1)} ms (budget ${budget} ms)`,
  )
  return ok
}

async function main(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'shakery-perf-'))
  const sqlite = openDatabase(path.join(dir, 'perf.db'))
  try {
    runMigrations(sqlite, path.resolve(__dirname, '../../resources/migrations'))
    const db = createDb(sqlite)
    const clock = Date.now()
    const ids = systemIds()
    // Seed of the first launch (about 7 000 recipes of 24cocktails, D-036), then the check made
    // at every later launch, which must stay well inside the 3 s start-up budget.
    const seedStart = performance.now()
    const seed = withClassics(BUNDLED_SEED, path.resolve(__dirname, '../../resources/seed', CLASSICS_FILE))
    const seeded = loadSeedData(db, ids, seed)
    console.log(
      `Seed loaded in ${((performance.now() - seedStart) / 1000).toFixed(1)} s (${seeded.recipes} recipes, ${seeded.ingredients} ingredients)`,
    )
    const seedCheck = measure(
      'seed check at a later launch',
      1000,
      () =>
        loadSeedData(
          db,
          ids,
          withClassics(BUNDLED_SEED, path.resolve(__dirname, '../../resources/seed', CLASSICS_FILE)),
        ),
      3,
    )

    const started = performance.now()
    const leaf = (
      sqlite.prepare("SELECT id FROM categories WHERE seed_key = 'cat.unsorted'").get() as { id: string }
    ).id
    const ingredientIds: string[] = []
    sqlite.transaction(() => {
      const insert = sqlite.prepare(
        "INSERT INTO ingredients (id, created_at, updated_at, name, name_normalized, category_id, default_abv, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'user')",
      )
      for (let i = 0; i < 5000; i += 1) {
        const id = ids.newId()
        const name = `${word(i)} ${word(i * 3 + 1)}`
        insert.run(id, clock, clock, name, normalizeName(name), leaf, i % 3 === 0 ? 40 : null)
        indexEntity(sqlite, 'ingredient', id, { title: name })
        ingredientIds.push(id)
      }
    })()

    const recipes = new RecipeRepository(db, ids, new IngredientRepository(db, ids))
    const recipeIds: string[] = []
    sqlite.transaction(() => {
      for (let i = 0; i < 2000; i += 1) {
        const lines = Array.from({ length: 4 }, (_, k) => ({
          ingredientId: ingredientIds[(i * 7 + k * 13) % ingredientIds.length] ?? '',
          quantity: 15 + k * 5,
          unit: 'ml' as const,
        }))
        const input = {
          name: `${word(i + 9000)} ${word(i)}`,
          status: 'testing' as const,
          method: 'shake' as const,
          lines,
        }
        const recipe = recipes.create(input)
        for (let v = 0; v < 4; v += 1) recipes.update(recipe.id, { ...input, notes: `version ${v}` })
        recipeIds.push(recipe.id)
      }
    })()

    sqlite.transaction(() => {
      const insert = sqlite.prepare(
        "INSERT INTO tasting_notes (id, created_at, updated_at, recipe_id, recipe_version, tasted_at, overall, scores, comment) VALUES (?, ?, ?, ?, 1, ?, 3, '{}', ?)",
      )
      for (let i = 0; i < 10_000; i += 1) {
        insert.run(ids.newId(), clock, clock, recipeIds[i % recipeIds.length], clock, `Note ${word(i)}`)
      }
    })()
    console.log(`Notebook generated in ${((performance.now() - started) / 1000).toFixed(1)} s`)

    const search = new SearchRepository(db)
    const sample = recipeIds[1234] ?? ''
    const results = [
      seedCheck,
      measure('search, 3 letters', 50, () => search.search('bak')),
      measure('search, a full name', 50, () => search.search(`${word(1234 + 9000)} ${word(1234)}`)),
      measure('search, misspelt (approximate fallback)', 50, () => search.search('zzbakorineq'), 10),
      measure('search, 2 letters (prefix)', 50, () => search.search('ba')),
      measure('open a recipe', 100, () => recipes.get(sample)),
      measure('calculate a recipe', 100, () => {
        const detail = recipes.get(sample)
        computeRecipe(db, { id: detail.id, data: { ...detail, lines: detail.lines } })
      }),
      measure('list all recipes', 300, () => recipes.list(), 10),
    ]
    if (results.includes(false)) process.exitCode = 1
  } finally {
    sqlite.close()
    await rm(dir, { recursive: true, force: true })
  }
}

void main()
