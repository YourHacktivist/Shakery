import { expect, test, type Page } from '@playwright/test'
import { closeApp, launchApp } from './helpers'

/**
 * Names and searches that break careless code (quotes, SQL, FTS5 and LIKE syntax, HTML,
 * Markdown, device names, emoji sequences, right-to-left script, invisible characters, the
 * longest name allowed), driven through the real application. The data layer checks many
 * more in src/main/db/repositories/robustness.test.ts.
 */
const char = (...codes: number[]) => String.fromCharCode(...codes)
const LIME = String.fromCodePoint(0x1f34b, 0x200d, 0x1f7e9)

const NAMES = [
  '<script>alert(1)</script>',
  "Robert'); DROP TABLE recipes;--",
  'NEAR(gin tonic) AND * OR "x"',
  'Percent 100% _under_ \\ back',
  '=SUM(A1)+cmd|calc',
  '**gras** _italique_ # titre [[lien]]',
  'CON',
  '../../etc/passwd',
  `${String.fromCodePoint(0x1f378)} Martini ${LIME}`,
  'مارتيني بالليمون',
  'İstanbul Sour ẞ',
  `Zero${char(0x200b)}width`,
  'x'.repeat(120),
]

const QUERIES = ['"', '*', '(', 'OR', 'NEAR/2', '%', '_', '\\', "'", '^', ':', char(0xfeff), 'é'.repeat(300)]

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((target) => {
    window.location.hash = target
  }, hash)
  await expect(page.locator('main[data-scene]')).toBeVisible()
}

test('names and searches with special characters never break a screen', async () => {
  test.setTimeout(180_000)
  const launched = await launchApp()
  const { page } = launched
  const errors = watchErrors(page)
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()

    // One through the quick idea, as typed by hand.
    await page.keyboard.press('Control+N')
    const idea = page.getByRole('dialog', { name: 'Idée rapide' })
    const typed = `<b>Ti' Punch</b> "100%" ${String.fromCodePoint(0x1f378)}`
    await idea.getByLabel('Nom').fill(typed)
    await idea.getByLabel('Nom').press('Enter')
    await expect(idea).toBeHidden()

    // The others through the bridge, with a collection and a note that carry them.
    const ids = await page.evaluate(async (names) => {
      const made: string[] = []
      for (const name of names) {
        const result = await window.shakery.recipes.create({
          data: {
            name,
            notes: `${name}\n\n**${name}**`,
            garnish: name,
            steps: [name],
            tags: [name.slice(0, 40), name.toUpperCase().slice(0, 40)],
          },
        })
        if (!result.ok) throw new Error(`${name}: ${result.message}`)
        made.push(result.data.id)
      }
      const collection = await window.shakery.collections.create({
        name: names[0] ?? '',
        description: names[1] ?? '',
      })
      if (!collection.ok) throw new Error(collection.message)
      const added = await window.shakery.collections.addRecipes({ id: collection.data.id, recipeIds: made })
      if (!added.ok) throw new Error(added.message)
      const entry = await window.shakery.notebook.create({ title: names[2] ?? '', body: names.join('\n') })
      if (!entry.ok) throw new Error(entry.message)
      return made
    }, NAMES)
    await page.reload()
    await expect(page.getByTestId('app-version')).toBeVisible()

    // Every recipe opens, its name shown as typed.
    for (const [index, name] of NAMES.entries()) {
      await go(page, `#/recipes/${ids[index] ?? ''}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    }

    // Found in the palette in capitals, then opened with Enter.
    const palette = page.getByRole('dialog', { name: 'Palette de recherche' })
    for (const name of [typed, ...NAMES.slice(0, 9)]) {
      await page.keyboard.press('Control+K')
      await palette.getByRole('combobox').fill(name.toUpperCase())
      await expect(palette.getByRole('option').filter({ hasText: name }).first()).toBeVisible()
      await palette.getByRole('option').filter({ hasText: name }).first().click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    }

    // Searches made of syntax only answer, without error.
    for (const query of QUERIES) {
      await page.keyboard.press('Control+K')
      await palette.getByRole('combobox').fill(query)
      await expect(palette.getByRole('combobox')).toHaveValue(query)
      await page.keyboard.press('Escape')
      await expect(palette).toBeHidden()
    }

    // The screens that list them.
    for (const screen of ['#/recipes', '#/collections', '#/notebook', '#/', '#/journal']) {
      await go(page, screen)
      await page.waitForTimeout(300)
    }
    await go(page, '#/collections')
    await expect(page.getByText(NAMES[0] ?? '').first()).toBeVisible()

    // Share and print dialogs of the hardest name.
    await go(page, `#/recipes/${ids[0] ?? ''}`)
    await page.getByRole('button', { name: 'Partager' }).click()
    const share = page.getByRole('dialog', { name: 'Partager la fiche' })
    await expect(share).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(share).toBeHidden()

    await expect(page.getByText('Cet écran a rencontré un problème')).toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await closeApp(launched)
  }
})
