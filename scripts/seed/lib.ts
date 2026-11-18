/**
 * Shared helpers of the seed pipeline (section 9). The pipeline runs on the developer's machine
 * only, never in the application. Every network answer is cached in scripts/seed/.cache/ so that
 * a build can be replayed offline and gives the same files.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const SEED_DIR = path.resolve(__dirname)
export const CACHE_DIR = path.join(SEED_DIR, '.cache')
export const REVIEW_DIR = path.join(SEED_DIR, 'review')
export const DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'seed')

/** Descriptive User-Agent, required by Wikidata; it carries no personal data. */
export const USER_AGENT = 'ShakerySeedBuilder/0.1 (offline seed build of the Shakery desktop app)'

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/** Fetches a URL once and keeps the body in the cache; `--refresh` forces a new download. */
export async function fetchCached(url: string, file: string, accept = 'application/json'): Promise<Buffer> {
  const target = path.join(CACHE_DIR, file)
  if (existsSync(target) && !process.argv.includes('--refresh')) return readFile(target)
  await mkdir(path.dirname(target), { recursive: true })
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } })
    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer())
      await writeFile(target, body)
      // Polite pacing between two requests to the same public service.
      await sleep(1500)
      return body
    }
    if (attempt >= 6 || (response.status !== 429 && response.status < 500)) {
      throw new Error(`${url} answered ${response.status}`)
    }
    // The query service may limit to one request per minute during an outage.
    await sleep(response.status === 429 ? 65_000 : attempt * 5000)
  }
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T
}

/** Pretty JSON with a final newline, the format of the reviewed files. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

/** « Crème de cassis » becomes « creme-de-cassis ». */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** French capitalisation of a Wikidata label: « gin » becomes « Gin ». */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1)
}
