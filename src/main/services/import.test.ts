import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yazl from 'yazl'
import { createWriteStream } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb, type Db, type Ids } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { IngredientRepository } from '../db/repositories/ingredients'
import { RecipeRepository } from '../db/repositories/recipes'
import { BUNDLED_SEED } from '../seed/bundled'
import { loadSeedData } from '../seed/load'
import { ArchiveError, checkEntryName, readArchive, writeArchive, type ArchiveManifest } from './archive'
import { applyImport, ImportValidationError, previewImport, validateImportData } from './import'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')

let dir: string
let db: Db
let ids: Ids
let clock = 1_000

function freshDb(): Db {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  const created = createDb(sqlite)
  loadSeedData(created, ids, { ...BUNDLED_SEED, ingredients: [], recipes: [] })
  return created
}

function manifest(): ArchiveManifest {
  return {
    format: 'shakery',
    formatVersion: 1,
    appVersion: '0.1.0',
    createdAt: 1,
    kind: 'partial',
    label: null,
    counts: {},
  }
}

function rawZip(file: string, entries: Record<string, Buffer>): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile()
    for (const [name, buffer] of Object.entries(entries)) zip.addBuffer(buffer, name)
    const out = createWriteStream(file)
    out.on('close', () => {
      resolve()
    })
    out.on('error', reject)
    zip.outputStream.pipe(out)
    zip.end()
  })
}

/** Rows of every importable table of a database, as an archive would carry them. */
function exportRows(source: Db, tables: string[]): Record<string, unknown[]> {
  return Object.fromEntries(tables.map((t) => [t, source.$client.prepare(`SELECT * FROM ${t}`).all()]))
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'shakery-import-'))
  ids = {
    now: () => (clock += 1),
    newId: createUuidV7Generator(
      () => clock,
      (b) => b.fill(9),
    ),
  }
  db = freshDb()
})

afterEach(async () => {
  db.$client.close()
  await rm(dir, { recursive: true, force: true })
})

describe('archive reading', () => {
  it('refuses unsafe entry names', () => {
    for (const name of [
      '../../x',
      'media/../../evil.webp',
      '/etc/passwd',
      'C:/x',
      'media\\a.webp',
      'other.txt',
      'media/a.png',
    ]) {
      expect(() => checkEntryName(name), name).toThrow(ArchiveError)
    }
    expect(checkEntryName('manifest.json')).toBe('manifest')
    expect(checkEntryName('media/recipes/a.webp')).toBe('media')
  })

  it('refuses an archive with a path leaving the folder (zip slip)', async () => {
    // yazl will not write « ../../x »: write « zzzzzzz », then patch the name in place.
    const file = path.join(dir, 'slip.shakery')
    await rawZip(file, { 'manifest.json': Buffer.from('{}'), zzzzzzz: Buffer.from('boom') })
    const bytes = await readFile(file)
    let at = bytes.indexOf('zzzzzzz')
    while (at >= 0) {
      bytes.write('../../x', at, 'ascii')
      at = bytes.indexOf('zzzzzzz', at + 1)
    }
    await writeFile(file, bytes)
    await expect(readArchive(file)).rejects.toBeInstanceOf(ArchiveError)
  })

  it('refuses a decompression bomb on the size it declares, before inflating it', async () => {
    const file = path.join(dir, 'bomb.shakery')
    await rawZip(file, { 'manifest.json': Buffer.from('{}') })
    const bytes = await readFile(file)
    // Uncompressed size in the central directory: 2 GB for a file of a few bytes.
    bytes.writeUInt32LE(2_000_000_000, bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 24)
    await writeFile(file, bytes)
    await expect(readArchive(file)).rejects.toMatchObject({ code: 'TOO_LARGE' })
  })

  it('refuses a fake WebP and a broken manifest', async () => {
    const fake = path.join(dir, 'fake.shakery')
    await writeArchive(fake, {
      manifest: manifest(),
      data: { formatVersion: 1, tables: {} },
      media: new Map([['a.webp', Buffer.from('not an image')]]),
    })
    await expect(readArchive(fake)).rejects.toMatchObject({ code: 'INVALID_ARCHIVE' })
    const broken = path.join(dir, 'broken.shakery')
    await rawZip(broken, {
      'manifest.json': Buffer.from('{"format":"other"}'),
      'data.json': Buffer.from('{}'),
    })
    await expect(readArchive(broken)).rejects.toMatchObject({ code: 'INVALID_ARCHIVE' })
    await expect(readArchive(path.join(dir, 'missing.shakery'))).rejects.toMatchObject({
      code: 'INVALID_ARCHIVE',
    })
  })
})

describe('import', () => {
  it('validates every row before writing', () => {
    expect(() => validateImportData({ formatVersion: 1, tables: { hackers: [] } })).toThrow(
      ImportValidationError,
    )
    expect(() =>
      validateImportData({ formatVersion: 1, tables: { recipes: [{ id: 'x', evil: 1 }] } }),
    ).toThrow(/unknown column/)
    expect(() => validateImportData({ formatVersion: 1, tables: { recipes: [{ id: 'x' }] } })).toThrow(
      /missing/,
    )
    expect(() =>
      validateImportData({
        formatVersion: 1,
        tables: { glasses: [{ id: 'g', created_at: 'now', updated_at: 1, name: 'x' }] },
      }),
    ).toThrow(/invalid value/)
    expect(() => validateImportData({ formatVersion: 2, tables: {} })).toThrow()
  })

  it('round-trips recipes, ingredients and media, matching categories and existing ingredients', async () => {
    // Source notebook: a recipe with a new ingredient and an ingredient the target already has.
    const source = freshDb()
    const sIngredients = new IngredientRepository(source, ids)
    const cat = (key: string) =>
      (source.$client.prepare('SELECT id FROM categories WHERE seed_key = ?').get(key) as { id: string }).id
    const gin = sIngredients.create({ name: 'Gin', categoryId: cat('cat.spirits.gin'), defaultAbv: 40 })
    const shrub = sIngredients.create({ name: 'Shrub rhubarbe', categoryId: cat('cat.preps.syrups') })
    const recipe = new RecipeRepository(source, ids, sIngredients).create({
      name: 'Gin shrub',
      lines: [
        { ingredientId: gin.id, quantity: 50, unit: 'ml' },
        { ingredientId: shrub.id, quantity: 20, unit: 'ml' },
      ],
    })
    const tables = [
      'categories',
      'ingredients',
      'ingredient_aliases',
      'recipes',
      'recipe_lines',
      'recipe_history',
    ]
    const file = path.join(dir, 'export.shakery')
    await writeArchive(file, {
      manifest: manifest(),
      data: { formatVersion: 1, tables: exportRows(source, tables) },
      media: new Map([['recipes/photo.webp', WEBP]]),
    })

    // Target notebook already has its own « Gin ».
    const tIngredients = new IngredientRepository(db, ids)
    const targetCat = (key: string) =>
      (db.$client.prepare('SELECT id FROM categories WHERE seed_key = ?').get(key) as { id: string }).id
    const targetGin = tIngredients.create({ name: 'gin', categoryId: targetCat('cat.spirits.gin') })

    const archive = await readArchive(file)
    const data = validateImportData(archive.data)
    const preview = previewImport(db, data, ids)
    const ingredientsPreview = preview.find((p) => p.table === 'ingredients')
    expect(ingredientsPreview).toMatchObject({ total: 2, matched: 1, added: 1, conflicts: 0 })
    expect(preview.find((p) => p.table === 'categories')).toMatchObject({
      matched: BUNDLED_SEED.categories.length,
      added: 0,
    })

    const mediaRoot = path.join(dir, 'media')
    const result = await applyImport(
      db,
      { data, media: archive.media },
      { strategy: 'ignore', ids, mediaRoot },
    )
    expect(result.inserted).toBeGreaterThan(0)
    const imported = new RecipeRepository(db, ids, tIngredients).get(recipe.id)
    expect(imported.lines.map((l) => l.ingredientId)).toContain(targetGin.id)
    expect(tIngredients.list().filter((i) => i.name === 'Shrub rhubarbe')).toHaveLength(1)
    expect(await readdir(path.join(mediaRoot, 'recipes'))).toEqual(['photo.webp'])
    source.$client.close()
  })

  it('ignores, replaces or duplicates a conflict, and rolls back a broken archive', async () => {
    const ingredientsRepo = new IngredientRepository(db, ids)
    const recipes = new RecipeRepository(db, ids, ingredientsRepo)
    const recipe = recipes.create({ name: 'Daiquiri' })
    const rows = exportRows(db, ['recipes'])
    const renamed = {
      formatVersion: 1,
      tables: { recipes: rows['recipes']?.map((r) => ({ ...(r as object), name: 'Daiquiri bis' })) },
    }
    const data = validateImportData(renamed)
    const mediaRoot = path.join(dir, 'media')

    expect(
      await applyImport(db, { data, media: new Map() }, { strategy: 'ignore', ids, mediaRoot }),
    ).toMatchObject({ skipped: 1 })
    expect(recipes.get(recipe.id).name).toBe('Daiquiri')
    await applyImport(db, { data, media: new Map() }, { strategy: 'replace', ids, mediaRoot })
    expect(recipes.get(recipe.id).name).toBe('Daiquiri bis')
    await applyImport(db, { data, media: new Map() }, { strategy: 'duplicate', ids, mediaRoot })
    expect(recipes.list().filter((r) => r.name === 'Daiquiri bis')).toHaveLength(2)

    // A line pointing to a missing ingredient: the foreign key fails at commit, nothing stays.
    const before = recipes.list().length
    const broken = validateImportData({
      formatVersion: 1,
      tables: {
        recipes: [{ id: 'r-new', created_at: 1, updated_at: 1, name: 'Fantôme', name_normalized: 'fantome' }],
        recipe_lines: [
          {
            id: 'l-new',
            created_at: 1,
            updated_at: 1,
            recipe_id: 'r-new',
            ingredient_id: 'nowhere',
            unit: 'ml',
          },
        ],
      },
    })
    await expect(
      applyImport(db, { data: broken, media: new Map() }, { strategy: 'ignore', ids, mediaRoot }),
    ).rejects.toThrow()
    expect(recipes.list()).toHaveLength(before)
  })
})
