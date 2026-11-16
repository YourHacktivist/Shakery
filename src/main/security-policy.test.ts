import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCsp,
  isAllowedExternalUrl,
  isPathInside,
  isTrustedRendererUrl,
  resolveMediaPath,
  type RendererTarget,
} from './security-policy'

describe('buildCsp', () => {
  it('matches the production policy of section 6 exactly', () => {
    expect(buildCsp('production')).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: shakery-media:; " +
        "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; " +
        "frame-ancestors 'none'",
    )
  })

  it('drops frame-ancestors for a meta tag', () => {
    expect(buildCsp('production', { forMetaTag: true })).not.toContain('frame-ancestors')
  })

  it('never allows unsafe-inline or unsafe-eval in production', () => {
    expect(buildCsp('production')).not.toMatch(/unsafe-(inline|eval)/)
  })

  it('opens only the dev server origin and its websocket in development', () => {
    const csp = buildCsp('development', { devServerOrigin: 'http://localhost:5173' })
    expect(csp).toContain("connect-src 'self' http://localhost:5173 ws://localhost:5173")
    expect(csp).not.toContain('unsafe-eval')
  })

  it('requires the dev server origin in development', () => {
    expect(() => buildCsp('development')).toThrow()
  })
})

describe('isAllowedExternalUrl', () => {
  it.each([
    'https://ciqual.anses.fr/',
    'https://world.openfoodfacts.org/product/123',
    'https://www.wikidata.org/wiki/Q1',
  ])('accepts %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true)
  })

  it.each([
    ['plain http', 'http://ciqual.anses.fr/'],
    ['unknown host', 'https://example.com/'],
    ['suffix trick', 'https://ciqual.anses.fr.evil.com/'],
    ['credentials trick', 'https://ciqual.anses.fr@evil.com/'],
    ['credentials on an allowed host', 'https://user:pass@ciqual.anses.fr/'],
    ['custom port', 'https://ciqual.anses.fr:8443/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['file scheme', 'file:///C:/Windows/system32/calc.exe'],
    ['not a url', 'ciqual.anses.fr'],
  ])('refuses %s', (_label, url) => {
    expect(isAllowedExternalUrl(url)).toBe(false)
  })
})

describe('isTrustedRendererUrl', () => {
  const dev: RendererTarget = { kind: 'dev', origin: 'http://localhost:5173' }
  const file: RendererTarget = {
    kind: 'file',
    indexFileUrl: 'file:///C:/Program%20Files/Shakery/resources/app.asar/out/renderer/index.html',
    caseInsensitive: true,
  }

  it('accepts the dev server origin, with any path or hash', () => {
    expect(isTrustedRendererUrl('http://localhost:5173/#/recipes', dev)).toBe(true)
  })

  it('refuses another port or host in development', () => {
    expect(isTrustedRendererUrl('http://localhost:5174/', dev)).toBe(false)
    expect(isTrustedRendererUrl('http://127.0.0.1:5173/', dev)).toBe(false)
  })

  it('accepts the bundled index.html, whatever the hash, encoding or drive letter case', () => {
    expect(
      isTrustedRendererUrl(
        'file:///c:/Program Files/Shakery/resources/app.asar/out/renderer/index.html#/lab',
        file,
      ),
    ).toBe(true)
  })

  it('refuses any other local file or remote page', () => {
    expect(isTrustedRendererUrl('file:///C:/Users/me/Downloads/evil.html', file)).toBe(false)
    expect(isTrustedRendererUrl('https://example.com/', file)).toBe(false)
    expect(isTrustedRendererUrl('file://server/share/out/renderer/index.html', file)).toBe(false)
    expect(isTrustedRendererUrl('not a url', file)).toBe(false)
  })

  it('is case sensitive when the file system is', () => {
    const linux: RendererTarget = {
      kind: 'file',
      indexFileUrl: 'file:///opt/Shakery/out/renderer/index.html',
      caseInsensitive: false,
    }
    expect(isTrustedRendererUrl('file:///opt/shakery/out/renderer/index.html', linux)).toBe(false)
  })
})

describe('isPathInside', () => {
  it('handles Windows paths', () => {
    const p = path.win32
    expect(isPathInside('C:\\data\\media', 'C:\\data\\media\\a.webp', p)).toBe(true)
    expect(isPathInside('C:\\data\\media', 'C:\\data\\media', p)).toBe(false)
    expect(isPathInside('C:\\data\\media', 'C:\\data\\media-evil\\a.webp', p)).toBe(false)
    expect(isPathInside('C:\\data\\media', 'D:\\a.webp', p)).toBe(false)
  })

  it('handles POSIX paths', () => {
    const p = path.posix
    expect(isPathInside('/data/media', '/data/media/x/a.webp', p)).toBe(true)
    expect(isPathInside('/data/media', '/data/a.webp', p)).toBe(false)
  })
})

describe('resolveMediaPath', () => {
  const root = '/data/media'
  const p = path.posix

  it('maps a valid URL under the media folder', () => {
    expect(resolveMediaPath(root, 'shakery-media://media/recipes/0193a1b2-photo.webp', p)).toEqual({
      ok: true,
      path: '/data/media/recipes/0193a1b2-photo.webp',
    })
  })

  it('cannot leave the folder with dot segments, which the URL parser collapses first', () => {
    for (const url of [
      'shakery-media://media/%2e%2e/secret.webp',
      'shakery-media://media/a/../../../secret.webp',
      'shakery-media://media/a/%2E%2E/%2e%2E/secret.webp',
    ]) {
      expect(resolveMediaPath(root, url, p)).toEqual({ ok: true, path: '/data/media/secret.webp' })
    }
  })

  it.each([
    ['encoded slash traversal', 'shakery-media://media/..%2fsecret.webp'],
    ['encoded backslash', 'shakery-media://media/..%5csecret.webp'],
    ['double dot inside a name', 'shakery-media://media/a..b.webp'],
    ['NUL byte', 'shakery-media://media/a%00.webp'],
    ['drive letter', 'shakery-media://media/C:%5Cwin.webp'],
    ['malformed escape', 'shakery-media://media/%E0%A4%A.webp'],
    ['empty segment', 'shakery-media://media/a//b.webp'],
    ['trailing slash', 'shakery-media://media/a/'],
    ['hidden file', 'shakery-media://media/.secret.webp'],
  ])('refuses %s', (_label, url) => {
    const result = resolveMediaPath(root, url, p)
    expect(result.ok).toBe(false)
  })

  it('refuses another host, scheme, query, credentials or port', () => {
    expect(resolveMediaPath(root, 'shakery-media://other/a.webp', p)).toEqual({
      ok: false,
      reason: 'bad_host',
    })
    expect(resolveMediaPath(root, 'file:///data/media/a.webp', p).ok).toBe(false)
    expect(resolveMediaPath(root, 'shakery-media://media/a.webp?x=1', p).ok).toBe(false)
    expect(resolveMediaPath(root, 'shakery-media://u:p@media/a.webp', p).ok).toBe(false)
    expect(resolveMediaPath(root, 'shakery-media://media:99/a.webp', p).ok).toBe(false)
  })

  it('refuses extensions other than WebP', () => {
    expect(resolveMediaPath(root, 'shakery-media://media/a.png', p)).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
    expect(resolveMediaPath(root, 'shakery-media://media/a.webp.exe', p)).toEqual({
      ok: false,
      reason: 'bad_extension',
    })
  })

  it('works with Windows paths', () => {
    expect(
      resolveMediaPath('C:\\Users\\me\\AppData\\Shakery\\media', 'shakery-media://media/a.webp', path.win32),
    ).toEqual({ ok: true, path: 'C:\\Users\\me\\AppData\\Shakery\\media\\a.webp' })
  })
})
