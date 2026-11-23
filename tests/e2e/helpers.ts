import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export const projectRoot = resolve(__dirname, '..', '..')

/** Version of the application under test, as package.json gives it. */
export const APP_VERSION = (
  JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as { version: string }
).version

export type LaunchedApp = {
  app: ElectronApplication
  page: Page
  userDataDir: string
}

export async function createUserDataDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'shakery-e2e-'))
}

/** Environment of a test instance: isolated data folder, bundled renderer (file://). */
export function testEnv(userDataDir: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  delete env['ELECTRON_RENDERER_URL']
  delete env['ELECTRON_RUN_AS_NODE']
  env['SHAKERY_USER_DATA_DIR'] = userDataDir
  // The first-launch assistant has its own test (onboarding.spec.ts).
  env['SHAKERY_SKIP_ONBOARDING'] = '1'
  return env
}

export async function launchApp(
  userDataDir?: string,
  extraEnv: Record<string, string> = {},
): Promise<LaunchedApp> {
  const dir = userDataDir ?? (await createUserDataDir())
  const app = await electron.launch({ args: [projectRoot], env: { ...testEnv(dir), ...extraEnv } })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir: dir }
}

export async function closeApp(launched: LaunchedApp): Promise<void> {
  await launched.app.close()
  await rm(launched.userDataDir, { recursive: true, force: true })
}

/** Path of the Electron binary installed in node_modules, as `require('electron')` returns it. */
export async function electronBinary(): Promise<string> {
  const relative = (await readFile(join(projectRoot, 'node_modules', 'electron', 'path.txt'), 'utf8')).trim()
  return join(projectRoot, 'node_modules', 'electron', 'dist', relative)
}

/** Smallest valid WebP image (1 × 1 px, lossless). */
export const TINY_WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
