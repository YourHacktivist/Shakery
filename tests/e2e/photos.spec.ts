import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { auditPage } from './page-audit'
import { closeApp, launchApp } from './helpers'

const SECRET = 'GPS-48.8566N-2.3522E'

/** A real JPEG of 2400 × 1200 as a phone writes it: turned on its side, with a position. */
async function phonePhoto(page: Page): Promise<Buffer> {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1200
    const draw = canvas.getContext('2d')
    if (!draw) return ''
    draw.fillStyle = '#b4531f'
    draw.fillRect(0, 0, 2400, 1200)
    draw.fillStyle = '#f3d1b0'
    draw.beginPath()
    draw.arc(1200, 600, 380, 0, Math.PI * 2)
    draw.fill()
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1] ?? ''
  })
  const jpeg = Buffer.from(encoded, 'base64')
  // EXIF with one tag, Orientation = 6 (a quarter turn), then the position in clear.
  const tiff = Buffer.alloc(26)
  tiff.write('MM', 0, 'ascii')
  tiff.writeUInt16BE(42, 2)
  tiff.writeUInt32BE(8, 4)
  tiff.writeUInt16BE(1, 8)
  tiff.writeUInt16BE(0x0112, 10)
  tiff.writeUInt16BE(3, 12)
  tiff.writeUInt32BE(1, 14)
  tiff.writeUInt16BE(6, 18)
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, Buffer.from(SECRET, 'ascii')])
  const marker = Buffer.alloc(4)
  marker.writeUInt16BE(0xffe1, 0)
  marker.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([jpeg.subarray(0, 2), marker, payload, jpeg.subarray(2)])
}

test('photos: turned upright, reduced, without position, undone, kept with a tasting', async () => {
  test.setTimeout(120_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const shots = process.env['SHOTS_DIR']
    if (shots) await mkdir(shots, { recursive: true })
    const id = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      return list.ok ? (list.data.find((recipe) => recipe.name === 'Negroni')?.id ?? '') : ''
    })
    await page.evaluate((to) => {
      location.hash = `#/recipes/${to}`
    }, id)
    const jpeg = await phonePhoto(page)
    expect(jpeg.toString('latin1')).toContain(SECRET)

    const card = page.getByRole('region', { name: 'Photo', exact: true })
    await card
      .locator('input[type="file"]')
      .setInputFiles({ name: 'negroni.jpg', mimeType: 'image/jpeg', buffer: jpeg })
    const image = card.locator('img')
    await expect(image).toBeVisible()
    await expect
      .poll(() =>
        image.evaluate((element) => [
          (element as HTMLImageElement).naturalWidth,
          (element as HTMLImageElement).naturalHeight,
        ]),
      )
      .toEqual([800, 1600])

    const media = path.join(launched.userDataDir, 'media')
    const [file] = await readdir(path.join(media, 'recipes'))
    const stored = (await readFile(path.join(media, 'recipes', file ?? ''))).toString('latin1')
    expect(stored.slice(8, 12)).toBe('WEBP')
    expect(stored).not.toContain(SECRET)
    expect(stored).not.toContain('Exif')
    // A photo is not a version.
    const version = await page.evaluate(async (recipeId) => {
      const detail = await window.shakery.recipes.get({ id: recipeId })
      return detail.ok ? detail.data.version : 0
    }, id)
    expect(version).toBe(1)

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    await page.waitForTimeout(700)
    expect((await auditPage(page)).overflow).toEqual([])
    expect((await auditPage(page)).unnamed).toEqual([])
    if (shots) await page.screenshot({ path: path.join(shots, 'recipe-photo.png') })

    await card.getByRole('button', { name: 'Retirer' }).click()
    await expect(image).toHaveCount(0)
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await expect(image).toBeVisible()

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    await card
      .locator('input[type="file"]')
      .setInputFiles({ name: 'piege.png', mimeType: 'image/png', buffer: svg })
    await expect(card.getByRole('alert')).toContainText('JPEG, PNG ou WebP')

    await page.keyboard.press('Control+J')
    const dialog = page.getByRole('dialog', { name: /dégustation/i })
    await dialog
      .locator('input[type="file"]')
      .setInputFiles({ name: 'verre.jpg', mimeType: 'image/jpeg', buffer: jpeg })
    await expect(dialog.locator('img')).toBeVisible()
    // Reaching the field at the end of the dialog moved the dialog alone, never the shell.
    expect(
      await page.evaluate(
        () => document.querySelector('header, [role="banner"]')?.getBoundingClientRect().top,
      ),
    ).toBeGreaterThanOrEqual(0)
    expect(await page.evaluate(() => document.querySelector('.app-shell')?.scrollTop)).toBe(0)
    if (shots) await page.screenshot({ path: path.join(shots, 'tasting-photo.png') })
    await dialog.getByRole('button', { name: /^Enregistrer/ }).click()
    await expect(dialog).toBeHidden()
    await page.evaluate(() => {
      location.hash = '#/journal'
    })
    const tastingPhoto = page.getByRole('img', { name: 'Photo de la dégustation de Negroni' })
    await expect(tastingPhoto).toBeVisible()
    expect(await readdir(path.join(media, 'tastings'))).toHaveLength(1)

    // A saved tasting: its photo is taken off, put back by « Annuler », and one is added to another.
    const note = page.getByRole('article').filter({ has: tastingPhoto })
    await note.getByRole('button', { name: 'Retirer' }).click()
    await expect(tastingPhoto).toBeHidden()
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(tastingPhoto).toBeVisible()
    await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      const negroni = list.ok ? list.data.find((recipe) => recipe.name === 'Negroni') : undefined
      if (negroni) {
        await window.shakery.tastingNotes.create({
          recipeId: negroni.id,
          recipeVersion: negroni.version,
          tastedAt: Date.now(),
          comment: 'Sans photo',
        })
      }
    })
    await page.reload()
    const bare = page.getByRole('article').filter({ hasText: 'Sans photo' })
    await bare.getByRole('button', { name: 'Ajouter une photo' }).click()
    await bare
      .locator('input[type="file"]')
      .setInputFiles({ name: 'second.jpg', mimeType: 'image/jpeg', buffer: jpeg })
    await expect(bare.getByRole('img', { name: 'Photo de la dégustation de Negroni' })).toBeVisible()
    expect(await readdir(path.join(media, 'tastings'))).toHaveLength(2)
  } finally {
    await closeApp(launched)
  }
})
