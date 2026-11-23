import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'
import { auditPage } from './page-audit'

test('a collection is prepared recipe after recipe, each with its own ticks', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    const ids = await page.evaluate(async () => {
      const made = []
      for (const name of ['Premier essai', 'Second essai']) {
        const recipe = await window.shakery.recipes.create({ data: { name, steps: ['Refroidir', 'Servir'] } })
        if (recipe.ok) made.push(recipe.data.id)
      }
      const collection = await window.shakery.collections.create({ name: 'Service du soir', kind: 'menu' })
      if (!collection.ok) return []
      await window.shakery.collections.addRecipes({ id: collection.data.id, recipeIds: made })
      return made
    })
    expect(ids).toHaveLength(2)
    await page.reload()
    await page.evaluate(() => {
      location.hash = '#/collections'
    })
    await expect(page.locator('main[data-scene="collections"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Service du soir' })).toBeVisible()
    expect(await auditPage(page)).toMatchObject({ overflow: [], unnamed: [] })

    await page.getByRole('button', { name: 'Préparer', exact: true }).click()
    const title = page.getByRole('heading', { level: 1 })
    const previous = page.getByRole('button', { name: 'Fiche précédente' })
    const next = page.getByRole('button', { name: 'Fiche suivante' })
    await expect(title).toHaveText('Premier essai')
    await expect(previous).toBeDisabled()

    const step = page.getByRole('checkbox', { name: /Refroidir/ })
    await step.click()
    await expect(step).toHaveAttribute('aria-checked', 'true')

    await next.click()
    await expect(title).toHaveText('Second essai')
    await expect(step).toHaveAttribute('aria-checked', 'false')
    await expect(next).toBeDisabled()

    await page.keyboard.press('ArrowLeft')
    await expect(title).toHaveText('Premier essai')
    await expect(step).toHaveAttribute('aria-checked', 'true')

    await page.keyboard.press('Escape')
    await expect(page.locator('main[data-scene="collections"]')).toBeVisible()

    // A recipe taken out of the collection comes back with « Annuler », at its place.
    await page.getByRole('button', { name: 'Retirer « Premier essai » de la collection' }).click()
    await expect(page.getByRole('link', { name: 'Premier essai' })).toBeHidden()
    await page.getByRole('button', { name: 'Annuler' }).click()
    const names = page.locator('main ol > li a')
    await expect(names).toHaveText(['Premier essai', 'Second essai'])
  } finally {
    await closeApp(launched)
  }
})
