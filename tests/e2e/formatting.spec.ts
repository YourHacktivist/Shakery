import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

test('bold, italic and lists are typed, undone and shown, never as HTML', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const shots = process.env['SHOTS_DIR']
    if (shots) await mkdir(shots, { recursive: true })
    const id = await page.evaluate(async () => {
      const made = await window.shakery.recipes.create({ data: { name: 'Essai de mise en forme' } })
      return made.ok ? made.data.id : ''
    })
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.evaluate((to) => {
      location.hash = `#/recipes/${to}/edit`
    }, id)

    const notes = page.getByRole('textbox', { name: 'Notes', exact: true })
    await notes.fill('Bien frais')
    await notes.press('Control+A')
    await notes.press('Control+B')
    await expect(notes).toHaveValue('**Bien frais**')
    // Ctrl+B wrote, and left the sidebar open.
    await expect(page.getByRole('button', { name: 'Fermer la barre latérale' })).toBeVisible()
    await notes.press('Control+Z')
    await expect(notes).toHaveValue('Bien frais')

    await notes.press('Control+A')
    const tools = page.getByRole('group', { name: /Mise en forme.*Notes/ })
    await tools.getByRole('button', { name: 'Gras (Ctrl+B)' }).click()
    await expect(notes).toHaveValue('**Bien frais**')
    await notes.press('End')
    await notes.pressSequentially('\n<img src=x>\n\n- menthe\n- basilic')
    expect((await auditPage(page)).overflow).toEqual([])
    expect((await auditPage(page)).unnamed).toEqual([])
    if (shots) {
      await notes.scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(shots, 'formatting.png') })
    }

    await page
      .getByRole('button', { name: /^Enregistrer/ })
      .first()
      .click()
    const shown = page.getByRole('region', { name: 'Notes', exact: true })
    await expect(shown.locator('strong')).toHaveText('Bien frais')
    await expect(shown.getByRole('listitem')).toHaveText(['menthe', 'basilic'])
    await expect(shown).toContainText('<img src=x>')
    await expect(shown.locator('img')).toHaveCount(0)
  } finally {
    await closeApp(launched)
  }
})
