import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

/** Opens a filter, ticks one choice and closes the menu. */
async function choose(page: Page, filter: RegExp, option: string) {
  await page.getByRole('button', { name: filter }).click()
  await page.getByRole('menuitemcheckbox', { name: option, exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

test('the filters of the recipes combine, and « without » never shows the allergen', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await page.evaluate(() => {
      location.hash = '#/recipes'
    })
    const group = page.getByRole('group', { name: 'Filtres des fiches' })
    await expect(group.getByRole('button', { name: /^Spiritueux de base/ })).toBeVisible()

    await choose(page, /^Spiritueux de base/, 'Gin et genièvre')
    await choose(page, /^Famille/, 'Sour')
    await choose(page, /^Allergènes à exclure/, 'Sans : Œufs')
    await expect(page.getByRole('note').filter({ hasText: 'vérifie chaque étiquette' })).toBeVisible()

    // The count of the header is the one the main process gives for the same choices.
    const expected = await page.evaluate(async () => {
      const [list, facets, categories] = await Promise.all([
        window.shakery.recipes.list(),
        window.shakery.recipes.facets(),
        window.shakery.reference.listCategories(),
      ])
      if (!list.ok || !facets.ok || !categories.ok) return null
      const gin = categories.data.find((category) => category.slug === 'gin-et-genievre')?.id
      const byId = new Map(facets.data.map((facet) => [facet.id, facet]))
      return list.data.filter((recipe) => {
        const facet = byId.get(recipe.id)
        return recipe.family === 'sour' && facet?.spirit === gin && !facet?.allergens.includes('eggs')
      }).length
    })
    expect(expected).toBeGreaterThan(10)
    await expect
      .poll(async () => (await page.locator('main header span').first().innerText()).replace(/\s/g, ''))
      .toContain(String(expected))

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.waitForTimeout(600)
    const audit = await auditPage(page)
    expect(audit.overflow).toEqual([])
    expect(audit.unnamed).toEqual([])
    const shots = process.env['SHOTS_DIR']
    if (shots) {
      await mkdir(shots, { recursive: true })
      await page.screenshot({ path: path.join(shots, 'filters.png') })
    }

    await page.getByRole('button', { name: 'Effacer les filtres' }).first().click()
    await expect(page.getByRole('note').filter({ hasText: 'vérifie chaque étiquette' })).toHaveCount(0)
  } finally {
    await closeApp(launched)
  }
})
