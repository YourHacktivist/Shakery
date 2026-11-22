/**
 * Visual review (section 11, D-038): every screen in both themes and three window sizes, with
 * a measure of what overflows, of the contrast of texts and of controls without a name. Writes
 * the images and report.json; the assertions live in tests/e2e, this is a tool to look with.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from '../e2e/helpers'
import { auditPage } from '../e2e/page-audit'

const OUT = process.env['SHOTS_DIR'] ?? 'test-results/screens'
const SIZES = [
  { name: 'min', width: 1100, height: 700 },
  { name: 'base', width: 1440, height: 900 },
  { name: 'wide', width: 2560, height: 1440 },
] as const

test('every screen, both themes, three sizes', async () => {
  test.setTimeout(900_000)
  await mkdir(OUT, { recursive: true })
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const id = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      return list.ok ? (list.data.find((recipe) => recipe.name === 'Negroni')?.id ?? '') : ''
    })
    const routes = [
      ['home', '/'],
      ['recipes', '/recipes'],
      ['detail', `/recipes/${id}`],
      ['editor', `/recipes/${id}/edit`],
      ['lab-picker', '/lab'],
      ['lab', `/lab/${id}`],
      ['journal', '/journal'],
      ['notebook', '/notebook'],
      ['bar', '/bar'],
      ['preps', '/preps'],
      ['collections', '/collections'],
      ['practice', '/practice'],
      ['calculators', '/calculators'],
      ['settings', '/settings'],
      ['prepare', `/prepare/${id}`],
    ] as const
    const report: Record<string, Awaited<ReturnType<typeof auditPage>>> = {}
    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate(async (value) => {
        await window.shakery.settings.set({ key: 'appearance.theme', value })
        localStorage.setItem('shakery.theme', value)
      }, theme)
      await page.reload()
      await expect(page.getByTestId('app-version')).toBeVisible()
      for (const size of SIZES) {
        await app.evaluate(({ BrowserWindow }, { width, height }) => {
          const window = BrowserWindow.getAllWindows()[0]
          window?.setFullScreen(false)
          window?.setContentSize(width, height)
        }, size)
        for (const [name, route] of routes) {
          await page.evaluate((to) => {
            location.hash = `#${to}`
          }, route)
          // The preparation mode takes the whole screen: a little longer to settle.
          await page.waitForTimeout(name === 'prepare' ? 1500 : 1100)
          const key = `${theme}-${size.name}-${name}`
          report[key] = await auditPage(page)
          await page.screenshot({ path: `${OUT}/${key}.png` })
        }
        await page.evaluate(() => {
          location.hash = '#/'
        })
        await page.waitForTimeout(600)
      }
    }
    await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 1))
  } finally {
    await closeApp(launched)
  }
})
