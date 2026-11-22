import { expect, test } from '@playwright/test'
import { closeApp, launchApp } from './helpers'
import { auditPage } from './page-audit'

const SCREENS = [
  '/',
  '/recipes',
  '/recipes/:id',
  '/recipes/:id/edit',
  '/lab',
  '/lab/:id',
  '/journal',
  '/notebook',
  '/bar',
  '/preps',
  '/collections',
  '/practice',
  '/calculators',
  '/settings',
  '/guide',
]

test('every screen fits in 1100 x 700, is readable in both themes and names its controls', async () => {
  test.setTimeout(180_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const id = await page.evaluate(async () => {
      const list = await window.shakery.recipes.list()
      return list.ok ? (list.data.find((recipe) => recipe.name === 'Negroni')?.id ?? '') : ''
    })
    expect(id).not.toBe('')

    // Asking for less gives the minimum, which is the size of the page and not of the frame.
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]
      window?.setContentSize(1440, 900)
      window?.setContentSize(500, 400)
    })
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeLessThan(1120)
    const size = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
    expect(size.width).toBeGreaterThanOrEqual(1100)
    expect(size.height).toBeGreaterThanOrEqual(700)

    const problems: string[] = []
    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate(async (value) => {
        await window.shakery.settings.set({ key: 'appearance.theme', value })
        await window.shakery.settings.set({ key: 'appearance.animations', value: false })
        localStorage.setItem('shakery.theme', value)
      }, theme)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('html')).toHaveClass(/no-motion/)
      for (const screen of SCREENS) {
        await page.evaluate(
          (to) => {
            location.hash = `#${to}`
          },
          screen.replace(':id', id),
        )
        await page.waitForTimeout(500)
        const audit = await auditPage(page)
        for (const [kind, items] of [
          ['overflow', audit.overflow],
          ['contrast', audit.contrast],
          ['unnamed', audit.unnamed],
        ] as const) {
          for (const item of items) problems.push(`${theme} ${screen} ${kind}: ${item}`)
        }
      }
    }
    expect(problems).toEqual([])

    // The ingredient of an editor line stays readable at the smallest size.
    await page.evaluate((to) => {
      location.hash = `#${to}`
    }, `/recipes/${id}/edit`)
    const field = page.getByRole('combobox', { name: 'Ingrédient de la ligne 1' })
    await expect(field).toBeVisible()
    expect((await field.boundingBox())?.width).toBeGreaterThan(180)
  } finally {
    await closeApp(launched)
  }
})

test('the theme switch repaints the page and the window, and is kept', async () => {
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Passer au thème clair' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Passer au thème sombre' })).toBeEnabled()
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe('rgb(243, 232, 220)')
    const chrome = await app.evaluate(({ BrowserWindow, nativeTheme }) => ({
      background: BrowserWindow.getAllWindows()[0]?.getBackgroundColor(),
      native: nativeTheme.themeSource,
    }))
    expect(chrome).toEqual({ background: '#F3E8DC', native: 'light' })

    // No system title bar: the top bar moves the window, its controls stay clickable.
    const regions = await page.evaluate(() => {
      const region = (selector: string) => {
        const element = document.querySelector(selector)
        return element ? getComputedStyle(element).getPropertyValue('app-region') : null
      }
      return { bar: region('header.window-drag'), button: region('header.window-drag button') }
    })
    expect(regions).toEqual({ bar: 'drag', button: 'no-drag' })

    await page.evaluate(() => {
      localStorage.removeItem('shakery.theme')
    })
    await page.reload()
    // Without the local copy, the setting of the notebook still gives the theme.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  } finally {
    await closeApp(launched)
  }
})

test('each screen has its own entrance, and nothing moves once it is on screen', async () => {
  test.setTimeout(90_000)
  const launched = await launchApp()
  const { page } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    const entrances = new Map<string, string>()
    for (const screen of SCREENS.filter((to) => !to.includes(':id'))) {
      await page.evaluate((to) => {
        location.hash = `#${to}`
      }, screen)
      // The route is rendered a moment after the address changes: never read the screen before.
      await expect(page.locator('main')).toHaveAttribute('data-scene', screen.slice(1) || 'home')
      const block = page.locator('main > * > *').first()
      await expect(block).toBeVisible()
      entrances.set(screen, await block.evaluate((element) => getComputedStyle(element).animationName))
    }
    // The notebook and the guide share the page that turns; every other screen has its own.
    expect(entrances.get('/guide')).toBe(entrances.get('/notebook'))
    expect(new Set(entrances.values()).size).toBe(entrances.size - 1)

    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.getAnimations().filter((animation) => animation.playState === 'running').length,
          ),
        { timeout: 5000 },
      )
      .toBe(0)
  } finally {
    await closeApp(launched)
  }
})
