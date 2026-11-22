import { expect, test } from '@playwright/test'
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
    // The hidden blocks take no height: the eleven icons hold without a scrollbar.    const scrolled = await sidebar      .getByRole('navigation')      .evaluate((nav) => (nav.parentElement?.scrollHeight ?? 0) - (nav.parentElement?.clientHeight ?? 0))    expect(scrolled).toBeLessThanOrEqual(0)
    await close.click()
    await expect.poll(left).toBe(0)
    await expect(open).toBeFocused()
  } finally {
    await closeApp(launched)
  }
})
