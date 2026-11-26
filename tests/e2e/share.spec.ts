import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('the whole notebook exported then imported again, a recipe copied as Markdown, Open Food Facts turned off', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })

    // A recipe copied as Markdown: the clipboard of the system receives it.
    await page.keyboard.press('Control+K')
    await page.getByRole('dialog', { name: 'Palette de recherche' }).getByRole('combobox').fill('negroni')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible()
    // Sharing sits in the « Plus » menu of the recipe (D-057).
    await page.getByRole('button', { name: 'Plus', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Partager', exact: true }).click()
    await page.getByRole('button', { name: 'Copier en Markdown' }).click()
    await expect(page.getByText('Fiche copiée en Markdown.')).toBeVisible()
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText())
    expect(copied).toMatch(/^# Negroni\n/)
    expect(copied).toContain('Campari')
    await page.keyboard.press('Escape')

    // Full export: the save dialog of the main process answers with a temporary file.
    const folder = await mkdtemp(path.join(tmpdir(), 'shakery-export-'))
    const file = path.join(folder, 'carnet.shakery')
    await app.evaluate(({ dialog }, target) => {
      dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: target })
      dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [target] })
    }, file)
    await sidebar.getByRole('link', { name: 'Paramètres', exact: true }).click()
    await page.getByRole('button', { name: 'Exporter tout le carnet' }).click()
    await expect(page.getByText('Carnet exporté.')).toBeVisible({ timeout: 60_000 })
    const archive = await readFile(file)
    expect(archive.subarray(0, 2).toString('latin1')).toBe('PK')

    // The same file imported back: everything is already there.
    await page.getByRole('button', { name: 'Choisir un fichier…' }).click()
    await expect(page.getByRole('button', { name: 'Importer', exact: true })).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Importer', exact: true }).click()
    await expect(page.getByText(/^Import terminé/)).toBeVisible({ timeout: 60_000 })

    // Open Food Facts off: the setting is kept and the lookup disappears from the bottle form.
    const toggle = page.getByRole('switch', { name: 'Recherche par code-barres' })
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    const enabled = await page.evaluate(() => window.shakery.off.status())
    expect(enabled).toEqual({ ok: true, data: { enabled: false } })
  } finally {
    await closeApp(launched)
  }
})
