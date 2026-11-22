import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('every screen explains itself, and F1 keeps what is being typed', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const id = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      return list.ok ? (list.data.find((recipe) => recipe.name === 'Negroni')?.id ?? '') : ''
    })
    const screens = [
      ['home', '/'],
      ['recipes', '/recipes'],
      ['detail', `/recipes/${id}`],
      ['editor', `/recipes/${id}/edit`],
      ['lab', '/lab'],
      ['journal', '/journal'],
      ['notebook', '/notebook'],
      ['bar', '/bar'],
      ['preps', '/preps'],
      ['collections', '/collections'],
      ['practice', '/practice'],
      ['calculators', '/calculators'],
      ['settings', '/settings'],
      ['guide', '/guide'],
    ] as const
    const topic = page.getByTestId('help-topic')
    for (const [scene, route] of screens) {
      await page.evaluate((to) => {
        location.hash = `#${to}`
      }, route)
      await expect(page.locator(`main[data-scene="${scene}"]`)).toBeVisible()
      await page.getByRole('button', { name: 'Aide', exact: true }).click()
      await expect(topic).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(topic).toBeHidden()
      await expect(page.locator(`main[data-scene="${scene}"]`)).toBeVisible()
    }

    await page.keyboard.press('Control+N')
    const name = page.getByRole('textbox', { name: 'Nom', exact: true })
    await name.fill('Idée en cours')
    await page.keyboard.press('F1')
    await expect(topic).toHaveText('Partout dans Shakery')
    await page.keyboard.press('Escape')
    await expect(name).toHaveValue('Idée en cours')
    await page.keyboard.press('Escape')

    await page.evaluate((to) => {
      location.hash = `#/prepare/${to}`
    }, id)
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible()
    await page.keyboard.press('F1')
    await expect(topic).toHaveText('Mode préparation')
    await page.keyboard.press('Escape')
    await expect(topic).toBeHidden()
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
