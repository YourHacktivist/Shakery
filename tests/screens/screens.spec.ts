/** Captures the main screens of a fresh database with one Negroni, for visual review. */
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from '../e2e/helpers'

const OUT = process.env['SHOTS_DIR'] ?? 'test-results/screens'
const NBSP = String.fromCharCode(0xa0)

test('screens', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await launched.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setSize(1440, 900)
    })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/home-empty.png` })
    await page.keyboard.press('Control+Shift+N')
    await page.getByLabel('Nom', { exact: true }).fill('Negroni')
    const items: [string, string, string][] = [
      ['Gin maison', 'Gin et genièvre', '30'],
      ['Bitter maison', 'Bitters apéritifs', '30'],
      ['Vermouth maison', 'Vermouths', '30'],
    ]
    let position = 0
    for (const [name, category, dose] of items) {
      position += 1
      await page.getByRole('button', { name: 'Ajouter un ingrédient' }).click()
      await page.getByRole('combobox', { name: `Ingrédient de la ligne ${position}` }).fill(name)
      await page.getByRole('option', { name: `Créer «${NBSP}${name}${NBSP}»` }).click()
      const dialog = page.getByRole('dialog', { name: 'Nouvel ingrédient' })
      await dialog.getByLabel('Catégorie').selectOption({ label: category })
      if (position === 1) await page.screenshot({ path: `${OUT}/dialog.png` })
      await dialog.getByRole('button', { name: 'Créer l’ingrédient' }).click()
      await expect(dialog).toBeHidden()
      await page.getByLabel(`Dose de la ligne ${position}`, { exact: true }).fill(dose)
    }
    await page.getByLabel('Méthode', { exact: true }).selectOption({ label: 'Verre à mélange' })
    await page.screenshot({ path: `${OUT}/editor.png` })
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/detail.png` })
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    for (const [link, file] of [
      ['Fiches', 'recipes'],
      ['Mon bar', 'bar'],
      ['Paramètres', 'settings'],
      ['Accueil', 'home'],
    ] as const) {
      await sidebar.getByRole('link', { name: link, exact: true }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${file}.png` })
    }
    await page.keyboard.press('Control+N')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/quick.png` })
  } finally {
    await closeApp(launched)
  }
})
