import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('the lab changes a dose live, writes nothing before saving, then saves a new version', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await page.keyboard.press('Control+K')
    await page.getByRole('dialog', { name: 'Palette de recherche' }).getByRole('combobox').fill('negroni')
    await page
      .getByRole('option', { name: /^Negroni/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible()

    await page.keyboard.press('Control+E')
    await expect(page.getByText('Atelier · version enregistrée v1')).toBeVisible()
    const dose = page.getByLabel('Dose de Gin', { exact: true })
    await expect(dose).toHaveAttribute('aria-valuenow', '30')
    const volume = page.getByText('Volume servi', { exact: true }).locator('xpath=following-sibling::dd')
    await expect(volume).not.toHaveText('–')
    const volumeBefore = await volume.textContent()
    await dose.focus()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(dose).toHaveAttribute('aria-valuenow', '35')
    // The served volume follows the dose at once.
    await expect(volume).not.toHaveText(volumeBefore ?? '')

    // Undo and redo during the session.
    await page.keyboard.press('Control+Z')
    await expect(dose).toHaveAttribute('aria-valuenow', '32.5')
    await page.keyboard.press('Control+Y')
    await expect(dose).toHaveAttribute('aria-valuenow', '35')

    // Nothing is written yet: the recipe is still at version 1 with 30 ml of gin.
    const before = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      if (!list.ok) throw new Error('list')
      const negroni = list.data.find((recipe) => recipe.name === 'Negroni')
      return negroni?.version
    })
    expect(before).toBe(1)

    await page.getByRole('button', { name: 'Enregistrer comme nouvelle version' }).click()
    const dialog = page.getByRole('dialog', { name: 'Enregistrer comme nouvelle version' })
    await dialog.getByLabel('Nom de la version').fill('plus de gin')
    await dialog.getByRole('button', { name: 'Valider' }).click()
    await expect(page.getByText('Atelier · version enregistrée v2')).toBeVisible()

    // Compare v1 and v2: the gin line shows its gap.
    await page.getByRole('radio', { name: 'Comparer' }).click()
    await page.getByRole('checkbox', { name: 'v1' }).check()
    await page.getByRole('checkbox', { name: 'Brouillon de l’atelier' }).uncheck()
    await expect(page.getByRole('region', { name: 'v1' })).toBeVisible()

    // Ctrl+J in the lab does what its button does: the changed draft is saved first.
    await page.getByRole('radio', { name: 'Atelier', exact: true }).click()
    await page.getByLabel('Dose de Gin', { exact: true }).focus()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Control+J')
    const tasting = page.getByRole('dialog', { name: 'Noter une dégustation' })
    await expect(tasting).toBeVisible()
    await expect(tasting.getByRole('combobox', { name: 'Fiche goûtée' })).toHaveValue('Negroni')
    await expect(tasting.getByLabel('Version goûtée')).toHaveValue('3')
    await page.keyboard.press('Escape')
    await expect(page.getByText('Atelier · version enregistrée v3')).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
