/**
 * Reading a .shakery archive (section 12.4) with the protections of section 6: every entry
 * stays under the target folder (zip slip), limits on entry count and uncompressed size (zip
 * bomb), only known files, then a full validation of the JSON before anything is written.
 */
import { createWriteStream } from 'node:fs'
import yauzl from 'yauzl'
import yazl from 'yazl'
import { z } from 'zod'

export const ARCHIVE_FORMAT = 'shakery'
export const ARCHIVE_VERSION = 1

export const ARCHIVE_LIMITS = {
  maxEntries: 20_000,
  maxTotalBytes: 1_000_000_000,
  maxJsonBytes: 200_000_000,
  maxMediaBytes: 15_000_000,
} as const

export const manifestSchema = z
  .object({
    format: z.literal(ARCHIVE_FORMAT),
    formatVersion: z.literal(ARCHIVE_VERSION),
    appVersion: z.string().max(64),
    createdAt: z.number().int(),
    kind: z.enum(['full', 'partial']),
    label: z.string().max(200).nullable().default(null),
    counts: z.record(z.string().max(64), z.number().int().min(0)),
  })
  .strict()

export type ArchiveManifest = z.output<typeof manifestSchema>

export type ArchiveContent = {
  readonly manifest: ArchiveManifest
  readonly data: unknown
  /** Media files, by path relative to media/ (WebP only). */
  readonly media: ReadonlyMap<string, Buffer>
}

export class ArchiveError extends Error {
  readonly code: 'INVALID_ARCHIVE' | 'TOO_LARGE' | 'UNSAFE_PATH'

  constructor(code: ArchiveError['code'], message: string) {
    super(message)
    this.name = 'ArchiveError'
    this.code = code
  }
}

const MEDIA_ENTRY =
  /^media\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}\/){0,4}[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}\.webp$/

/** Entry names accepted: the two JSON files and WebP files under media/. Anything else is refused. */
export function checkEntryName(name: string): 'manifest' | 'data' | 'media' | 'directory' {
  if (name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.includes('\0')) {
    throw new ArchiveError('UNSAFE_PATH', 'Unsafe path in the archive')
  }
  if (name.split('/').some((part) => part === '..' || part === '.')) {
    throw new ArchiveError('UNSAFE_PATH', 'Unsafe path in the archive')
  }
  if (name === 'manifest.json') return 'manifest'
  if (name === 'data.json') return 'data'
  if (name === 'media/' || (name.startsWith('media/') && name.endsWith('/'))) return 'directory'
  if (MEDIA_ENTRY.test(name)) return 'media'
  throw new ArchiveError('INVALID_ARCHIVE', 'Unexpected file in the archive')
}

/** WebP signature: « RIFF » .... « WEBP ». */
export function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
}

function openZip(file: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      file,
      { lazyEntries: true, decodeStrings: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error) reject(new ArchiveError('INVALID_ARCHIVE', 'Not a readable archive'))
        else resolve(zip)
      },
    )
  })
}

function readEntry(zip: yauzl.ZipFile, entry: yauzl.Entry, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (entry.uncompressedSize > limit) {
      reject(new ArchiveError('TOO_LARGE', 'An entry of the archive is too large'))
      return
    }
    zip.openReadStream(entry, (error, stream) => {
      if (error) {
        reject(new ArchiveError('INVALID_ARCHIVE', 'Unreadable entry'))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
        // The declared size can lie: count the real bytes too.
        if (size > limit) {
          stream.destroy()
          reject(new ArchiveError('TOO_LARGE', 'An entry of the archive is too large'))
          return
        }
        chunks.push(chunk)
      })
      stream.on('error', () => {
        reject(new ArchiveError('INVALID_ARCHIVE', 'Unreadable entry'))
      })
      stream.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })
  })
}

export async function readArchive(file: string): Promise<ArchiveContent> {
  const zip = await openZip(file)
  try {
    if (zip.entryCount > ARCHIVE_LIMITS.maxEntries) throw new ArchiveError('TOO_LARGE', 'Too many entries')
    // An object, not plain variables: TypeScript does not track writes made in the callbacks.
    const raw: { manifest: Buffer | null; data: Buffer | null } = { manifest: null, data: null }
    const media = new Map<string, Buffer>()
    let total = 0

    await new Promise<void>((resolve, reject) => {
      zip.on('entry', (entry: yauzl.Entry) => {
        void (async () => {
          const kind = checkEntryName(entry.fileName)
          total += entry.uncompressedSize
          if (total > ARCHIVE_LIMITS.maxTotalBytes) throw new ArchiveError('TOO_LARGE', 'Archive too large')
          if (kind === 'manifest') raw.manifest = await readEntry(zip, entry, 1_000_000)
          else if (kind === 'data') raw.data = await readEntry(zip, entry, ARCHIVE_LIMITS.maxJsonBytes)
          else if (kind === 'media') {
            const buffer = await readEntry(zip, entry, ARCHIVE_LIMITS.maxMediaBytes)
            if (!isWebp(buffer)) throw new ArchiveError('INVALID_ARCHIVE', 'A media file is not a WebP image')
            media.set(entry.fileName.slice('media/'.length), buffer)
          }
          zip.readEntry()
        })().catch(reject)
      })
      zip.on('end', () => {
        resolve()
      })
      zip.on('error', () => {
        reject(new ArchiveError('INVALID_ARCHIVE', 'Corrupted archive'))
      })
      zip.readEntry()
    })

    if (raw.manifest === null || raw.data === null)
      throw new ArchiveError('INVALID_ARCHIVE', 'manifest.json or data.json missing')
    const manifest = manifestSchema.safeParse(parseJson(raw.manifest))
    if (!manifest.success) throw new ArchiveError('INVALID_ARCHIVE', 'Invalid manifest')
    return { manifest: manifest.data, data: parseJson(raw.data), media }
  } finally {
    zip.close()
  }
}

function parseJson(buffer: Buffer): unknown {
  try {
    return JSON.parse(buffer.toString('utf8'))
  } catch {
    throw new ArchiveError('INVALID_ARCHIVE', 'Invalid JSON in the archive')
  }
}

/**
 * Writes a .shakery archive. Used by the import tests and the MAF conversion script; the
 * full and partial exports of the notebook arrive in phase 10.
 */
export function writeArchive(
  file: string,
  content: { manifest: ArchiveManifest; data: unknown; media?: ReadonlyMap<string, Buffer> },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile()
    zip.addBuffer(Buffer.from(JSON.stringify(content.manifest, null, 2)), 'manifest.json')
    zip.addBuffer(Buffer.from(JSON.stringify(content.data)), 'data.json')
    for (const [relative, buffer] of content.media ?? new Map<string, Buffer>()) {
      zip.addBuffer(buffer, `media/${relative}`)
    }
    const out = createWriteStream(file)
    out.on('close', () => {
      resolve()
    })
    out.on('error', reject)
    zip.outputStream.pipe(out)
    zip.end()
  })
}
