import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb, type Db, type Ids } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { IngredientRepository } from '../db/repositories/ingredients'
import { JournalRepository } from '../db/repositories/journal'
import { ProductRepository } from '../db/repositories/products'
import { RecipeRepository } from '../db/repositories/recipes'
import { SearchRepository } from '../db/repositories/search'
import { WorkshopRepository } from '../db/repositories/workshop'
import { BUNDLED_SEED, CLASSICS_FILE, withClassics } from '../seed/bundled'
import { loadSeedData, type SeedData } from '../seed/load'
import { readArchive, writeArchive } from './archive'
import { buildExport } from './export'
import { applyImport, previewImport, validateImportData } from './import'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')

// The bundled seed and a slice of the 24cocktails classics: the same in every notebook.
const ALL = withClassics(BUNDLED_SEED, path.resolve(__dirname, '../../../resources/seed', CLASSICS_FILE))
const SEED: SeedData = {
  ...BUNDLED_SEED,
  recipes: [
    ...BUNDLED_SEED.recipes,
    ...ALL.recipes.filter((r) => r.seed_key.startsWith('c24.')).slice(0, 30),
  ],
}

let dir: string
let clock = 1_000_000

/** A fresh install: its own ids for the same seed. */
function install(fill: number): { db: Db; ids: Ids } {
  const ids: Ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(fill),
    ),
  }
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  const db = createDb(sqlite)
  loadSeedData(db, ids, SEED)
  return { db, ids }
}

function idOf(db: Db, seedKey: string): string {
  return (db.$client.prepare('SELECT id FROM recipes WHERE seed_key = ?').get(seedKey) as { id: string }).id
}

function recipesOf(db: Db, ids: Ids): RecipeRepository {
  return new RecipeRepository(db, ids, new IngredientRepository(db, ids))
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'shakery-export-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('full export then import', () => {
  it('gives the notebook back in a new install, classics changes and photos included', async () => {
    const source = install(1)
    const recipes = recipesOf(source.db, source.ids)
    const negroni = idOf(source.db, 'iba.negroni')
    const daiquiri = idOf(source.db, 'iba.daiquiri')
    const manhattan = idOf(source.db, 'iba.manhattan')
    const detail = recipes.get(negroni)
    const {
      id: _id,
      version: _v,
      isFavorite: _f,
      createdAt: _c,
      updatedAt: _u,
      history: _h,
      ...input
    } = detail
    recipes.update(negroni, {
      ...input,
      notes: 'Mon twist : vermouth plus sec',
      lines: detail.lines.map(({ id: _line, ...line }) => line),
    })
    recipes.setFavorite(daiquiri, true)
    recipes.delete(manhattan)
    const gin = (
      source.db.$client.prepare("SELECT id FROM ingredients WHERE seed_key = 'ing.q161'").get() as
        { id: string } | undefined
    )?.id
    const anyIngredient = gin ?? detail.lines[0]?.ingredientId ?? ''
    const own = recipes.create({
      name: 'Rhubarbe du soir',
      status: 'testing',
      lines: [{ ingredientId: anyIngredient, quantity: 45, unit: 'ml' }],
    })
    source.db.$client.prepare("UPDATE recipes SET photo_path = 'recipes/own.webp' WHERE id = ?").run(own.id)
    const sourceMedia = path.join(dir, 'source-media')
    await mkdir(path.join(sourceMedia, 'recipes'), { recursive: true })
    await writeFile(path.join(sourceMedia, 'recipes', 'own.webp'), WEBP)
    new JournalRepository(source.db, source.ids).createTasting({
      recipeId: negroni,
      recipeVersion: 2,
      tastedAt: 5,
      overall: 4,
      comment: 'Plus rond',
    })
    new ProductRepository(source.db, source.ids).create({
      ingredientId: anyIngredient,
      name: 'Ma bouteille',
      purchasePriceCents: 2490,
      purchasePriceBasis: 'ttc',
    })
    const workshop = new WorkshopRepository(source.db, source.ids)
    const menu = workshop.createCollection({ name: 'Carte été' })
    workshop.addRecipes(menu.id, [negroni, own.id])

    const bundle = await buildExport(
      source.db,
      { kind: 'full' },
      { appVersion: '0.1.0', now: 1, mediaRoot: sourceMedia },
    )
    expect(bundle.manifest.kind).toBe('full')
    expect(bundle.media.has('recipes/own.webp')).toBe(true)
    const file = path.join(dir, 'carnet.shakery')
    await writeArchive(file, bundle)

    // A new install: the same seed under other ids.
    const target = install(2)
    const archive = await readArchive(file)
    const data = validateImportData(archive.data)
    const preview = previewImport(target.db, data, target.ids)
    expect(preview.find((p) => p.table === 'recipes')).toMatchObject({ conflicts: 0, added: 1 })
    const targetMedia = path.join(dir, 'target-media')
    await applyImport(
      target.db,
      { data, media: archive.media },
      { strategy: 'ignore', ids: target.ids, mediaRoot: targetMedia },
    )

    const after = recipesOf(target.db, target.ids)
    const targetNegroni = idOf(target.db, 'iba.negroni')
    const imported = after.get(targetNegroni)
    expect(imported).toMatchObject({ version: 2, notes: 'Mon twist : vermouth plus sec' })
    expect(imported.lines).toHaveLength(detail.lines.length)
    expect(imported.history.map((h) => h.version)).toEqual([2, 1])
    // The snapshots point to the rows of this notebook.
    const firstVersion = after.getVersion(targetNegroni, 1)
    expect(firstVersion.id).toBe(targetNegroni)
    const known = new Set(
      (target.db.$client.prepare('SELECT id FROM ingredients').all() as Array<{ id: string }>).map(
        (r) => r.id,
      ),
    )
    for (const line of firstVersion.lines) expect(known.has(line.ingredientId)).toBe(true)
    expect(after.get(idOf(target.db, 'iba.daiquiri')).isFavorite).toBe(true)
    expect(() => after.get(idOf(target.db, 'iba.manhattan'))).toThrow()
    expect(after.get(own.id).name).toBe('Rhubarbe du soir')
    const photo = target.db.$client
      .prepare('SELECT photo_path AS photo FROM recipes WHERE id = ?')
      .get(own.id) as {
      photo: string
    }
    expect(photo.photo).toBe('recipes/own.webp')
    expect(await readFile(path.join(targetMedia, 'recipes', 'own.webp'))).toEqual(WEBP)

    // One row per classic, notes and bottle and collection on the right rows.
    const counts = target.db.$client
      .prepare(
        'SELECT COUNT(*) AS n, COUNT(DISTINCT seed_key) AS keys FROM recipes WHERE seed_key IS NOT NULL',
      )
      .get() as { n: number; keys: number }
    expect(counts.n).toBe(counts.keys)
    expect(counts.n).toBe(SEED.recipes.length)
    const tastings = new JournalRepository(target.db, target.ids).listTastings()
    expect(tastings.map((t) => [t.recipeId, t.comment])).toEqual([[targetNegroni, 'Plus rond']])
    const bottle = target.db.$client
      .prepare("SELECT purchase_price_cents AS price FROM products WHERE name = 'Ma bouteille'")
      .get() as { price: number }
    expect(bottle.price).toBe(2490)
    const collection = new WorkshopRepository(target.db, target.ids).getCollection(menu.id)
    expect(collection.items.map((i) => i.recipeId)).toEqual([targetNegroni, own.id])
    // Written rows are searchable; the untouched classics were not indexed twice.
    expect(new SearchRepository(target.db).search('Rhubarbe du soir', 3)[0]?.id).toBe(own.id)
    const indexed = target.db.$client
      .prepare("SELECT COUNT(*) AS n FROM search_index WHERE entity_type = 'recipe'")
      .get() as { n: number }
    expect(indexed.n).toBe(SEED.recipes.length + 1)

    // The same archive again: nothing new, nothing broken.
    const again = previewImport(target.db, data, target.ids)
    expect(again.filter((p) => p.added > 0)).toEqual([])
    await applyImport(
      target.db,
      { data, media: archive.media },
      { strategy: 'ignore', ids: target.ids, mediaRoot: targetMedia },
    )
    expect(after.list().filter((r) => r.name === 'Rhubarbe du soir')).toHaveLength(1)
    // Replacing with the same archive keeps the versions of the classic taken over above.
    await applyImport(
      target.db,
      { data, media: archive.media },
      { strategy: 'replace', ids: target.ids, mediaRoot: targetMedia },
    )
    const replaced = after.get(targetNegroni)
    expect(replaced.history.map((h) => h.version)).toEqual([2, 1])
    expect(replaced.lines).toHaveLength(detail.lines.length)
    expect(after.getVersion(targetNegroni, 1).id).toBe(targetNegroni)
    source.db.$client.close()
    target.db.$client.close()
  })

  it('leaves a classic changed on both sides to the chosen strategy', async () => {
    const source = install(3)
    const target = install(4)
    recipesOf(source.db, source.ids).setFavorite(idOf(source.db, 'iba.negroni'), true)
    recipesOf(target.db, target.ids).setStatus(idOf(target.db, 'iba.negroni'), 'testing')
    const bundle = await buildExport(
      source.db,
      { kind: 'full' },
      { appVersion: '0.1.0', now: 1, mediaRoot: dir },
    )
    const data = validateImportData(JSON.parse(JSON.stringify(bundle.data)))
    expect(previewImport(target.db, data, target.ids).find((p) => p.table === 'recipes')?.conflicts).toBe(1)

    const media = new Map<string, Buffer>()
    await applyImport(target.db, { data, media }, { strategy: 'ignore', ids: target.ids, mediaRoot: dir })
    const kept = recipesOf(target.db, target.ids).get(idOf(target.db, 'iba.negroni'))
    expect(kept).toMatchObject({ status: 'testing', isFavorite: false })

    await applyImport(target.db, { data, media }, { strategy: 'duplicate', ids: target.ids, mediaRoot: dir })
    const copies = recipesOf(target.db, target.ids)
      .list()
      .filter((r) => r.name === 'Negroni')
    expect(copies).toHaveLength(2)
    const seedKeys = target.db.$client
      .prepare("SELECT seed_key FROM recipes WHERE name = 'Negroni' ORDER BY seed_key")
      .all() as Array<{ seed_key: string | null }>
    expect(seedKeys.map((r) => r.seed_key)).toEqual([null, 'iba.negroni'])

    await applyImport(target.db, { data, media }, { strategy: 'replace', ids: target.ids, mediaRoot: dir })
    expect(recipesOf(target.db, target.ids).get(idOf(target.db, 'iba.negroni'))).toMatchObject({
      status: 'final',
      isFavorite: true,
    })
    source.db.$client.close()
    target.db.$client.close()
  })
})

describe('partial export', () => {
  it('carries the recipes and their preparations, without notes, notebook or prices by default', async () => {
    const source = install(5)
    const recipes = recipesOf(source.db, source.ids)
    const syrup = source.db.$client
      .prepare("SELECT id FROM ingredients WHERE seed_key = 'ing.prep.sirop-simple'")
      .get() as { id: string }
    const product = new ProductRepository(source.db, source.ids).create({
      ingredientId: syrup.id,
      name: 'Sirop maison',
      purchasePriceCents: 300,
      purchasePriceBasis: 'ttc',
    })
    const own = recipes.create({
      name: 'Sour maison',
      lines: [{ ingredientId: syrup.id, preferredProductId: product.id, quantity: 20, unit: 'ml' }],
    })
    new JournalRepository(source.db, source.ids).createTasting({
      recipeId: own.id,
      recipeVersion: 1,
      tastedAt: 1,
    })

    const shared = await buildExport(
      source.db,
      { kind: 'partial', recipeIds: [own.id], includePrivate: false },
      { appVersion: '0.1.0', now: 1, mediaRoot: dir },
    )
    const tables = shared.data.tables
    expect(tables['recipes']?.map((r) => r['name']).sort()).toEqual(['Sirop simple', 'Sour maison'])
    expect(tables['tasting_notes']).toBeUndefined()
    expect(tables['notebook_entries']).toBeUndefined()
    expect(tables['products']).toEqual([])
    expect(tables['recipe_lines']?.every((line) => line['preferred_product_id'] === null)).toBe(true)

    const withPrivate = await buildExport(
      source.db,
      { kind: 'partial', recipeIds: [own.id], includePrivate: true },
      { appVersion: '0.1.0', now: 1, mediaRoot: dir },
    )
    expect(withPrivate.data.tables['tasting_notes']).toHaveLength(1)
    expect(withPrivate.data.tables['products']?.map((p) => p['purchase_price_cents'])).toEqual([300])

    // A colleague's notebook: the seed preparation is matched, the recipe arrives.
    const colleague = install(6)
    const data = validateImportData(JSON.parse(JSON.stringify(shared.data)))
    await applyImport(
      colleague.db,
      { data, media: new Map() },
      { strategy: 'ignore', ids: colleague.ids, mediaRoot: dir },
    )
    const arrived = recipesOf(colleague.db, colleague.ids).get(own.id)
    const colleagueSyrup = colleague.db.$client
      .prepare("SELECT id FROM ingredients WHERE seed_key = 'ing.prep.sirop-simple'")
      .get() as { id: string }
    expect(arrived.lines.map((l) => l.ingredientId)).toEqual([colleagueSyrup.id])
    const syrups = colleague.db.$client
      .prepare("SELECT COUNT(*) AS n FROM recipes WHERE name = 'Sirop simple'")
      .get() as { n: number }
    expect(syrups.n).toBe(1)
    source.db.$client.close()
    colleague.db.$client.close()
  })
})
