import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, systemIds, type Db } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { IngredientRepository } from '../db/repositories/ingredients'
import { RecipeRepository } from '../db/repositories/recipes'
import { PhotoService, readCleanWebp, removeUnusedPhotos } from './photos'

const MIGRATIONS = path.resolve(__dirname, '../../../resources/migrations')
/** The smallest WebP: 1 × 1 pixel, lossless. */
const TINY = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8)
  head.write(type, 0, 'ascii')
  head.writeUInt32LE(data.length, 4)
  return Buffer.concat([head, data, Buffer.alloc(data.length % 2)])
}

function webp(...chunks: Buffer[]): Buffer {
  const body = Buffer.concat([Buffer.from('WEBP', 'ascii'), ...chunks])
  const head = Buffer.alloc(8)
  head.write('RIFF', 0, 'ascii')
  head.writeUInt32LE(body.length, 4)
  return Buffer.concat([head, body])
}

function lossy(width: number, height: number): Buffer {
  const data = Buffer.alloc(16)
  data.writeUIntBE(0x9d012a, 3, 3)
  data.writeUInt16LE(width, 6)
  data.writeUInt16LE(height, 8)
  return chunk('VP8 ', data)
}

function extended(flags: number, width: number, height: number): Buffer {
  const data = Buffer.alloc(10)
  data.writeUInt8(flags, 0)
  data.writeUIntLE(width - 1, 4, 3)
  data.writeUIntLE(height - 1, 7, 3)
  return chunk('VP8X', data)
}

describe('readCleanWebp (D-045)', () => {
  it('reads the three forms of a still image', () => {
    expect(readCleanWebp(TINY)).toEqual({ width: 1, height: 1 })
    expect(readCleanWebp(webp(lossy(1600, 900)))).toEqual({ width: 1600, height: 900 })
    expect(readCleanWebp(webp(extended(0x10, 30, 20), lossy(30, 20)))).toEqual({ width: 30, height: 20 })
  })

  it.each([
    ['EXIF', webp(lossy(8, 8), chunk('EXIF', Buffer.from('GPS 48.85')))],
    ['XMP', webp(lossy(8, 8), chunk('XMP ', Buffer.from('<x/>')))],
    ['an EXIF flag', webp(extended(0x08, 8, 8), lossy(8, 8))],
    ['an animation', webp(extended(0x02, 8, 8), chunk('ANIM', Buffer.alloc(6)))],
    ['a canvas that lies', webp(extended(0, 8, 8), lossy(9000, 9000))],
    ['bytes after the image', Buffer.concat([TINY, Buffer.from('hidden')])],
    ['a truncated file', TINY.subarray(0, 20)],
    ['a size beyond the file', webp(Buffer.from('VP8 \xff\xff\xff\x7f', 'latin1'))],
    ['no image', webp()],
    ['a script', Buffer.from('<script>alert(1)</script> padded')],
  ])('refuses %s', (_name, file) => {
    expect(readCleanWebp(file)).toBeNull()
  })
})

describe('PhotoService (D-045)', () => {
  let root: string
  let sqlite: ReturnType<typeof openDatabase>
  let db: Db
  let photos: PhotoService
  let recipeId: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'shakery-photos-'))
    sqlite = openDatabase(':memory:')
    runMigrations(sqlite, MIGRATIONS)
    db = createDb(sqlite)
    const ids = systemIds()
    recipeId = new RecipeRepository(db, ids, new IngredientRepository(db, ids)).create({ name: 'Essai' }).id
    photos = new PhotoService(db, ids, root)
  })

  afterEach(async () => {
    sqlite.close()
    await rm(root, { recursive: true, force: true })
  })

  it('names the file itself, keeps the one replaced for « Annuler »', async () => {
    const first = await photos.set('recipe', recipeId, TINY.toString('base64'))
    expect(first.previous).toBeNull()
    expect(first.path).toMatch(/^recipes\/[0-9a-f-]{36}\.webp$/)
    const second = await photos.set('recipe', recipeId, TINY.toString('base64'))
    expect(second.previous).toBe(first.path)
    expect(photos.get('recipe', recipeId)).toBe(second.path)
    expect(await readdir(path.join(root, 'recipes'))).toHaveLength(2)

    await photos.restore('recipe', recipeId, first.path ?? '')
    expect(photos.get('recipe', recipeId)).toBe(first.path)

    expect(await removeUnusedPhotos(db, root)).toBe(1)
    expect(await readdir(path.join(root, 'recipes'))).toEqual([path.basename(first.path ?? '')])
  })

  it('takes a photo off', async () => {
    const { path: saved } = await photos.set('recipe', recipeId, TINY.toString('base64'))
    expect(await photos.set('recipe', recipeId, null)).toEqual({ previous: saved, path: null })
  })

  it('refuses an image too large and writes nothing', async () => {
    const large = webp(lossy(1601, 10)).toString('base64')
    await expect(photos.set('recipe', recipeId, large)).rejects.toThrow(/clean WebP/)
    expect(await readdir(root)).toEqual([])
  })

  it.each(['../shakery.db', 'tastings/abc.webp', 'recipes/../../x.webp', 'C:/Windows/x.webp'])(
    'never points to « %s »',
    async (relative) => {
      await expect(photos.restore('recipe', recipeId, relative)).rejects.toThrow()
      expect(photos.get('recipe', recipeId)).toBeNull()
    },
  )
})
