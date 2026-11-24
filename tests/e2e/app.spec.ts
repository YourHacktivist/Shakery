import { _electron as electron, expect, test, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  APP_VERSION,
  closeApp,
  createUserDataDir,
  electronBinary,
  launchApp,
  projectRoot,
  testEnv,
} from './helpers'

test('the app starts, shows its version and writes a log file', async () => {
  const launched = await launchApp()
  try {
    await expect(launched.page.getByTestId('app-version')).toHaveText(`Version ${APP_VERSION}`)
    await expect(launched.page).toHaveTitle('Shakery')

    const size = await launched.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }))
    expect(size.width).toBeGreaterThanOrEqual(1100)
    expect(size.height).toBeGreaterThanOrEqual(600)

    const logFile = await launched.app.evaluate(({ app }) => app.getPath('logs'))
    expect(existsSync(join(logFile, 'main.log'))).toBe(true)
  } finally {
    await closeApp(launched)
  }
})

test('a second instance on the same data exits and leaves the first one alone', async () => {
  const launched = await launchApp()
  try {
    const second = spawn(await electronBinary(), [projectRoot], { env: testEnv(launched.userDataDir) })
    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        second.kill()
        reject(new Error('The second instance did not exit'))
      }, 20_000)
      second.on('exit', (code) => {
        clearTimeout(timer)
        resolve(code)
      })
    })
    expect(exitCode).toBe(0)
    expect(launched.app.windows()).toHaveLength(1)
  } finally {
    await closeApp(launched)
  }
})

test('a start-up window shows at once, says what happens, then gives way to the main window', async () => {
  const dir = await createUserDataDir()
  const env = { ...testEnv(dir) }
  delete env['SHAKERY_NO_SPLASH']
  const app = await electron.launch({ args: [projectRoot], env })
  try {
    const splash = await app.firstWindow()
    await expect(splash.locator('h1')).toHaveText('Shakery')
    // A new notebook: the classics load, and the window says it.
    await expect(splash.getByRole('status')).toContainText('premier lancement')
    const isMain = (page: Page) => page.url().includes('index.html')
    await expect.poll(() => app.windows().some(isMain), { timeout: 30_000 }).toBe(true)
    const main = app.windows().find(isMain)
    if (!main) throw new Error('No main window')
    await expect(main.getByTestId('app-version')).toBeVisible()
    await expect.poll(() => app.windows().filter((page) => page.url().includes('splash.html')).length).toBe(0)
  } finally {
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})
