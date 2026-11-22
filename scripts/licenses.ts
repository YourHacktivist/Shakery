/**
 * Licences of what the installer carries (section 13.3, « À propos »): the production packages
 * of package-lock.json, plus Electron and Tailwind CSS whose code is shipped too.
 *
 * Usage: npm run licenses (after any change of dependency; licenses.test.ts says when).
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type Licence = { name: string; version: string; license: string }

type Lock = { packages: Record<string, { version?: string; license?: string; dev?: boolean }> }

const SHIPPED_DEV_PACKAGES = ['node_modules/electron', 'node_modules/tailwindcss']
export const LICENCES_FILE = path.resolve(__dirname, '../src/renderer/src/assets/licenses.json')

export function shippedLicences(lock: Lock): Licence[] {
  const byName = new Map<string, Licence>()
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (key === '' || (entry.dev && !SHIPPED_DEV_PACKAGES.includes(key))) continue
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const version = entry.version ?? ''
    byName.set(`${name}@${version}`, { name, version, license: entry.license ?? '' })
  }
  return [...byName.values()].sort((a, b) => (`${a.name}@${a.version}` < `${b.name}@${b.version}` ? -1 : 1))
}

async function main() {
  const lock = JSON.parse(await readFile(path.resolve(__dirname, '../package-lock.json'), 'utf8')) as Lock
  const licences = shippedLicences(lock)
  const missing = licences.filter((licence) => licence.license === '')
  if (missing.length > 0) throw new Error(`No licence: ${missing.map((item) => item.name).join(', ')}`)
  await writeFile(LICENCES_FILE, `${JSON.stringify(licences, null, 2)}\n`, 'utf8')
  console.log(`${String(licences.length)} licences written`)
}

if (require.main === module) void main()
