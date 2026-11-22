import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('a new notebook starts with three steps, keeps the choices and does not ask again', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp(undefined, { SHAKERY_SKIP_ONBOARDING: '0' })
  const { page, app } = launched
  try {
    const dialog = page.getByRole('dialog', { name: 'Bienvenue dans Shakery' })
    await expect(dialog).toBeVisible({ timeout: 20_000 })
    await dialog.getByRole('radio', { name: 'cl', exact: true }).click()
    await expect(dialog.getByRole('radio', { name: 'cl', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await dialog.getByRole('button', { name: 'Continuer' }).click()
    await expect(dialog.getByText('cocktails', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Continuer' }).click()

    const folder = await mkdtemp(path.join(tmpdir(), 'shakery-backups-'))
    await app.evaluate(({ dialog: native }, target) => {
      native.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [target] })
    }, folder)
    await dialog.getByRole('button', { name: 'Changer de dossier…' }).click()
    await expect(dialog.getByText(folder)).toBeVisible()
    await dialog.getByRole('button', { name: 'Ouvrir mon carnet' }).click()
    await expect(dialog).toBeHidden()

    const settings = await page.evaluate(() => window.shakery.settings.getAll())
    expect(settings.ok && settings.data).toMatchObject({
      'onboarding.done': true,
      'display.unit': 'cl',
      'backup.directory': folder,
    })
    await page.reload()
    await expect(page.getByTestId('app-version')).toBeVisible()
    await expect(dialog).toBeHidden()

    // The doses follow the unit chosen.
    await page.keyboard.press('Control+K')
    const palette = page.getByRole('dialog', { name: 'Palette de recherche' })
    await palette.getByRole('combobox').fill('negroni')
    await expect(palette.getByRole('option').first()).toHaveAccessibleName(/^Negroni\s*Finale$/)
    await page.keyboard.press('Enter')
    await expect(page.getByText(/^3\scl$/).first()).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
