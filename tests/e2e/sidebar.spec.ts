import { expect, test, type Locator } from '@playwright/test'
import { closeApp, launchApp } from './helpers'
import { auditPage } from './page-audit'

test('the sidebar closes completely, opens again as it was, and remembers it', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    const sidebar = page.getByRole('complementary', { name: 'Barre latérale' })
    const open = page.getByRole('button', { name: 'Menu', exact: true })
    const close = page.getByRole('button', { name: 'Fermer la barre latérale' })
    const left = () => page.locator('main').evaluate((main) => main.getBoundingClientRect().left)

    await expect(open).toHaveCount(0)
    await close.click()
    await expect(sidebar).toBeHidden()
    await expect(open).toBeFocused()
    await expect.poll(left).toBe(0)
    expect(await auditPage(page)).toMatchObject({ overflow: [], contrast: [], unnamed: [] })

    // Still closed at the next start.
    await page.reload()
    await expect(open).toBeVisible()
    await expect(sidebar).toBeHidden()

    await open.click()
    await expect(sidebar).toBeVisible()
    await expect(close).toBeFocused()

    // Closed from the icons, it comes back to the icons.
    await page.getByRole('button', { name: 'Réduire aux icônes' }).click()
    await expect.poll(left).toBe(56)
    await page.keyboard.press('Control+B')
    await expect.poll(left).toBe(0)
    await page.keyboard.press('Control+B')
    await expect.poll(left).toBe(56)
    await expect(close).toBeInViewport({ ratio: 1 })
    // The ten icons and the hairlines of the groups hold without a scrollbar.
    const scrolled = await sidebar
      .getByTestId('nav-scroll')
      .evaluate((list) => list.scrollHeight - list.clientHeight)
    expect(scrolled).toBeLessThanOrEqual(0)
    await expect(sidebar.getByRole('link', { name: 'Paramètres', exact: true })).toBeInViewport({ ratio: 1 })
    expect(await auditPage(page)).toMatchObject({ overflow: [], contrast: [], unnamed: [] })
    await close.click()
    await expect.poll(left).toBe(0)
    await expect(open).toBeFocused()
  } finally {
    await closeApp(launched)
  }
})

test('the sidebar groups its entries, the copper pill follows the page, and a new page starts at its top', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(1100, 700)
    })
    const nav = page.getByRole('navigation', { name: 'Navigation principale' })
    const entry = (name: string) => nav.getByRole('link', { name, exact: true })

    await expect(nav.getByRole('list', { name: 'Création' }).getByRole('link')).toHaveText([
      'Fiches',
      'Atelier',
      'Journal',
      'Notes',
    ])
    await expect(nav.getByRole('list', { name: 'Bar' }).getByRole('link')).toHaveText([
      'Ingrédients',
      'Préparations',
    ])
    await expect(nav.getByRole('list', { name: 'Outils' }).getByRole('link')).toHaveText([
      'Collections',
      'Calculateurs',
    ])
    // Révision is reached from a collection, the guide from the help (D-057).
    await expect(entry('Révision')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Guide d’utilisation' })).toHaveCount(0)

    // An inactive entry has its own grey: its classes are not the text of a function.
    const color = (link: Locator) => link.evaluate((element) => getComputedStyle(element).color)
    expect(await entry('Atelier').getAttribute('class')).not.toContain('=>')
    expect(await color(entry('Atelier'))).not.toBe(await color(entry('Accueil')))

    // The copper pill slides to the entry shown, across the titles of the groups.
    const top = (locator: Locator) =>
      locator.evaluate((element) => Math.round(element.getBoundingClientRect().top))
    for (const name of ['Notes', 'Calculateurs', 'Ingrédients']) {
      await entry(name).click()
      await expect(entry(name)).toHaveAttribute('aria-current', 'page')
      const expected = await top(entry(name))
      await expect.poll(() => top(page.getByTestId('nav-indicator'))).toBe(expected)
    }

    // A long page scrolled down, then another page: it starts at its top.
    await entry('Paramètres').click()
    await expect(entry('Paramètres')).toHaveAttribute('aria-current', 'page')
    const main = page.locator('main')
    await expect(main).toHaveAttribute('data-scene', 'settings')
    await main.evaluate((element) => {
      element.scrollTop = 400
    })
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await entry('Journal').click()
    await expect(main).toHaveAttribute('data-scene', 'journal')
    expect(await main.evaluate((element) => element.scrollTop)).toBe(0)
  } finally {
    await closeApp(launched)
  }
})

test('the top bar keeps search, quick idea and help, and Ctrl+N still opens the quick idea', async () => {
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const bar = page.getByRole('banner', { name: 'Barre d’outils' })
    await expect(bar.getByRole('button')).toHaveText([/Rechercher/, /Idée rapide/, 'Aide'])
    await expect(bar.getByRole('link')).toHaveCount(0)

    const idea = page.getByRole('dialog', { name: 'Idée rapide' })
    await page.keyboard.press('Control+N')
    await expect(idea).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(idea).toBeHidden()

    await bar.getByRole('button', { name: 'Idée rapide' }).click()
    await expect(idea).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(idea).toBeHidden()
  } finally {
    await closeApp(launched)
  }
})
