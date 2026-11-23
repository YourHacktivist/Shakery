import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

/**
 * The window of a new release at launch (D-051), on a fake release that a development build
 * accepts through SHAKERY_FAKE_UPDATE (a packaged build ignores it and reads GitHub).
 */
test('a newer release opens its window at launch, downloads, then backs up before installing', async () => {
  const launched = await launchApp(undefined, { SHAKERY_FAKE_UPDATE: '9.9.9' })
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()

    // Nobody asked: the window comes by itself a few seconds after launch.
    const dialog = page.getByRole('dialog', { name: /Shakery 9\.9\.9 est disponible/ })
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByText('Ce qui change')).toBeVisible()
    await expect(dialog.getByText('• Une fenêtre annonce les nouvelles versions.')).toBeVisible()
    await expect(dialog.getByText('Corrections & finitions.')).toBeVisible()

    await dialog.getByRole('button', { name: 'Mettre à jour' }).click()
    await expect(page.getByRole('progressbar')).toBeVisible()
    const ready = page.getByRole('dialog', { name: /Shakery 9\.9\.9 est prêt/ })
    await expect(ready).toBeVisible({ timeout: 15_000 })

    await ready.getByRole('button', { name: 'Redémarrer maintenant' }).click()
    // The backup comes first; the fake release then installs nothing.
    await expect
      .poll(async () => {
        const result = await page.evaluate(() => window.shakery.backups.list())
        return result.ok ? result.data.map((backup) => backup.reason) : []
      })
      .toContain('pre-update')

    // « Plus tard » closes it, and the settings tell where the update stands.
    await ready.getByRole('button', { name: 'Plus tard' }).click()
    await expect(ready).toBeHidden()
    await page
      .getByRole('complementary', { name: 'Barre latérale' })
      .getByRole('link', { name: 'Paramètres' })
      .click()
    const card = page.getByRole('region', { name: 'Mises à jour' })
    await expect(card.getByText('La version 9.9.9 est prête à installer.')).toBeVisible()
    await card.getByRole('button', { name: 'Voir la nouvelle version' }).click()
    await expect(ready).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})

test('a development build has nothing to update and sends no request', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const state = await page.evaluate(() => window.shakery.updates.status())
    expect(state.ok && state.data.status).toBe('unsupported')
    await page
      .getByRole('complementary', { name: 'Barre latérale' })
      .getByRole('link', { name: 'Paramètres' })
      .click()
    const card = page.getByRole('region', { name: 'Mises à jour' })
    await expect(card.getByText('Cette version de développement ne se met pas à jour.')).toBeVisible()
    await expect(card.getByRole('button', { name: 'Rechercher maintenant' })).toBeDisabled()
  } finally {
    await closeApp(launched)
  }
})
