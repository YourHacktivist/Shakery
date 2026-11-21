import { describe, expect, it, vi } from 'vitest'
import { createOffClient, OFF_HOST, OFF_MAX_BYTES, volumeInMl, type OffDeps } from './off'

const FOUND = {
  code: '3245990250203',
  status: 1,
  product: {
    product_name: 'Dry gin',
    product_name_fr: 'Gin sec',
    brands: 'Maison Exemple, Groupe',
    quantity: '70 cl',
    nutriments: { alcohol_100g: 40 },
    allergens_tags: ['en:sulphur-dioxide-and-sulphites', 'en:unknown'],
  },
}

function client(overrides: Partial<OffDeps> & { enabled?: () => boolean } = {}) {
  const store = new Map<string, { payload: string; fetchedAt: number }>()
  const fetcher = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(FOUND), { status: 200 })),
  )
  const deps: OffDeps = {
    enabled: () => true,
    fetch: fetcher,
    appVersion: '0.1.0',
    now: () => 1_000_000,
    cache: {
      get: (barcode) => store.get(barcode),
      set: (barcode, payload, fetchedAt) => store.set(barcode, { payload, fetchedAt }),
    },
    ...overrides,
  }
  return { off: createOffClient(deps), fetcher: deps.fetch as typeof fetcher, store }
}

describe('Open Food Facts', () => {
  it('sends no request at all when the setting is off', async () => {
    const { off, fetcher } = client({ enabled: () => false })
    await expect(off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refuses a barcode that is not 6 to 14 digits before any request', async () => {
    const { off, fetcher } = client()
    for (const bad of ['12345', 'abc123456', '3245990250203/../x', '123456789012345']) {
      await expect(off.lookup(bad)).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('asks the fixed host over HTTPS, names Shakery, reads the useful fields and caches the answer', async () => {
    const { off, fetcher, store } = client()
    const product = await off.lookup('3245990250203')
    expect(product).toEqual({
      barcode: '3245990250203',
      name: 'Gin sec',
      brand: 'Maison Exemple',
      volumeMl: 700,
      abv: 40,
      allergens: ['sulphites'],
    })
    const [url, init] = fetcher.mock.calls[0] ?? []
    const parsed = new URL(url as string)
    expect(parsed.protocol).toBe('https:')
    expect(parsed.host).toBe(OFF_HOST)
    expect(parsed.pathname).toBe('/api/v2/product/3245990250203.json')
    expect(new Headers(init?.headers).get('User-Agent')).toMatch(/^Shakery\/0\.1\.0 /)
    expect(store.has('3245990250203')).toBe(true)
    // Cached: the second lookup sends nothing.
    await off.lookup('3245990250203')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('answers null for an unknown barcode', async () => {
    const { off } = client({
      fetch: () =>
        Promise.resolve(new Response('{"status":0,"status_verbose":"product not found"}', { status: 404 })),
    })
    expect(await off.lookup('00000000')).toBeNull()
  })

  it('refuses an oversized, broken or unreachable answer', async () => {
    const big = client({
      fetch: () => Promise.resolve(new Response('x'.repeat(OFF_MAX_BYTES + 10), { status: 200 })),
    })
    await expect(big.off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    const broken = client({ fetch: () => Promise.resolve(new Response('<html>', { status: 200 })) })
    await expect(broken.off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    const odd = client({
      fetch: () => Promise.resolve(new Response('{"status":"yes","product":[]}', { status: 200 })),
    })
    await expect(odd.off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    const offline = client({ fetch: () => Promise.reject(new TypeError('fetch failed')) })
    await expect(offline.off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    const server = client({ fetch: () => Promise.resolve(new Response('', { status: 503 })) })
    await expect(server.off.lookup('3245990250203')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })

  it('reads volumes in ml, cl and l, and leaves weights out', () => {
    expect(volumeInMl(700, 'ml', undefined)).toBe(700)
    expect(volumeInMl(undefined, undefined, '0,7 L')).toBe(700)
    expect(volumeInMl(undefined, undefined, '75cl')).toBe(750)
    expect(volumeInMl(500, 'g', '500 g')).toBeNull()
    expect(volumeInMl(undefined, undefined, undefined)).toBeNull()
  })
})
