import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

/** Pages and size of a PDF made by Chromium, in millimetres. */
function shapeOf(pdf: Buffer) {
  const text = pdf.toString('latin1')
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(text)
  const mm = (points: string | undefined) => Math.round((Number(points) / 72) * 25.4)
  return {
    pages: text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0,
    width: mm(box?.[1]),
    height: mm(box?.[2]),
  }
}

test('bottle labels on a roll and on a sheet, never cropped, and a batch on paper', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  const shots = process.env['SHOTS_DIR']
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    if (shots) await mkdir(shots, { recursive: true })
    const shot = async (name: string) => {
      if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) })
    }
    const folder = await mkdtemp(path.join(tmpdir(), 'shakery-labels-'))
    const answerWith = (file: string) =>
      app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: target })
      }, file)

    // The hardest label: a long name, a batch and an allergen to print.
    const made = await page.evaluate(async () => {
      const [preps, ingredients, categories] = await Promise.all([
        window.shakery.preps.list(),
        window.shakery.ingredients.list(),
        window.shakery.reference.listCategories(),
      ])
      if (!preps.ok || !ingredients.ok || !categories.ok) return null
      const almond = ingredients.data.find((ingredient) => ingredient.name === "Sirop d'orgeat")
      const category = categories.data.find(
        (item) => !categories.data.some((child) => child.parentId === item.id),
      )
      const recipe = await window.shakery.recipes.create({
        data: {
          name: 'Orgeat pistache et fleur d’oranger, recette du concours régional de printemps',
          kind: 'prep',
          status: 'final',
          yieldMl: 750,
          shelfLifeDays: 14,
          prepCategoryId: category?.id ?? null,
          lines: [{ ingredientId: almond?.id ?? '', quantity: 750, unit: 'ml' }],
        },
      })
      if (!recipe.ok) return null
      const batch = await window.shakery.batches.create({
        recipeId: recipe.data.id,
        madeAt: Date.now(),
        quantityMl: 750,
      })
      return batch.ok ? { id: recipe.data.id, batchId: batch.data.id } : null
    })
    expect(made).not.toBeNull()
    if (!made) return

    await page.evaluate(() => {
      location.hash = '#/preps'
    })
    await page.reload()
    await page
      .getByRole('list', { name: /^Lots en cours de / })
      .first()
      .getByRole('button', { name: 'Imprimer une étiquette' })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: 'Étiquette de bouteille' })
    await expect(dialog).toContainText('Fruits à coque')
    await page.waitForTimeout(700)
    await shot('label-dialog')
    const save = dialog.getByRole('button', { name: 'Enregistrer en PDF' })
    const roll = path.join(folder, 'roll.pdf')
    await answerWith(roll)
    await save.click()
    await expect
      .poll(async () => shapeOf(await readFile(roll).catch(() => Buffer.alloc(0))), { timeout: 30_000 })
      .toEqual({ pages: 1, width: 62, height: 29 })

    const formats = [
      ['roll89x36', 3, 0, { pages: 3, width: 89, height: 36 }],
      ['roll57x32', 1, 0, { pages: 1, width: 57, height: 32 }],
      ['sheet21', 21, 0, { pages: 1, width: 210, height: 297 }],
      ['sheet21', 21, 5, { pages: 2, width: 210, height: 297 }],
      ['sheet8', 8, 0, { pages: 1, width: 210, height: 297 }],
    ] as const
    for (const [format, count, skip, shape] of formats) {
      const file = path.join(folder, `${format}-${String(skip)}.pdf`)
      await answerWith(file)
      const sent = await page.evaluate(
        (input) => window.shakery.export.labels({ ...input, to: 'pdf', allergens: true }),
        { ...made, format, count, skip },
      )
      expect(sent).toEqual({ ok: true, data: { done: true } })
      expect(shapeOf(await readFile(file)), format).toEqual(shape)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.evaluate(() => {
      location.hash = '#/calculators'
    })
    await page.getByRole('combobox', { name: 'À partir d’une fiche' }).fill('daiquiri')
    await page.getByRole('option', { name: 'Daiquiri', exact: true }).click()
    await expect(page.getByText('jamais dans une bouteille conservée')).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.waitForTimeout(600)
    expect((await auditPage(page)).overflow).toEqual([])
    await shot('batch')
    const batch = path.join(folder, 'batch.pdf')
    await answerWith(batch)
    await page.getByRole('button', { name: 'Enregistrer en PDF' }).click()
    await expect
      .poll(async () => shapeOf(await readFile(batch).catch(() => Buffer.alloc(0))), { timeout: 30_000 })
      .toEqual({ pages: 1, width: 210, height: 297 })
    // Without a recipe: two lines written by hand, on paper too.
    await page.getByRole('radio', { name: 'Sans fiche' }).click()
    await page.getByLabel('Nom du batch').fill('Batch maison du vendredi')
    await page.getByRole('textbox', { name: 'Ingrédient 1' }).fill('Rhum ambré')
    await page.getByRole('spinbutton', { name: 'Dose par verre de l’ingrédient 1' }).fill('50')
    await page.getByRole('button', { name: 'Ajouter un ingrédient' }).click()
    await page.getByRole('textbox', { name: 'Ingrédient 2' }).fill('Jus de citron vert')
    await page.getByRole('spinbutton', { name: 'Dose par verre de l’ingrédient 2' }).fill('20')
    await page.getByLabel('Où va l’ingrédient 2').selectOption('fresh')
    await expect(page.getByText('Volume de la bouteille').locator('..')).toContainText('500')
    await expect(page.getByText('Frais, à part').locator('..')).toContainText('200')
    expect((await auditPage(page)).overflow).toEqual([])
    await shot('batch-manual')
    const manual = path.join(folder, 'batch-manual.pdf')
    await answerWith(manual)
    await page.getByRole('button', { name: 'Enregistrer en PDF' }).click()
    await expect
      .poll(async () => shapeOf(await readFile(manual).catch(() => Buffer.alloc(0))), { timeout: 30_000 })
      .toEqual({ pages: 1, width: 210, height: 297 })

    const daiquiriBatch = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      const id = list.ok ? list.data.find((recipe) => recipe.name === 'Daiquiri')?.id : undefined
      return `#/print/batch/${id ?? ''}?target=servings&amount=10&step=1&water=0&garnish=0`
    })

    // The templates themselves: every format keeps every word inside the label.
    for (const format of ['roll62x29', 'roll89x36', 'roll57x32', 'sheet21', 'sheet8']) {
      await page.evaluate(
        (hash) => {
          location.hash = hash
        },
        `#/print/label/${made.id}/${made.batchId}?format=${format}&count=${format.startsWith('sheet') ? '8' : '1'}&skip=0&allergens=1`,
      )
      const label = page.locator('.bottle-label').first()
      await expect(label).toContainText('Contient')
      await page.waitForTimeout(300)
      const fit = await label.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const inside = [...element.querySelectorAll('*')].every((child) => {
          const rect = child.getBoundingClientRect()
          return rect.top >= box.top - 0.5 && rect.bottom <= box.bottom + 0.5 && rect.right <= box.right + 0.5
        })
        return { inside, points: (parseFloat(getComputedStyle(element).fontSize) * 72) / 96 }
      })
      expect(fit.inside, format).toBe(true)
      expect(fit.points, format).toBeGreaterThanOrEqual(4)
      await shot(`label-${format}`)
    }
    await page.evaluate((hash) => {
      location.hash = hash
    }, daiquiriBatch)
    await expect(page.locator('.batch-sheet')).toBeVisible()
    await shot('batch-sheet')
  } finally {
    await closeApp(launched)
  }
})
