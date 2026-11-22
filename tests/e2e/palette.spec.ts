import { expect, test, type Page } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

/** Types in the palette and runs the option of that name. */
async function run(page: Page, text: string, option: RegExp) {
  await page.keyboard.press('Control+K')
  const palette = page.getByRole('dialog', { name: 'Palette de recherche' })
  await palette.getByRole('combobox').fill(text)
  await palette.getByRole('option', { name: option }).first().click()
}

test('the palette finds notes and tastings, acts on a recipe and compares two recipes', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      const negroni = list.ok ? list.data.find((recipe) => recipe.name === 'Negroni') : undefined
      await window.shakery.notebook.create({ title: 'Accords', body: 'Cardamome verte et pamplemousse' })
      await window.shakery.tastingNotes.create({
        recipeId: negroni?.id ?? '',
        recipeVersion: 1,
        tastedAt: Date.now(),
        comment: 'Zinzolin, trop amer',
      })
    })
    await page.reload()
    await expect(page.getByTestId('app-version')).toBeVisible()

    await run(page, 'cardamome verte et', /^Accords/)
    await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue('Accords')

    await run(page, 'zinzolin', /^Dégustation de Negroni/)
    await expect(page.locator('main [aria-current="true"]')).toContainText('Zinzolin')

    // An action may open a dialog: the palette must not close it behind itself.
    await run(page, 'negroni', /^Noter une dégustation de Negroni$/)
    const tasting = page.getByRole('dialog', { name: /dégustation/i })
    await expect(tasting).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tasting).toBeHidden()

    await run(page, 'negroni', /^Comparer Negroni avec…$/)
    const field = page.getByRole('combobox', { name: 'Comparer avec une autre fiche' })
    await expect(field).toBeFocused()
    await field.fill('boulevardier')
    await page.getByRole('option', { name: 'Boulevardier', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Boulevardier', level: 3 })).toBeVisible()
    await expect(page.locator('main')).toContainText('Bourbon')

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.waitForTimeout(600)
    expect((await auditPage(page)).overflow).toEqual([])

    await run(page, 'negroni', /^Imprimer la fiche de Negroni$/)
    await expect(page.getByRole('dialog', { name: 'Imprimer la fiche' })).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
