import { protocol } from 'electron'
import { mkdir, readFile, realpath } from 'node:fs/promises'
import { log } from './logger'
import { isPathInside, MEDIA_SCHEME, resolveMediaPath } from './security-policy'

/** Must run before `app.whenReady()`. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: false,
        bypassCSP: false,
        corsEnabled: false,
      },
    },
  ])
}

function notFound(): Response {
  return new Response(null, { status: 404 })
}

/**
 * Serves local images from the media folder only. The URL is checked by
 * `resolveMediaPath`, then the real path (symbolic links resolved) must still be inside
 * the real media folder.
 */
export async function handleMediaProtocol(mediaRoot: string): Promise<void> {
  await mkdir(mediaRoot, { recursive: true })
  const realRoot = await realpath(mediaRoot)

  protocol.handle(MEDIA_SCHEME, async (request) => {
    if (request.method !== 'GET') return new Response(null, { status: 405 })

    const resolved = resolveMediaPath(realRoot, request.url)
    if (!resolved.ok) {
      log.warn(`Refused media request (${resolved.reason})`)
      return notFound()
    }

    try {
      const real = await realpath(resolved.path)
      if (!isPathInside(realRoot, real)) {
        log.warn('Refused media request (link outside the media folder)')
        return notFound()
      }
      const body = await readFile(real)
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' },
      })
    } catch {
      return notFound()
    }
  })
}
