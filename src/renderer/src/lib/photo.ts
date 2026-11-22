/**
 * A photo chosen by the user, re-encoded here (section 6, D-045): type read from the first
 * bytes, dimensions read before decoding, 1600 px at most, WebP drawn on a canvas, which leaves
 * every metadata behind (EXIF, GPS position, thumbnail).
 */
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_SIDE,
  MAX_PHOTO_SOURCE_BYTES,
  MAX_PHOTO_SOURCE_PIXELS,
} from '@shared/domain/photos'

export type PhotoProblem = 'type' | 'size' | 'unreadable'

export class PhotoError extends Error {
  constructor(readonly problem: PhotoProblem) {
    super(problem)
  }
}

export type PickedPhoto = {
  /** The WebP in base64, as the main process expects it. */
  readonly content: string
  /** To show it before it is saved: the CSP allows data: images. */
  readonly preview: string
}

type Header = { readonly width: number; readonly height: number }

function ascii(bytes: Uint8Array, from: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(from, from + length))
}

/** Type and dimensions announced by a JPEG, a PNG or a WebP; null for another file. */
export function imageHeader(bytes: Uint8Array): Header | null {
  if (bytes.length < 30) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    switch (ascii(bytes, 12, 4)) {
      case 'VP8X': {
        const uint24 = (at: number) => view.getUint16(at, true) | (view.getUint8(at + 2) << 16)
        return { width: uint24(24) + 1, height: uint24(27) + 1 }
      }
      case 'VP8 ':
        return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
      case 'VP8L': {
        const bits = view.getUint32(21, true)
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
      }
      default:
        return null
    }
  }
  if (view.getUint16(0) !== 0xffd8) return null
  let at = 2
  while (at + 9 < bytes.length) {
    if (view.getUint8(at) !== 0xff) return null
    const marker = view.getUint8(at + 1)
    if (marker === 0xff) {
      at += 1
      continue
    }
    // Start of frame: every one but the tables that share its range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: view.getUint16(at + 7), height: view.getUint16(at + 5) }
    }
    const length = view.getUint16(at + 2)
    if (length < 2) return null
    at += 2 + length
  }
  return null
}

function base64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK))
  }
  return btoa(binary)
}

export async function preparePhoto(file: File): Promise<PickedPhoto> {
  if (file.size > MAX_PHOTO_SOURCE_BYTES) throw new PhotoError('size')
  const header = imageHeader(new Uint8Array(await file.arrayBuffer()))
  if (!header) throw new PhotoError('type')
  if (header.width * header.height > MAX_PHOTO_SOURCE_PIXELS) throw new PhotoError('size')

  let bitmap: ImageBitmap
  try {
    // The orientation of the phone is applied, then forgotten with the rest of the EXIF.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PhotoError('unreadable')
  }
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new PhotoError('unreadable')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const quality of [0.86, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })
    if (blob?.type !== 'image/webp') break
    if (blob.size > MAX_PHOTO_BYTES) continue
    const content = base64(new Uint8Array(await blob.arrayBuffer()))
    return { content, preview: `data:image/webp;base64,${content}` }
  }
  throw new PhotoError('unreadable')
}
