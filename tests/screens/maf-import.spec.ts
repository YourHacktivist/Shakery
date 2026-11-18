/**
 * Imports the converted MAF notebooks (`npm run maf:convert`) into a fresh database and
 * captures the result. Skipped when the archive, which is personal and never committed, is absent.
 */
import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { closeApp, launchApp, projectRoot } from '../e2e/helpers'

const OUT = process.env['SHOTS_DIR'] ?? 'test-results/screens'
const ARCHIVE = join(projectRoot, 'imports', 'maf', 'maf-2025.shakery')

test('MAF notebooks import', async () => {
  test.skip(!existsSync(ARCHIVE), 'imports/maf/maf-2025.shakery is missing')
  const launched = await launchApp()
  const { app, page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await app.evaluate(({ BrowserWindow, dialog }, file) => {
      BrowserWindow.getAllWindows()[0]?.setSize(1440, 900)
      dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [file] })
    }, ARCHIVE)
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    await sidebar.getByRole('link', { name: 'Paramètres', exact: true }).click()
    await page.getByRole('button', { name: 'Choisir un fichier…' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await page.screenshot({ path: `${OUT}/maf-preview.png` })
    await page.getByRole('button', { name: 'Importer', exact: true }).click()
    await expect(page.getByText(/Import terminé/)).toBeVisible({ timeout: 30_000 })

    await sidebar.getByRole('link', { name: 'Fiches', exact: true }).click()
    await expect(page.getByText(/^[0-9]+ fiches$/)).toBeVisible()
    await page.screenshot({ path: `${OUT}/maf-recipes.png` })
    await page.getByRole('option').first().dblclick()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/maf-detail.png`, fullPage: true })
  } finally {
    await closeApp(launched)
  }
})
