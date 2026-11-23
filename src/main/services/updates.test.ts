import { describe, expect, it, vi } from 'vitest'
import { MAX_RELEASE_NOTES, updateStateSchema } from '../../shared/domain/updates'
import { releaseNotesText, UpdateService, type UpdaterPort, type UpdateServiceDeps } from './updates'

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined }

function service(port: Partial<UpdaterPort> | null, overrides: Partial<UpdateServiceDeps> = {}) {
  let skipped: string | null = null
  const deps: UpdateServiceDeps = {
    port:
      port === null
        ? null
        : {
            check: () => Promise.resolve(null),
            download: () => Promise.resolve(),
            install: () => undefined,
            ...port,
          },
    current: '0.1.0',
    now: () => 1_000,
    autoCheck: () => true,
    skippedVersion: () => skipped,
    setSkippedVersion: (version) => {
      skipped = version
    },
    backup: () => Promise.resolve(),
    beforeInstall: () => undefined,
    log: silent,
    ...overrides,
  }
  return new UpdateService(deps)
}

const RELEASE = { version: '0.2.0', notes: '<p>Nouveau</p>', date: '2026-11-23T10:00:00Z' }

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

describe('UpdateService', () => {
  it('does nothing in a development build', async () => {
    const updates = service(null)
    expect(updates.current.status).toBe('unsupported')
    expect((await updates.check()).status).toBe('unsupported')
    expect(updates.download().status).toBe('unsupported')
  })

  it('sends no request at launch when the setting is off', async () => {
    const check = vi.fn(() => Promise.resolve(null))
    const updates = service({ check }, { autoCheck: () => false })
    expect((await updates.checkOnLaunch()).status).toBe('idle')
    expect(check).not.toHaveBeenCalled()
    // An explicit check still goes.
    await updates.check()
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('finds a newer release, with plain notes and its date', async () => {
    const updates = service({ check: () => Promise.resolve(RELEASE) })
    const state = await updates.checkOnLaunch()
    expect(state).toMatchObject({
      status: 'available',
      skipped: false,
      checkedAt: 1_000,
      release: { version: '0.2.0', notes: 'Nouveau', date: Date.parse('2026-11-23T10:00:00Z') },
    })
    expect(updateStateSchema.parse(state)).toEqual(state)
  })

  it('shares one request between two checks at once', async () => {
    const check = vi.fn(() => Promise.resolve(null))
    const updates = service({ check })
    const [a, b] = await Promise.all([updates.check(), updates.check()])
    expect(check).toHaveBeenCalledTimes(1)
    expect(a.status).toBe('none')
    expect(b.status).toBe('none')
  })

  it('treats a repository without release as up to date', async () => {
    const updates = service({
      check: () => Promise.reject(new Error('No published versions on GitHub')),
    })
    expect((await updates.check()).status).toBe('none')
  })

  it('tells an offline check from another failure', async () => {
    const offline = service({ check: () => Promise.reject(new Error('net::ERR_INTERNET_DISCONNECTED')) })
    expect(await offline.check()).toMatchObject({ status: 'error', error: 'offline' })
    const broken = service({ check: () => Promise.reject(new Error('Unexpected token in YAML')) })
    expect(await broken.check()).toMatchObject({ status: 'error', error: 'failed' })
    // A library may reject with anything, not only an Error.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    const odd = service({ check: () => Promise.reject('just a string') })
    expect(await odd.check()).toMatchObject({ status: 'error', error: 'failed' })
  })

  it('refuses a version it cannot read', async () => {
    for (const version of ['', 'latest', '1.2', '../1.0.0', '1.0.0<script>', '9'.repeat(40)]) {
      const updates = service({ check: () => Promise.resolve({ ...RELEASE, version }) })
      expect((await updates.check()).status, version).toBe('none')
    }
  })

  it('keeps a date it cannot read out of the state', async () => {
    const updates = service({ check: () => Promise.resolve({ ...RELEASE, date: 'hier' }) })
    expect((await updates.check()).release?.date).toBeNull()
  })

  it('remembers an ignored version, and opens nothing by itself for it', async () => {
    const updates = service({ check: () => Promise.resolve(RELEASE) })
    await updates.check()
    expect(updates.skip('0.2.0').skipped).toBe(true)
    expect((await updates.check()).skipped).toBe(true)
  })

  it('downloads in the background, then is ready', async () => {
    let finish: () => void = () => undefined
    let report: (percent: number) => void = () => undefined
    const updates = service({
      check: () => Promise.resolve(RELEASE),
      download: (onProgress) =>
        new Promise<void>((resolve) => {
          report = onProgress
          finish = resolve
        }),
    })
    await updates.check()
    expect(updates.download().status).toBe('downloading')
    report(42.345)
    expect(updates.current.progress).toBe(42.3)
    report(Number.NaN)
    expect(updates.current.progress).toBe(0)
    report(250)
    expect(updates.current.progress).toBe(100)
    // A check during the download changes nothing.
    expect((await updates.check()).status).toBe('downloading')
    finish()
    await settle()
    expect(updates.current).toMatchObject({ status: 'ready', progress: 100 })
  })

  it('reports a failed download and lets it start again', async () => {
    const download = vi.fn(() => Promise.reject(new Error('ECONNRESET')))
    const updates = service({ check: () => Promise.resolve(RELEASE), download })
    await updates.check()
    updates.download()
    await settle()
    expect(updates.current).toMatchObject({ status: 'error', error: 'offline', progress: null })
    expect(updates.download().status).toBe('downloading')
    expect(download).toHaveBeenCalledTimes(2)
  })

  it('backs the notebook up before installing, and installs nothing when it fails', async () => {
    const calls: string[] = []
    const install = vi.fn(() => calls.push('install'))
    let backupFails = true
    const updates = service(
      { check: () => Promise.resolve(RELEASE), install },
      {
        backup: () => {
          calls.push('backup')
          return backupFails ? Promise.reject(new Error('disk full')) : Promise.resolve()
        },
        beforeInstall: () => calls.push('beforeInstall'),
      },
    )
    // Nothing to install before the download.
    await updates.install()
    expect(calls).toEqual([])

    await updates.check()
    updates.download()
    await settle()
    await updates.install()
    expect(updates.current).toMatchObject({ status: 'ready', error: 'backup' })
    expect(install).not.toHaveBeenCalled()

    backupFails = false
    await updates.install()
    expect(calls).toEqual(['backup', 'backup', 'beforeInstall', 'install'])
    expect(updates.current.error).toBeNull()
  })
})

describe('releaseNotesText', () => {
  it('keeps the lines of the notes and drops every tag', () => {
    const html =
      '<h2>Nouveautés</h2><ul><li>Une <strong>fenêtre</strong></li><li>Moins d&#39;attente &amp; plus</li></ul><p>Fin<br/>ligne</p>'
    expect(releaseNotesText(html)).toBe("Nouveautés\n\n• Une fenêtre\n• Moins d'attente & plus\n\nFin\nligne")
  })

  it('never keeps a script, a style or an event attribute', () => {
    const text = releaseNotesText(
      '<script>alert(1)</script><style>p{}</style><img src=x onerror="alert(2)">Texte<a href="javascript:alert(3)">lien</a>',
    )
    expect(text).toBe('Texte lien'.replace(' ', ''))
    expect(text).not.toMatch(/alert|<|>/)
  })

  it('decodes entities, refuses broken ones and keeps an escaped tag as text', () => {
    expect(
      releaseNotesText('&lt;b&gt; &quot;x&quot; &#x1F378; &#128512; &#0; &#xD800; &#99999999; &bogus;'),
    ).toBe(`<b> "x" ${String.fromCodePoint(0x1f378)} ${String.fromCodePoint(0x1f600)}    &bogus;`)
  })

  it('removes control characters and caps the length without cutting an emoji', () => {
    const control = String.fromCharCode(0, 7, 27)
    expect(releaseNotesText(`a${control}b`)).toBe('ab')
    const cocktail = String.fromCodePoint(0x1f378)
    const long = releaseNotesText(cocktail.repeat(MAX_RELEASE_NOTES))
    expect(long.length).toBeLessThanOrEqual(MAX_RELEASE_NOTES)
    expect(long.endsWith('…')).toBe(true)
    expect(/\p{Cs}/u.test(long)).toBe(false)
  })

  it('reads notes given per version, and anything else as empty', () => {
    expect(
      releaseNotesText([
        { version: '0.2.0', note: '<p>Deux</p>' },
        { version: '0.1.1', note: null },
        'texte',
        null,
      ]),
    ).toBe('0.2.0\n\nDeux\n\n0.1.1')
    expect(releaseNotesText(null)).toBe('')
    expect(releaseNotesText(42)).toBe('')
    expect(releaseNotesText({ note: 'x' })).toBe('')
  })

  it('survives a huge or malformed document quickly', () => {
    const start = performance.now()
    releaseNotesText('<'.repeat(300_000))
    releaseNotesText(`<p${' a="b"'.repeat(50_000)}`)
    releaseNotesText('&#'.repeat(100_000))
    releaseNotesText('<script>'.repeat(30_000))
    releaseNotesText('<a<b'.repeat(60_000))
    expect(performance.now() - start).toBeLessThan(2000)
  })
})
