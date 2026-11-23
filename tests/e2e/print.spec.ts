import { copyFile, mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { closeApp, launchApp, projectRoot } from './helpers'

/** Pages and width of a PDF made by Chromium, the width in centimetres. */
function shapeOf(pdf: Buffer) {
  const text = pdf.toString('latin1')
  return {
    pages: text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0,
    width: Math.round((Number(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)/.exec(text)?.[1] ?? 0) / 72) * 2.54),
  }
}

test('Ctrl+P gives a one-page recipe sheet, A4 or A5, even for the longest classics', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const folder = await mkdtemp(path.join(tmpdir(), 'shakery-sheet-'))
    const answerWith = (file: string) =>
      app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: target })
      }, file)

    await page.keyboard.press('Control+K')
    const palette = page.getByRole('dialog', { name: 'Palette de recherche' })
    await palette.getByRole('combobox').fill('negroni')
    await expect(palette.getByRole('option').first()).toHaveAccessibleName(/^Negroni\s*Finale$/)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible()
    await page.keyboard.press('Control+P')
    const dialog = page.getByRole('dialog', { name: 'Imprimer la fiche' })
    await expect(dialog).toBeVisible()

    const save = dialog.getByRole('button', { name: 'Enregistrer en PDF' })
    const a4 = path.join(folder, 'negroni-a4.pdf')
    await answerWith(a4)
    await save.click()
    await expect(page.getByText('PDF de la fiche enregistré.').first()).toBeVisible({ timeout: 30_000 })
    expect(shapeOf(await readFile(a4))).toEqual({ pages: 1, width: 21 })

    await dialog.getByRole('radio', { name: 'A5' }).click()
    const a5 = path.join(folder, 'negroni-a5.pdf')
    await answerWith(a5)
    await save.click()
    await expect(save).toBeEnabled({ timeout: 30_000 })
    await expect
      .poll(async () => shapeOf(await readFile(a5).catch(() => Buffer.alloc(0))), { timeout: 30_000 })
      .toEqual({ pages: 1, width: 15 })

    // The hardest classics: longest name, most lines, longest garnish, most text.
    const seed = JSON.parse(
      await readFile(path.join(projectRoot, 'resources', 'seed', 'classics.json'), 'utf8'),
    ) as Array<{ name: string; garnish: string | null; lines: unknown[] }>
    const most = (measure: (recipe: (typeof seed)[number]) => number) =>
      seed.reduce((best, recipe) => (measure(recipe) > measure(best) ? recipe : best)).name
    const names = new Set([
      most((recipe) => recipe.name.length),
      most((recipe) => recipe.lines.length),
      most((recipe) => recipe.garnish?.length ?? 0),
      most((recipe) => JSON.stringify(recipe.lines).length),
    ])
    const hardest = await page.evaluate(
      async (wanted) => {
        const list = await window.shakery.recipes.list()
        return list.ok
          ? list.data.filter((recipe) => wanted.includes(recipe.name)).map((recipe) => recipe.id)
          : []
      },
      [...names],
    )
    expect(hardest.length).toBe(names.size)
    const files = [a4, a5]
    for (const [index, id] of hardest.entries()) {
      for (const paper of ['a4', 'a5'] as const) {
        const file = path.join(folder, `hard-${String(index)}-${paper}.pdf`)
        await answerWith(file)
        const result = await page.evaluate(
          (input) => window.shakery.export.recipePdf({ ...input, indicators: true }),
          { id, paper },
        )
        expect(result).toEqual({ ok: true, data: { saved: true } })
        expect(shapeOf(await readFile(file)).pages, `${String(index)} ${paper}`).toBe(1)
        files.push(file)
      }
    }

    const keep = process.env['SHOTS_DIR']
    if (keep) {
      await mkdir(keep, { recursive: true })
      for (const file of files) await copyFile(file, path.join(keep, path.basename(file)))
    }
  } finally {
    await closeApp(launched)
  }
})
