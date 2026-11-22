import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

function recipeNamed(page: Page, name: string) {
  return page.evaluate(async (wanted) => {
    const list = await window.shakery.recipes.list()
    return list.ok ? (list.data.find((recipe) => recipe.name === wanted)?.id ?? null) : null
  }, name)
}

function negroniAbv(page: Page, id: string) {
  return page.evaluate(async (recipeId) => {
    const detail = await window.shakery.recipes.get({ id: recipeId })
    if (!detail.ok) return null
    const { lines, method, kind } = detail.data
    const result = await window.shakery.recipes.compute({
      data: { name: 'Negroni', kind, method, lines: lines.map(({ id: _id, ...line }) => line) },
    })
    return result.ok ? result.data.abv.value : null
  }, id)
}

test('settings: dilution reaches the figures, trash and reset always back up first', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const negroni = (await recipeNamed(page, 'Negroni')) ?? ''
    const abvBefore = await negroniAbv(page, negroni)
    expect(abvBefore).toBeGreaterThan(20)

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    const build = page.getByRole('region', { name: 'Équivalences, dilution, atelier' }).getByLabel('Au verre')
    await build.fill('40')
    await build.press('Tab')
    await expect
      .poll(async () => (await negroniAbv(page, negroni)) ?? 99, { timeout: 10_000 })
      .toBeLessThan((abvBefore ?? 0) - 3)

    await page.waitForTimeout(800)
    expect((await auditPage(page)).overflow).toEqual([])
    expect((await auditPage(page)).unnamed).toEqual([])
    const shots = process.env['SHOTS_DIR']
    if (shots) {
      await mkdir(shots, { recursive: true })
      await page.screenshot({ path: path.join(shots, 'settings.png') })
    }

    const made = await page.evaluate(async () => {
      const recipe = await window.shakery.recipes.create({ data: { name: 'Zinzolin d’essai' } })
      if (!recipe.ok) return false
      return (await window.shakery.recipes.delete({ id: recipe.data.id })).ok
    })
    expect(made).toBe(true)
    await page.getByRole('button', { name: 'Corbeille…' }).click()
    const trash = page.getByRole('dialog', { name: 'Corbeille' })
    await trash.getByRole('button', { name: 'Restaurer Zinzolin d’essai' }).click()
    await expect(trash.getByText('La corbeille est vide.')).toBeVisible()
    const restored = await recipeNamed(page, 'Zinzolin d’essai')
    expect(restored).not.toBeNull()

    await page.evaluate((id) => window.shakery.recipes.delete({ id }), restored ?? '')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Corbeille…' }).click()
    await trash.getByRole('button', { name: 'Vider la corbeille' }).click()
    await expect(trash.getByRole('alert')).toContainText('pour de bon')
    await trash.getByRole('button', { name: 'Effacer pour de bon' }).click()
    await expect(trash.getByText('La corbeille est vide.')).toBeVisible()
    const reasons = () =>
      page.evaluate(async () => {
        const list = await window.shakery.backups.list()
        return list.ok ? list.data.map((backup) => backup.reason) : []
      })
    expect(await reasons()).toContain('pre-purge')
    await page.keyboard.press('Escape')

    await page.evaluate(() =>
      window.shakery.recipes.create({ data: { name: 'Perdue à la réinitialisation' } }),
    )
    await page.getByRole('button', { name: 'Réinitialiser Shakery…' }).click()
    const reset = page.getByRole('dialog', { name: 'Réinitialiser Shakery' })
    const go = reset.getByRole('button', { name: 'Sauvegarder puis réinitialiser' })
    await expect(go).toBeDisabled()
    await reset.getByLabel('Tape RÉINITIALISER pour confirmer').fill('RÉINITIALISER')
    const reloaded = page.waitForEvent('load', { timeout: 60_000 })
    await go.click()
    await reloaded
    await expect(page.getByTestId('app-version')).toBeVisible({ timeout: 30_000 })
    expect(await recipeNamed(page, 'Perdue à la réinitialisation')).toBeNull()
    expect(await recipeNamed(page, 'Negroni')).not.toBeNull()
    expect(await reasons()).toContain('pre-reset')
  } finally {
    await closeApp(launched)
  }
})
