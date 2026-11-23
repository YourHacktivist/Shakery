import { expect, test } from '@playwright/test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { APP_VERSION, closeApp, electronBinary, launchApp, projectRoot, testEnv } from './helpers'

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
