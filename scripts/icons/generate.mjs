/**
 * Generates the application icons from the logo provided by the user, at every size.
 *
 * Run with Electron, which provides the image scaling used here:
 *   npx electron scripts/icons/generate.mjs
 *
 * Input:   design/assets/logo/shakery-logo-master-1024.png
 * Outputs: build/icon.ico (Windows: 16, 24, 32, 48, 64, 128, 256)
 *          build/icon.icns (macOS: 16 to 1024, retina variants included)
 *          build/icon.png (1024 px master), resources/icon.png (512 px, window icon in development)
 *          build/icon-preview/*.png (every size, to review the result)
 *
 * The logo itself is never redrawn (decision D-025). For 32 px and below, the transparent
 * margin around it is cropped so the logo fills the icon.
 */
import { app, nativeImage } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const master = nativeImage.createFromPath(
  join(root, 'design', 'assets', 'logo', 'shakery-logo-master-1024.png'),
)

/** Square crop around the visible pixels of the logo, with a small margin. */
function tightCrop(image) {
  const { width, height } = image.getSize()
  const bitmap = image.toBitmap() // BGRA
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (bitmap[(y * width + x) * 4 + 3] > 16) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  const side = Math.max(right - left, bottom - top) + 1
  const margin = Math.round(side * 0.03)
  const size = Math.min(width, height, side + 2 * margin)
  const cx = Math.round((left + right) / 2)
  const cy = Math.round((top + bottom) / 2)
  const x = Math.max(0, Math.min(width - size, cx - Math.floor(size / 2)))
  const y = Math.max(0, Math.min(height - size, cy - Math.floor(size / 2)))
  return image.crop({ x, y, width: size, height: size })
}

const tight = tightCrop(master)

function png(size) {
  const source = size <= 32 ? tight : master
  return source.resize({ width: size, height: size, quality: 'best' }).toPNG()
}

/** ICO with PNG-compressed entries (supported since Windows Vista). */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  const directory = Buffer.alloc(16 * entries.length)
  let offset = 6 + directory.length
  entries.forEach(({ size, data }, i) => {
    const base = i * 16
    directory.writeUInt8(size >= 256 ? 0 : size, base)
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1)
    directory.writeUInt8(0, base + 2)
    directory.writeUInt8(0, base + 3)
    directory.writeUInt16LE(1, base + 4)
    directory.writeUInt16LE(32, base + 6)
    directory.writeUInt32LE(data.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    offset += data.length
  })
  return Buffer.concat([header, directory, ...entries.map((e) => e.data)])
}

/** ICNS with PNG chunks. */
function buildIcns(chunks) {
  const parts = chunks.map(({ type, data }) => {
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(data.length + 8, 4)
    return Buffer.concat([head, data])
  })
  const body = Buffer.concat(parts)
  const head = Buffer.alloc(8)
  head.write('icns', 0, 'ascii')
  head.writeUInt32BE(body.length + 8, 4)
  return Buffer.concat([head, body])
}

app.whenReady().then(() => {
  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  writeFileSync(
    join(root, 'build', 'icon.ico'),
    buildIco(icoSizes.map((size) => ({ size, data: png(size) }))),
  )

  // icp4 16, icp5 32, ic11 16@2x, ic12 32@2x, ic07 128, ic08 256, ic13 128@2x,
  // ic09 512, ic14 256@2x, ic10 512@2x (1024).
  writeFileSync(
    join(root, 'build', 'icon.icns'),
    buildIcns([
      { type: 'icp4', data: png(16) },
      { type: 'icp5', data: png(32) },
      { type: 'ic11', data: png(32) },
      { type: 'ic12', data: png(64) },
      { type: 'ic07', data: png(128) },
      { type: 'ic08', data: png(256) },
      { type: 'ic13', data: png(256) },
      { type: 'ic09', data: png(512) },
      { type: 'ic14', data: png(512) },
      { type: 'ic10', data: png(1024) },
    ]),
  )

  writeFileSync(join(root, 'build', 'icon.png'), png(1024))
  writeFileSync(join(root, 'resources', 'icon.png'), png(512))

  const preview = join(root, 'build', 'icon-preview')
  mkdirSync(preview, { recursive: true })
  for (const size of icoSizes) writeFileSync(join(preview, `icon-${size}.png`), png(size))

  console.log('Icons written to build/ and resources/')
  app.quit()
})
