import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('a collection exported to PDF, revised to the end, and a batch of syrup', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })

    // Collection with two classics.
    await sidebar.getByRole('link', { name: 'Collections', exact: true }).click()
    await page.getByRole('button', { name: 'Nouvelle collection' }).first().click()
    const form = page.getByRole('dialog', { name: 'Nouvelle collection' })
    await form.getByLabel('Nom').fill('Carte test')
    await form.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByRole('heading', { name: 'Carte test', level: 2 })).toBeVisible()
    for (const name of ['Negroni', 'Daiquiri', 'Manhattan', 'Margarita']) {
      await page.getByRole('combobox', { name: 'Ajouter des fiches' }).fill(name)
      await page
        .getByRole('option', { name: new RegExp(`^${name}`) })
        .first()
        .click()
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
    }

    // PDF: the save dialog of the main process answers with a temporary file.
    const folder = await mkdtemp(path.join(tmpdir(), 'shakery-pdf-'))
    const file = path.join(folder, 'carte.pdf')
    await app.evaluate(({ dialog }, target) => {
      dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: target })
    }, file)
    await page.getByRole('button', { name: 'Exporter en PDF' }).click()
    await expect(page.getByText('PDF enregistré.')).toBeVisible({ timeout: 30_000 })
    const pdf = await readFile(file)
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(2000)

    // Revision of the collection: every question answered, then the result.
    await page.getByRole('button', { name: 'Réviser' }).click()
    await expect(page.getByRole('heading', { name: 'Révision', level: 1 })).toBeVisible()
    await page.getByLabel('Nombre de questions').selectOption('10')
    await page.getByRole('button', { name: 'Commencer' }).click()
    for (let i = 0; i < 10; i += 1) {
      const reveal = page.getByRole('button', { name: 'Voir la réponse' })
      const choices = page.getByRole('group').getByRole('button')
      await expect(reveal.or(choices.first())).toBeVisible()
      if (await reveal.isVisible()) {
        await reveal.click()
        await page.getByRole('button', { name: 'Je savais' }).click()
      } else {
        await choices.first().click()
        await page.getByRole('button', { name: /^(Suivante|Terminer)$/ }).click()
      }
    }
    await expect(page.getByText('Session terminée')).toBeVisible()
    const sessions = await page.evaluate(async () => {
      const history = await window.shakery.practice.history()
      if (!history.ok) throw new Error('history')
      return history.data.map((session) => session.total)
    })
    expect(sessions).toEqual([10])

    // A batch of simple syrup.
    await sidebar.getByRole('link', { name: 'Préparations', exact: true }).click()
    const card = page.getByRole('article').filter({ hasText: 'Sirop simple' })
    await card.getByRole('button', { name: 'Nouvelle fabrication' }).click()
    const batch = page.getByRole('dialog', { name: 'Nouvelle fabrication de Sirop simple' })
    await batch.getByLabel('Quantité').fill('750')
    await batch.getByRole('button', { name: 'Enregistrer la fabrication' }).click()
    await expect(card.getByText(/750 ml/)).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
