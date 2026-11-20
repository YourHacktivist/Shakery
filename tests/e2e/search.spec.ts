import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

test('Ctrl+K, three letters and Enter open a recipe in less than 3 seconds, then F11 prepares it', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    await sidebar.getByRole('link', { name: 'Mon bar', exact: true }).click()

    const started = Date.now()
    await page.keyboard.press('Control+K')
    const palette = page.getByRole('dialog', { name: 'Palette de recherche' })
    await palette.getByRole('combobox').fill('dai')
    // Thousands of classics (D-036): many « Daiquiri… », the Daiquiri itself comes first.
    await expect(palette.getByRole('option').first()).toHaveAccessibleName(/^Daiquiri\s*Finale$/)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Daiquiri', level: 1 })).toBeVisible()
    expect(Date.now() - started).toBeLessThan(3_000)

    // A misspelt name is still found.
    await page.keyboard.press('Control+K')
    await page.getByRole('dialog', { name: 'Palette de recherche' }).getByRole('combobox').fill('margarta')
    await expect(page.getByRole('option', { name: /^Margarita/ }).first()).toBeVisible()
    await page.keyboard.press('Escape')

    await page.keyboard.press('F11')
    await expect(page.getByText('Mode préparation', { exact: true })).toBeVisible()
    await expect(page.getByRole('checkbox').first()).toBeVisible()
    await page.getByRole('checkbox').first().click()
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Daiquiri', level: 1 })).toBeVisible()
  } finally {
    await closeApp(launched)
  }
})
