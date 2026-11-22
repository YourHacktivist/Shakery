import { expect, test, type Page } from '@playwright/test'
import { closeApp, launchApp } from './helpers'
import { auditAlignment } from './page-alignment'
import { auditPage } from './page-audit'

/** A notebook with names as long as real ones: short names hide what wraps. */
async function fill(page: Page) {
  return page.evaluate(async () => {
    const api = window.shakery
    const list = await api.recipes.list()
    if (!list.ok) throw new Error('recipes.list')
    const negroni = list.data.find((recipe) => recipe.name === 'Negroni')
    if (!negroni) throw new Error('no Negroni')
    const classic = await api.recipes.get({ id: negroni.id })
    if (!classic.ok) throw new Error('recipes.get')
    const ingredient = classic.data.lines[0]?.ingredientId ?? ''
    const second = classic.data.lines[1]?.ingredientId ?? ''
    const bottle = await api.products.create({
      ingredientId: ingredient,
      name: 'Bouteille fictive, réserve vieillie douze ans en fût de chêne',
      owned: true,
    })
    if (!bottle.ok) throw new Error('products.create')
    const own = await api.recipes.create({
      data: {
        name: 'Fiche fictive au nom long, sour rhubarbe et poivre de Timut',
        status: 'testing',
        family: 'sour',
        steps: ['Secouer', 'Servir'],
        lines: [
          { ingredientId: ingredient, quantity: 40, unit: 'ml', preferredProductId: bottle.data.id },
          { ingredientId: second, quantity: null, unit: 'top', topEstimateMl: 90 },
        ],
      },
    })
    if (!own.ok) throw new Error('recipes.create')
    const categories = await api.reference.listCategories()
    if (!categories.ok) throw new Error('reference.listCategories')
    const parents = new Set(categories.data.map((category) => category.parentId))
    const leaf = categories.data.find((category) => !parents.has(category.id))
    const prep = await api.recipes.create({
      data: {
        name: 'Sirop fictif de miel, gingembre frais et citron confit',
        kind: 'prep',
        yieldMl: 500,
        shelfLifeDays: 7,
        prepCategoryId: leaf?.id ?? null,
      },
    })
    if (!prep.ok) throw new Error('recipes.create, preparation')
    await api.batches.create({ recipeId: prep.data.id, madeAt: Date.now(), quantityMl: 500 })
    await api.tastingNotes.create({
      recipeId: own.data.id,
      recipeVersion: 1,
      tastedAt: Date.now(),
      overall: 4,
      nextStep: 'Moins de sirop',
    })
    const collection = await api.collections.create({
      name: 'Carte fictive d’automne, créations et classiques revisités',
      kind: 'menu',
    })
    if (!collection.ok) throw new Error('collections.create')
    await api.collections.addRecipes({ id: collection.data.id, recipeIds: [negroni.id, own.data.id] })
    return { recipe: own.data.id, ingredient }
  })
}

test('buttons, fields and rows line up on every screen, with long names', async () => {
  test.setTimeout(240_000)
  const launched = await launchApp()
  const { page, app } = launched
  try {
    await expect(page.getByTestId('app-version')).toBeVisible()
    await page.evaluate(() => window.shakery.settings.set({ key: 'appearance.animations', value: false }))
    const { recipe, ingredient } = await fill(page)
    await page.reload()
    await expect(page.getByTestId('app-version')).toBeVisible()
    const routes = [
      '/',
      '/recipes',
      `/recipes/${recipe}`,
      '/recipes/new',
      `/recipes/${recipe}/edit`,
      '/lab',
      `/lab/${recipe}`,
      '/journal',
      '/notebook',
      '/bar',
      `/bar?ingredient=${ingredient}`,
      '/preps',
      '/collections',
      '/practice',
      '/calculators',
      '/settings',
      '/guide',
      `/prepare/${recipe}`,
    ]

    const found: string[] = []
    // The smallest window, a laptop at 125 % maximised, a large screen; then without the sidebar.
    const passes = [
      { width: 1100, height: 700, closed: false },
      { width: 1536, height: 816, closed: false },
      { width: 1920, height: 1040, closed: false },
      { width: 1100, height: 700, closed: true },
    ]
    for (const { width, height, closed } of passes) {
      if (closed) {
        await page.evaluate(() => {
          location.hash = '#/'
        })
        await page.getByRole('button', { name: 'Fermer la barre latérale' }).click()
      }
      for (const route of routes) {
        await app.evaluate(
          ({ BrowserWindow }, size) => {
            const window = BrowserWindow.getAllWindows()[0]
            if (!window) return
            // The preparation mode takes the whole screen; the sizes are what is tested here.
            window.setFullScreen(false)
            window.setContentSize(size.width, size.height)
          },
          { width, height },
        )
        await page.evaluate((to) => {
          location.hash = `#${to}`
        }, route)
        await page.waitForTimeout(450)
        const where = `${String(width)}${closed ? ' closed' : ''} ${route.replace(recipe, ':id')}`
        found.push(...(await auditAlignment(page)).map((problem) => `${where}: ${problem}`))
        found.push(...(await auditPage(page)).overflow.map((problem) => `${where}: too wide ${problem}`))
      }
    }
    expect([...new Set(found)]).toEqual([])

    // And the measure does see a button out of line.
    await page.evaluate(() => {
      location.hash = '#/'
    })
    const help = page.getByRole('button', { name: 'Aide', exact: true })
    await expect(help).toBeVisible()
    await help.evaluate((button) => {
      button.style.position = 'relative'
      button.style.top = '5px'
    })
    expect((await auditAlignment(page)).join('\n')).toContain('Aide')
  } finally {
    await closeApp(launched)
  }
})
