import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('a tasting note with a next step, listed to retest, then checked as tested', async () => {
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

    // Ctrl+J on a recipe proposes that recipe and its current version.
    await page.keyboard.press('Control+J')
    const dialog = page.getByRole('dialog', { name: 'Noter une dégustation' })
    await expect(dialog.getByLabel('Version goûtée')).toHaveValue('1')
    await dialog.getByRole('radio', { name: '4 sur 5' }).click()
    await dialog.getByRole('radiogroup', { name: 'Amertume' }).getByRole('radio', { name: /^\+2/ }).click()
    await dialog.getByLabel('Prochaine étape à tester').fill('Campari à 25 ml')
    await dialog.getByRole('button', { name: 'Enregistrer la note' }).click()
    await expect(dialog).toBeHidden()

    // The recipe shows the note, the sidebar lists the step to retest.
    await expect(page.getByText('Campari à 25 ml').first()).toBeVisible()
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    await expect(sidebar.getByText('Campari à 25 ml')).toBeVisible()

    await sidebar.getByRole('link', { name: 'Journal', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Journal de dégustation', level: 1 })).toBeVisible()
    await page.getByRole('radio', { name: 'À retester' }).click()
    const done = page.getByRole('checkbox', { name: /Campari à 25 ml/ })
    await done.check()
    await expect(done).toBeChecked()
    // Tested: it leaves the « à retester » list and the sidebar.
    await expect(sidebar.getByText('Campari à 25 ml')).toBeHidden()

    const stored = await page.evaluate(async () => {
      const list = await window.shakery.tastingNotes.list({})
      if (!list.ok) throw new Error('list')
      return list.data.map((note) => ({
        overall: note.overall,
        bitterness: note.scores['bitterness'],
        done: note.nextStepDone,
      }))
    })
    expect(stored).toEqual([{ overall: 4, bitterness: 2, done: true }])
  } finally {
    await closeApp(launched)
  }
})
