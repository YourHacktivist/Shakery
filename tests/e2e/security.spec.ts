import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../../src/shared/ipc/channels'
import { APP_VERSION, closeApp, createUserDataDir, launchApp, TINY_WEBP, type LaunchedApp } from './helpers'

let launched: LaunchedApp

/**
 * Handlers Electron registers on ipcMain for its own features. They are unreachable from
 * the renderer, which never gets ipcRenderer. Any other unknown handler fails the test.
 */
const ELECTRON_INTERNAL_HANDLERS = ['IMPORT_SHARED_TEXTURE_RELEASE_RENDERER_TO_MAIN']

test.beforeAll(async () => {
  const userDataDir = await createUserDataDir()
  await mkdir(join(userDataDir, 'media', 'recipes'), { recursive: true })
  await writeFile(join(userDataDir, 'media', 'recipes', 'ok.webp'), TINY_WEBP)
  // A file next to the media folder, which the protocol must never serve.
  await writeFile(join(userDataDir, 'secret.webp'), TINY_WEBP)
  launched = await launchApp(userDataDir)
})

test.afterAll(async () => {
  await closeApp(launched)
})

test('the renderer has no access to Node or Electron', async () => {
  const globals = await launched.page.evaluate(() => ({
    require: typeof Reflect.get(globalThis, 'require'),
    process: typeof Reflect.get(globalThis, 'process'),
    ipcRenderer: typeof Reflect.get(globalThis, 'ipcRenderer'),
    module: typeof Reflect.get(globalThis, 'module'),
    Buffer: typeof Reflect.get(globalThis, 'Buffer'),
  }))
  expect(globals).toEqual({
    require: 'undefined',
    process: 'undefined',
    ipcRenderer: 'undefined',
    module: 'undefined',
    Buffer: 'undefined',
  })
})

test('window.shakery exposes the contract and nothing else', async () => {
  const shape = await launched.page.evaluate(() =>
    Object.fromEntries(
      Object.entries(window.shakery).map(([domain, ops]) => [domain, Object.keys(ops).sort()]),
    ),
  )
  const expected: Record<string, string[]> = {}
  for (const channel of IPC_CHANNELS) {
    const [domain, operation] = channel.split('.') as [string, string]
    ;(expected[domain] ??= []).push(operation)
  }
  for (const operations of Object.values(expected)) operations.sort()
  expect(shape).toEqual(expected)
})

test('the main process listens to no IPC channel outside the contract', async () => {
  const channels = await launched.app.evaluate(({ ipcMain }) => {
    const handlers = (ipcMain as unknown as { _invokeHandlers?: Map<string, unknown> })._invokeHandlers
    return {
      listeners: ipcMain.eventNames().map(String),
      handlers: handlers ? [...handlers.keys()].sort() : null,
    }
  })
  // 'error' is a no-op listener Electron installs itself so an emitted 'error' never crashes the app.
  expect(channels.listeners.filter((name) => name !== 'error')).toEqual([])
  if (channels.handlers !== null) {
    const ours = channels.handlers.filter((name) => !ELECTRON_INTERNAL_HANDLERS.includes(name))
    expect(ours).toEqual([...IPC_CHANNELS].sort())
  }
})

test('IPC answers valid calls and refuses invalid input', async () => {
  const results = await launched.page.evaluate(async () => {
    const valid = await window.shakery.app.getVersion()
    const call = window.shakery.app.getVersion as unknown as (input: unknown) => Promise<unknown>
    const invalid = await call({ injected: '../../etc/passwd' })
    return { valid, invalid }
  })
  expect(results.valid).toEqual({ ok: true, data: { version: APP_VERSION } })
  expect(results.invalid).toMatchObject({ ok: false, code: 'INVALID_INPUT' })
})

test('navigation outside the application is blocked', async () => {
  const before = launched.page.url()
  for (const target of ['https://example.com/', 'file:///C:/Windows/win.ini']) {
    await launched.page.evaluate((url) => {
      window.location.href = url
    }, target)
    await launched.page.waitForTimeout(500)
    expect(launched.page.url()).toBe(before)
  }
})

test('window.open creates no window', async () => {
  const opened = await launched.page.evaluate(() => window.open('https://example.com/') === null)
  expect(opened).toBe(true)
  await launched.page.waitForTimeout(300)
  expect(launched.app.windows()).toHaveLength(1)
})

test('the CSP blocks inline scripts and eval', async () => {
  const outcome = await launched.page.evaluate(async () => {
    const violations: string[] = []
    document.addEventListener('securitypolicyviolation', (event) => violations.push(event.effectiveDirective))
    const script = document.createElement('script')
    script.textContent = 'window.__shakeryInline = true'
    document.head.appendChild(script)
    // CDP's Runtime.evaluate allows eval while it runs (allowUnsafeEvalBlockedByCSP), so the
    // attempt happens in a later task, under the page's own policy.
    const evalAllowed = await new Promise<boolean>((resolve) => {
      setTimeout(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          const generated = new Function('return 1') as () => unknown
          generated()
          resolve(true)
        } catch {
          resolve(false)
        }
      }, 0)
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { inlineRan: Reflect.get(window, '__shakeryInline') === true, evalAllowed, violations }
  })
  expect(outcome.inlineRan).toBe(false)
  expect(outcome.evalAllowed).toBe(false)
  expect(outcome.violations).toContain('script-src-elem')
})

test('permission requests are denied', async () => {
  const outcome = await launched.page.evaluate(async () => {
    const notification = await Notification.requestPermission()
    let microphone = 'granted'
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      microphone = error instanceof DOMException ? error.name : 'error'
    }
    return { notification, microphone }
  })
  expect(outcome.notification).toBe('denied')
  expect(outcome.microphone).not.toBe('granted')
})

test('the media protocol serves the media folder only', async () => {
  const results = await launched.page.evaluate(async () => {
    const load = (src: string): Promise<boolean> =>
      new Promise((resolve) => {
        const image = new Image()
        image.onload = () => {
          resolve(true)
        }
        image.onerror = () => {
          resolve(false)
        }
        image.src = src
      })
    return {
      valid: await load('shakery-media://media/recipes/ok.webp'),
      traversal: await load('shakery-media://media/..%2fsecret.webp'),
      dotSegments: await load('shakery-media://media/recipes/%2e%2e/%2e%2e/secret.webp'),
      otherHost: await load('shakery-media://other/recipes/ok.webp'),
      absolute: await load('shakery-media://media/C:%5CWindows%5Cwin.webp'),
    }
  })
  expect(results).toEqual({
    valid: true,
    traversal: false,
    dotSegments: false,
    otherHost: false,
    absolute: false,
  })
})
