/**
 * The two windows of the README banner (docs/assets/banner.png): the home screen of a new
 * notebook in both themes, at 1440 x 900. Run `npm run build` first; images go to SHOTS_DIR, or
 * test-results/screens. scripts/readme-banner.py then places them in the banner.
 */
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from '../e2e/helpers'

const OUT = process.env['SHOTS_DIR'] ?? 'test-results/screens'

test('home screen of the banner, both themes', async () => {
  const launched = await launchApp()
  const { app, page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1440, 900))
    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate(async (value) => {
        await window.shakery.settings.set({ key: 'appearance.theme', value })
        await window.shakery.settings.set({ key: 'appearance.animations', value: false })
        localStorage.setItem('shakery.theme', value)
      }, theme)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('main[data-scene]')).toBeVisible()
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${OUT}/banner-home-${theme}.png` })
    }
  } finally {
    await closeApp(launched)
  }
})
