/**
 * Photos of recipes and tastings (section 6, D-045). The renderer re-encodes; nothing of what it
 * sends is trusted: structure, size and dimensions are read again here, and a chunk that could
 * carry metadata (EXIF and its GPS position, XMP) refuses the file. The name is chosen here,
 * never by the renderer.
 *
 * A photo is never rewritten in place (the backups count on it). A replaced one stays on disk
 * for « Annuler », until the trash is emptied.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MAX_PHOTO_BYTES, MAX_PHOTO_SIDE, photoPathSchema, type PhotoOwner } from '../../shared/domain/photos'
import type { Db, Ids } from '../db/client'
import { DomainError } from '../errors'
import { isPathInside } from '../security-policy'

const FOLDERS = { recipe: 'recipes', tasting: 'tastings' } as const
const TABLES = { recipe: 'recipes', tasting: 'tasting_notes' } as const
/** Image, transparency and colour profile: nothing else. */
const CHUNKS: ReadonlySet<string> = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ICCP'])

export type WebpImage = { readonly width: number; readonly height: number }

/** Dimensions of a still WebP without metadata, or null for anything else. */
export function readCleanWebp(file: Buffer): WebpImage | null {
  if (file.length < 20 || file.toString('ascii', 0, 4) !== 'RIFF') return null
  if (file.toString('ascii', 8, 12) !== 'WEBP' || file.readUInt32LE(4) + 8 !== file.length) return null
  let canvas: WebpImage | null = null
  let image: WebpImage | null = null
  let at = 12
  while (at < file.length) {
    if (at + 8 > file.length) return null
    const type = file.toString('ascii', at, at + 4)
    const size = file.readUInt32LE(at + 4)
    const data = at + 8
    if (!CHUNKS.has(type) || data + size > file.length) return null
    if (type === 'VP8X') {
      // Announces animation (0x02), XMP (0x04) or EXIF (0x08): refused.
      if (canvas || size < 10 || (file.readUInt8(data) & 0x0e) !== 0) return null
      canvas = { width: file.readUIntLE(data + 4, 3) + 1, height: file.readUIntLE(data + 7, 3) + 1 }
    } else if (type === 'VP8 ') {
      if (image || size < 10 || file.readUIntBE(data + 3, 3) !== 0x9d012a) return null
      image = {
        width: file.readUInt16LE(data + 6) & 0x3fff,
        height: file.readUInt16LE(data + 8) & 0x3fff,
      }
    } else if (type === 'VP8L') {
      if (image || size < 5 || file.readUInt8(data) !== 0x2f) return null
      const bits = file.readUInt32LE(data + 1)
      image = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    at = data + size + (size % 2)
  }
  if (!image || at !== file.length || image.width < 1 || image.height < 1) return null
  if (canvas && (canvas.width !== image.width || canvas.height !== image.height)) return null
  return image
}

export class PhotoService {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
    private readonly mediaRoot: string,
  ) {}

  get(owner: PhotoOwner, id: string): string | null {
    const row = this.db.$client
      .prepare(`SELECT photo_path AS path FROM ${TABLES[owner]} WHERE id = ? AND deleted_at IS NULL`)
      .get(id) as { path: string | null } | undefined
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown owner of a photo')
    return row.path
  }

  /** Saves the photo, or takes it off with null. Returns the path in place before and now. */
  async set(
    owner: PhotoOwner,
    id: string,
    content: string | null,
  ): Promise<{ previous: string | null; path: string | null }> {
    const previous = this.get(owner, id)
    if (content === null) {
      this.point(owner, id, null)
      return { previous, path: null }
    }
    const file = Buffer.from(content, 'base64')
    const image = file.length <= MAX_PHOTO_BYTES ? readCleanWebp(file) : null
    if (!image || image.width > MAX_PHOTO_SIDE || image.height > MAX_PHOTO_SIDE) {
      throw new DomainError('INVALID_INPUT', 'Not a clean WebP photo within the limits')
    }
    const folder = FOLDERS[owner]
    const relative = `${folder}/${this.ids.newId()}.webp`
    const target = path.join(this.mediaRoot, relative)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, file, { flag: 'wx' })
    try {
      this.point(owner, id, relative)
    } catch (error) {
      await rm(target, { force: true })
      throw error
    }
    return { previous, path: relative }
  }

  /** « Annuler »: a photo of the same kind that is still in the media folder. */
  async restore(owner: PhotoOwner, id: string, relative: string): Promise<void> {
    this.get(owner, id)
    const known = photoPathSchema.safeParse(relative).success && relative.startsWith(`${FOLDERS[owner]}/`)
    const file = path.resolve(this.mediaRoot, relative)
    if (!known || !isPathInside(path.resolve(this.mediaRoot), file)) {
      throw new DomainError('INVALID_INPUT', 'Not a photo of this kind')
    }
    const info = await stat(file).catch(() => null)
    if (!info?.isFile()) throw new DomainError('NOT_FOUND', 'This photo is gone')
    this.point(owner, id, relative)
  }

  private point(owner: PhotoOwner, id: string, relative: string | null): void {
    const changed = this.db.$client
      .prepare(
        `UPDATE ${TABLES[owner]} SET photo_path = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(relative, this.ids.now(), id).changes
    if (changed === 0) throw new DomainError('NOT_FOUND', 'Unknown owner of a photo')
  }
}

/**
 * Deletes the photos that no row points to any more. Called when the trash is emptied, after the
 * verified backup that holds them all. Only the two folders written here are looked at.
 */
export async function removeUnusedPhotos(db: Db, mediaRoot: string): Promise<number> {
  const used = new Set(
    (
      db.$client
        .prepare(
          `SELECT photo_path AS path FROM recipes WHERE photo_path IS NOT NULL
           UNION SELECT photo_path FROM tasting_notes WHERE photo_path IS NOT NULL
           UNION SELECT image_path FROM products WHERE image_path IS NOT NULL`,
        )
        .all() as Array<{ path: string }>
    ).map((row) => row.path),
  )
  let removed = 0
  for (const folder of Object.values(FOLDERS)) {
    const entries = await readdir(path.join(mediaRoot, folder), { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const relative = `${folder}/${entry.name}`
      if (!entry.isFile() || used.has(relative) || !photoPathSchema.safeParse(relative).success) continue
      await rm(path.join(mediaRoot, folder, entry.name), { force: true })
      removed += 1
    }
  }
  return removed
}
