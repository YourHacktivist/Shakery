import { expect, test, type Page } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

const NBSP = String.fromCharCode(0xa0)
const quoted = (text: string) => `«${NBSP}${text}${NBSP}»`

/** Adds a line whose ingredient does not exist yet, creates it in its category, then sets the dose. */
async function addNewIngredient(page: Page, position: number, name: string, category: string, dose: string) {
  await page.getByRole('button', { name: 'Ajouter un ingrédient' }).click()
  const field = page.getByRole('combobox', { name: `Ingrédient de la ligne ${position}` })
  await field.fill(name)
  await page.getByRole('option', { name: `Créer ${quoted(name)}` }).click()
  const dialog = page.getByRole('dialog', { name: 'Nouvel ingrédient' })
  await dialog.getByLabel('Catégorie').selectOption({ label: category })
  await dialog.getByRole('button', { name: 'Créer l’ingrédient' }).click()
  await expect(dialog).toBeHidden()
  await expect(field).toHaveValue(name)
  await page.getByLabel(`Dose de la ligne ${position}`, { exact: true }).fill(dose)
}

test('a complete Negroni, ingredients included, is created in less than a minute', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const started = Date.now()

    await page.keyboard.press('Control+Shift+N')
    await page.getByLabel('Nom', { exact: true }).fill('Negroni')
    await addNewIngredient(page, 1, 'Gin London Dry', 'Gin et genièvre', '30')
    await addNewIngredient(page, 2, 'Campari', 'Bitters apéritifs', '30')
    await addNewIngredient(page, 3, 'Vermouth rouge', 'Vermouths', '30')
    await page.getByLabel('Méthode', { exact: true }).selectOption({ label: 'Verre à mélange' })
    await page.getByLabel('Verre', { exact: true }).selectOption({ label: 'Rocks' })
    await page.getByLabel('Glace', { exact: true }).selectOption({ label: 'Gros glaçon' })
    await page.getByLabel('Famille', { exact: true }).selectOption({ label: 'Spirit-forward' })
    await page.getByRole('textbox', { name: 'Garniture', exact: true }).fill('Zeste d’orange')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible()
    expect(Date.now() - started).toBeLessThan(60_000)

    // The detail shows the three doses and the calculated volume before dilution.
    for (const name of ['Gin London Dry', 'Campari', 'Vermouth rouge']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText(`90${NBSP}ml avant dilution`)).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})

test('a quick idea is noted from any screen and becomes a draft', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    await sidebar.getByRole('link', { name: 'Paramètres' }).click()

    const started = Date.now()
    await page.keyboard.press('Control+N')
    const dialog = page.getByRole('dialog', { name: 'Idée rapide' })
    await dialog.getByLabel('Nom').fill('Sour rhubarbe')
    await dialog.getByLabel('Nom').press('Enter')
    await expect(dialog).toBeHidden()
    expect(Date.now() - started).toBeLessThan(15_000)

    await sidebar.getByRole('link', { name: 'Fiches' }).click()
    await page.getByRole('option', { name: /Sour rhubarbe/ }).dblclick()
    await expect(page.getByRole('heading', { name: 'Sour rhubarbe', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: /^Statut/ }).click()
    await page.getByRole('menuitemradio', { name: 'Brouillon' }).click()
    await expect(page.getByText(`Statut changé${NBSP}: Brouillon.`)).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
