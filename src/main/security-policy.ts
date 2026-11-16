/**
 * Security rules as pure functions: no Electron import, so they are unit-tested under
 * Vitest and reused by `security.ts`, `protocol.ts`, the IPC layer and the Vite config.
 */
import path from 'node:path'

export const MEDIA_SCHEME = 'shakery-media'
export const MEDIA_HOST = 'media'
export const MEDIA_ALLOWED_EXTENSIONS = ['.webp'] as const

/** Hosts reachable through `shell.openExternal` (attributions and licences only). */
export const EXTERNAL_HOST_ALLOWLIST: readonly string[] = [
  'ciqual.anses.fr',
  'www.anses.fr',
  'world.openfoodfacts.org',
  'fr.openfoodfacts.org',
  'openfoodfacts.github.io',
  'support.openfoodfacts.org',
  'www.wikidata.org',
  'iba-world.com',
  'www.iba-world.com',
  'opendatacommons.org',
  'creativecommons.org',
  'openfontlicense.org',
]

type CspMode = 'production' | 'development'

type CspOptions = {
  /** Origin of the Vite dev server, required in development for HMR. */
  devServerOrigin?: string
  /** `frame-ancestors` is ignored (with a warning) when delivered through a meta tag. */
  forMetaTag?: boolean
}

/**
 * Content Security Policy of section 6. Development adds only what the Vite dev server
 * needs (inline React Refresh preamble, injected styles, HMR websocket).
 */
export function buildCsp(mode: CspMode, options: CspOptions = {}): string {
  const dev = mode === 'development'
  const devConnect: string[] = []
  if (dev) {
    if (!options.devServerOrigin) throw new Error('devServerOrigin is required in development')
    const origin = new URL(options.devServerOrigin)
    devConnect.push(origin.origin, `${origin.protocol === 'https:' ? 'wss' : 'ws'}://${origin.host}`)
  }

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', dev ? ["'self'", "'unsafe-inline'"] : ["'self'"]],
    ['style-src', dev ? ["'self'", "'unsafe-inline'"] : ["'self'"]],
    ['img-src', ["'self'", 'data:', `${MEDIA_SCHEME}:`]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...devConnect]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'none'"]],
    ['form-action', ["'none'"]],
  ]
  if (!options.forMetaTag) directives.push(['frame-ancestors', ["'none'"]])

  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ')
}

/** `shell.openExternal` guard: https only, exact host from the allowlist, no credentials or port. */
export function isAllowedExternalUrl(
  raw: string,
  allowlist: readonly string[] = EXTERNAL_HOST_ALLOWLIST,
): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    allowlist.includes(url.hostname)
  )
}

export type RendererTarget =
  | { readonly kind: 'dev'; readonly origin: string }
  | { readonly kind: 'file'; readonly indexFileUrl: string; readonly caseInsensitive: boolean }

/**
 * True when `rawUrl` is the application's own document: same origin as the dev server,
 * or the bundled `index.html` (hash and query ignored). Used for IPC sender checks and
 * for navigation guards.
 */
export function isTrustedRendererUrl(rawUrl: string, target: RendererTarget): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  if (target.kind === 'dev') {
    return url.origin === new URL(target.origin).origin
  }

  if (url.protocol !== 'file:' || url.host !== '') return false
  const expected = new URL(target.indexFileUrl)
  const normalize = (pathname: string): string | null => {
    try {
      const decoded = decodeURIComponent(pathname)
      return target.caseInsensitive ? decoded.toLowerCase() : decoded
    } catch {
      return null
    }
  }
  const actualPath = normalize(url.pathname)
  return actualPath !== null && actualPath === normalize(expected.pathname)
}

type PathApi = Pick<typeof path, 'resolve' | 'relative' | 'isAbsolute' | 'sep' | 'join'>

/** True when `candidate` is strictly inside `root` (never equal to it). */
export function isPathInside(root: string, candidate: string, pathApi: PathApi = path): boolean {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate))
  return relative !== '' && !relative.startsWith('..') && !pathApi.isAbsolute(relative)
}

export type MediaPathResult =
  | { readonly ok: true; readonly path: string }
  | {
      readonly ok: false
      readonly reason: 'bad_url' | 'bad_host' | 'bad_segment' | 'bad_extension' | 'outside_root'
    }

const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/

/**
 * Maps `shakery-media://media/<segments>` to a file under `mediaRoot`.
 *
 * Refuses: another scheme or host, credentials, ports, queries, percent-encoded or
 * literal traversal (`..`, `.`), backslashes, drive letters, NUL bytes, empty segments,
 * any character outside `[A-Za-z0-9._-]`, and extensions other than WebP. Symbolic
 * links are checked separately by the caller with `realpath` (see `protocol.ts`).
 */
export function resolveMediaPath(
  mediaRoot: string,
  rawUrl: string,
  pathApi: PathApi = path,
): MediaPathResult {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'bad_url' }
  }
  if (
    url.protocol !== `${MEDIA_SCHEME}:` ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    return { ok: false, reason: 'bad_url' }
  }
  if (url.hostname !== MEDIA_HOST) return { ok: false, reason: 'bad_host' }

  const rawSegments = url.pathname.split('/').slice(1)
  if (rawSegments.length === 0 || rawSegments.length > 8) return { ok: false, reason: 'bad_segment' }

  const segments: string[] = []
  for (const raw of rawSegments) {
    let decoded: string
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      return { ok: false, reason: 'bad_segment' }
    }
    if (!SAFE_SEGMENT.test(decoded) || decoded === '.' || decoded === '..' || decoded.includes('..')) {
      return { ok: false, reason: 'bad_segment' }
    }
    segments.push(decoded)
  }

  const fileName = segments[segments.length - 1] ?? ''
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  if (!(MEDIA_ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, reason: 'bad_extension' }
  }

  const resolved = pathApi.resolve(mediaRoot, pathApi.join(...segments))
  if (!isPathInside(mediaRoot, resolved, pathApi)) return { ok: false, reason: 'outside_root' }
  return { ok: true, path: resolved }
}
