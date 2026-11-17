/**
 * Generates the application icons from the logo (section 11).
 *
 * Run with Electron, which provides the image scaling and SVG rendering used here:
 *   npx electron scripts/icons/generate.mjs
 *
 * Inputs:  design/assets/logo/shakery-logo-master-1024.png (full logo, 48 px and above)
 *          build/icon-small.svg (simplified mark, 16 to 32 px)
 * Outputs: build/icon.ico (Windows: 16, 24, 32, 48, 64, 128, 256)
 *          build/icon.icns (macOS: 16 to 1024, retina variants included)
 *          build/icon.png (1024 px master), resources/icon.png (512 px, window icon in development)
 *          build/icon-preview/*.png (every size, to review the result)
 */
import { app, BrowserWindow, nativeImage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const master = nativeImage.createFromPath(
  join(root, 'design', 'assets', 'logo', 'shakery-logo-master-1024.png'),
)
const smallSvg = readFileSync(join(root, 'build', 'icon-small.svg'), 'utf8')
const SMALL_SIZES = new Set([16, 24, 32])

function fromMaster(size) {
  return master.resize({ width: size, height: size, quality: 'best' }).toPNG()
}

/** Renders the simplified SVG at the exact pixel size in a hidden window (no file written). */
async function renderSmall(sizes) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, sandbox: true } })
  await win.loadURL('data:text/html,<!doctype html><title>icons</title>')
  const svgUrl = `data:image/svg+xml;base64,${Buffer.from(smallSvg).toString('base64')}`
  const result = await win.webContents.executeJavaScript(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(svgUrl)};
    await img.decode();
    const out = {};
    for (const size of ${JSON.stringify(sizes)}) {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      out[size] = canvas.toDataURL('image/png').split(',')[1];
    }
    return out;
  })()`)
  win.destroy()
  return Object.fromEntries(
    Object.entries(result).map(([size, b64]) => [Number(size), Buffer.from(b64, 'base64')]),
  )
}

/** ICO with PNG-compressed entries (supported since Windows Vista). */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  const directory = Buffer.alloc(16 * entries.length)
  let offset = 6 + directory.length
  entries.forEach(({ size, png }, i) => {
    const base = i * 16
    directory.writeUInt8(size >= 256 ? 0 : size, base)
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1)
    directory.writeUInt8(0, base + 2)
    directory.writeUInt8(0, base + 3)
    directory.writeUInt16LE(1, base + 4)
    directory.writeUInt16LE(32, base + 6)
    directory.writeUInt32LE(png.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    offset += png.length
  })
  return Buffer.concat([header, directory, ...entries.map((e) => e.png)])
}

/** ICNS with PNG chunks. */
function buildIcns(chunks) {
  const parts = chunks.map(({ type, png }) => {
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(png.length + 8, 4)
    return Buffer.concat([head, png])
  })
  const body = Buffer.concat(parts)
  const head = Buffer.alloc(8)
  head.write('icns', 0, 'ascii')
  head.writeUInt32BE(body.length + 8, 4)
  return Buffer.concat([head, body])
}

app.whenReady().then(async () => {
  const small = await renderSmall([16, 24, 32, 64])
  const png = (size) => (SMALL_SIZES.has(size) ? small[size] : fromMaster(size))

  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  writeFileSync(join(root, 'build', 'icon.ico'), buildIco(icoSizes.map((size) => ({ size, png: png(size) }))))

  // icp4 16, icp5 32, ic11 16@2x, ic12 32@2x (simplified mark: these appear at small sizes);
  // ic07 128, ic08 256, ic09 512, ic10 512@2x, ic13 128@2x, ic14 256@2x (full logo).
  writeFileSync(
    join(root, 'build', 'icon.icns'),
    buildIcns([
      { type: 'icp4', png: small[16] },
      { type: 'icp5', png: small[32] },
      { type: 'ic11', png: small[32] },
      { type: 'ic12', png: small[64] },
      { type: 'ic07', png: fromMaster(128) },
      { type: 'ic08', png: fromMaster(256) },
      { type: 'ic13', png: fromMaster(256) },
      { type: 'ic09', png: fromMaster(512) },
      { type: 'ic14', png: fromMaster(512) },
      { type: 'ic10', png: fromMaster(1024) },
    ]),
  )

  writeFileSync(join(root, 'build', 'icon.png'), fromMaster(1024))
  writeFileSync(join(root, 'resources', 'icon.png'), fromMaster(512))

  const preview = join(root, 'build', 'icon-preview')
  mkdirSync(preview, { recursive: true })
  for (const size of icoSizes) writeFileSync(join(preview, `icon-${size}.png`), png(size))
  writeFileSync(join(preview, 'small-64.png'), small[64])

  console.log('Icons written to build/ and resources/')
  app.quit()
})
