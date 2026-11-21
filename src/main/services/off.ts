/**
 * Optional bottle lookup by barcode on Open Food Facts (sections 3, 6 and 9): the only request
 * the application ever sends. Hard-coded host, HTTPS only, a User-Agent naming Shakery and its
 * version (no personal data), 8 s timeout, capped response size, client-side rate limit, Zod
 * validation of the answer. The raw answer is kept in off_cache. Setting off = no request.
 */
import { z } from 'zod'
import { ALLERGEN_CODES, type AllergenCode } from '../../shared/domain/allergens'
import { DomainError } from '../errors'

export const OFF_HOST = 'world.openfoodfacts.org'
const FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'brands',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'nutriments',
  'allergens_tags',
].join(',')
export const OFF_TIMEOUT_MS = 8000
export const OFF_MAX_BYTES = 1_000_000
/** Open Food Facts allows 100 product reads per minute. */
export const OFF_RATE_PER_MINUTE = 100
const CACHE_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

export const BARCODE = /^\d{6,14}$/

const numberLike = z.union([z.number(), z.string()]).transform((value, context) => {
  const parsed = typeof value === 'number' ? value : Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: 'custom', message: 'not a number' })
    return z.NEVER
  }
  return parsed
})

const answerSchema = z.object({
  status: z.number().int(),
  product: z
    .object({
      product_name: z.string().max(500).optional(),
      product_name_fr: z.string().max(500).optional(),
      brands: z.string().max(500).optional(),
      quantity: z.string().max(200).optional(),
      product_quantity: numberLike.optional().catch(undefined),
      product_quantity_unit: z.string().max(20).optional(),
      nutriments: z.record(z.string(), z.unknown()).optional(),
      allergens_tags: z.array(z.string().max(100)).max(100).optional(),
    })
    .optional(),
})

export type OffProduct = {
  readonly barcode: string
  readonly name: string | null
  readonly brand: string | null
  readonly volumeMl: number | null
  readonly abv: number | null
  readonly allergens: AllergenCode[]
}

const ALLERGEN_TAGS: Record<string, AllergenCode> = {
  'en:gluten': 'gluten',
  'en:crustaceans': 'crustaceans',
  'en:eggs': 'eggs',
  'en:fish': 'fish',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soy',
  'en:milk': 'milk',
  'en:nuts': 'nuts',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:lupin': 'lupin',
  'en:molluscs': 'molluscs',
}

/** « 70 cl », « 0,7 L », « 750 ml » in millilitres; null for a weight or an unreadable text. */
export function volumeInMl(
  quantity: number | undefined,
  unit: string | undefined,
  text: string | undefined,
): number | null {
  const factor = (word: string): number | null => {
    const lower = word.trim().toLowerCase()
    if (lower === 'ml') return 1
    if (lower === 'cl') return 10
    if (lower === 'dl') return 100
    if (lower === 'l') return 1000
    return null
  }
  if (quantity !== undefined && unit !== undefined) {
    const f = factor(unit)
    if (f !== null && quantity > 0) return Math.round(quantity * f)
  }
  const match = /(\d+(?:[.,]\d+)?)\s*(ml|cl|dl|l)\b/i.exec(text ?? '')
  if (!match) return null
  const f = factor(match[2] ?? '')
  const value = Number((match[1] ?? '').replace(',', '.'))
  return f === null || !(value > 0) ? null : Math.round(value * f)
}

function abvOf(nutriments: Record<string, unknown> | undefined): number | null {
  for (const key of ['alcohol_100g', 'alcohol_value', 'alcohol']) {
    const raw = nutriments?.[key]
    const value =
      typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.replace(',', '.')) : NaN
    if (Number.isFinite(value) && value >= 0 && value <= 100) return Math.round(value * 10) / 10
  }
  return null
}

const text = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed.slice(0, 120)
}

/** The fields Shakery can take from an answer; null when the product is unknown. */
export function readAnswer(barcode: string, payload: unknown): OffProduct | null {
  const parsed = answerSchema.safeParse(payload)
  if (!parsed.success) throw new DomainError('UNAVAILABLE', 'Unexpected answer from Open Food Facts')
  const product = parsed.data.product
  if (parsed.data.status !== 1 || !product) return null
  const allergens = new Set<AllergenCode>()
  for (const tag of product.allergens_tags ?? []) {
    const code = ALLERGEN_TAGS[tag]
    if (code && (ALLERGEN_CODES as readonly string[]).includes(code)) allergens.add(code)
  }
  return {
    barcode,
    name: text(product.product_name_fr) ?? text(product.product_name),
    brand: text(product.brands?.split(',')[0]),
    volumeMl: volumeInMl(product.product_quantity, product.product_quantity_unit, product.quantity),
    abv: abvOf(product.nutriments),
    allergens: [...allergens],
  }
}

export type OffDeps = {
  readonly enabled: () => boolean
  readonly fetch: typeof fetch
  readonly appVersion: string
  readonly now: () => number
  readonly cache: {
    get(barcode: string): { payload: string; fetchedAt: number } | undefined
    set(barcode: string, payload: string, fetchedAt: number): void
  }
}

/** Reads at most `max` bytes of a body, refusing a longer one. */
async function readCapped(response: Response, max: number): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? '0')
  if (declared > max) throw new DomainError('UNAVAILABLE', 'Answer too large')
  const reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array> | undefined
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      throw new DomainError('UNAVAILABLE', 'Answer too large')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function createOffClient(deps: OffDeps) {
  const sent: number[] = []
  return {
    async lookup(barcode: string): Promise<OffProduct | null> {
      if (!deps.enabled()) throw new DomainError('UNAVAILABLE', 'Open Food Facts lookup is turned off')
      if (!BARCODE.test(barcode)) throw new DomainError('INVALID_INPUT', 'Invalid barcode')
      const now = deps.now()
      const cached = deps.cache.get(barcode)
      if (cached && now - cached.fetchedAt < CACHE_DAYS * DAY) {
        return readAnswer(barcode, JSON.parse(cached.payload) as unknown)
      }
      while (sent.length > 0 && now - (sent[0] ?? 0) > 60_000) sent.shift()
      if (sent.length >= OFF_RATE_PER_MINUTE)
        throw new DomainError('UNAVAILABLE', 'Too many lookups, wait a minute')
      sent.push(now)
      let body: string
      try {
        const response = await deps.fetch(
          `https://${OFF_HOST}/api/v2/product/${barcode}.json?fields=${FIELDS}`,
          {
            headers: {
              'User-Agent': `Shakery/${deps.appVersion} (offline desktop notebook)`,
              Accept: 'application/json',
            },
            redirect: 'error',
            signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
          },
        )
        // An unknown barcode answers 404 with a JSON body.
        if (!response.ok && response.status !== 404) {
          throw new DomainError('UNAVAILABLE', `Open Food Facts answered ${String(response.status)}`)
        }
        body = await readCapped(response, OFF_MAX_BYTES)
      } catch (error) {
        if (error instanceof DomainError) throw error
        throw new DomainError('UNAVAILABLE', 'Open Food Facts cannot be reached')
      }
      let payload: unknown
      try {
        payload = JSON.parse(body)
      } catch {
        throw new DomainError('UNAVAILABLE', 'Unexpected answer from Open Food Facts')
      }
      const product = readAnswer(barcode, payload)
      deps.cache.set(barcode, body, now)
      return product
    },
  }
}
