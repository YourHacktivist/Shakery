import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { RecipeSummary } from '@shared/domain/catalog'
import type { RecipeFacets } from '@shared/domain/facets'
import { ok } from '@shared/ipc/result'
import { countByOrigin, DEFAULT_FILTERS, filterRecipes, useRecipeFilters } from './filters'
import { RecipesPage } from './RecipesPage'

const t = fr.recipes.list

function summary(id: string, name: string, extra: Partial<RecipeSummary>): RecipeSummary {
  return {
    id,
    name,
    kind: 'cocktail',
    status: 'draft',
    origin: 'mine',
    family: null,
    method: null,
    version: 1,
    isFavorite: false,
    updatedAt: 0,
    missingIngredientIds: [],
    ...extra,
  }
}

const RECIPES = [
  summary('a', 'Sour rhubarbe', { status: 'testing', family: 'sour', updatedAt: 3000 }),
  summary('b', 'Negroni fumé', {
    status: 'testing',
    family: 'spirit_forward',
    isFavorite: true,
    updatedAt: 1000,
  }),
  summary('c', 'Highball yuzu', { status: 'idea', family: 'highball', origin: 'classic', updatedAt: 2000 }),
  summary('d', 'Old Fashioned miel', { status: 'draft', origin: 'other', version: 3, updatedAt: 500 }),
]

// The virtual list needs a size to render its rows; jsdom measures every element at 0.
const sizes = ['clientHeight', 'clientWidth'] as const
const originals = sizes.map((key) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, key))
beforeAll(() => {
  for (const key of sizes) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => 800 })
  }
})
afterAll(() => {
  sizes.forEach((key, index) => {
    const original = originals[index]
    if (original) Object.defineProperty(HTMLElement.prototype, key, original)
  })
})

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.recipes.list.mockResolvedValue(ok(RECIPES))
  useRecipeFilters.setState({ ...DEFAULT_FILTERS, showMore: false })
})

function rowNames() {
  const list = screen.getByRole('listbox', { name: t.tableLabel })
  return within(list)
    .queryAllByRole('option')
    .map((row) => RECIPES.find((recipe) => row.textContent.includes(recipe.name))?.name)
}

describe('filterRecipes', () => {
  it('combines filters of different kinds and sorts by activity or name', () => {
    const base: Parameters<typeof filterRecipes>[1] = {
      statuses: [],
      families: [],
      methods: [],
      view: 'all',
      sort: 'activity',
    }
    expect(filterRecipes(RECIPES, base).map((r) => r.id)).toEqual(['a', 'c', 'b', 'd'])
    expect(filterRecipes(RECIPES, { ...base, sort: 'name' }).map((r) => r.id)).toEqual(['c', 'b', 'd', 'a'])
    expect(
      filterRecipes(RECIPES, { ...base, statuses: ['testing'], families: ['sour'] }).map((r) => r.id),
    ).toEqual(['a'])
    expect(filterRecipes(RECIPES, { ...base, view: 'favorites' }).map((r) => r.id)).toEqual(['b'])
  })

  it('keeps the creations apart from the classics (D-057)', () => {
    expect(filterRecipes(RECIPES, { view: 'mine' }).map((r) => r.id)).toEqual(['a', 'b', 'd'])
    expect(filterRecipes(RECIPES, { view: 'classics' }).map((r) => r.id)).toEqual(['c'])
    expect(countByOrigin(RECIPES)).toEqual({ mine: 3, classics: 1 })
  })
})

describe('RecipesPage', () => {
  it('opens on the creations, then filters them by status and changes the view', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    expect(rowNames()).toEqual(['Sour rhubarbe', 'Negroni fumé', 'Old Fashioned miel'])
    expect(screen.getByText(t.count(4))).toBeDefined()
    const mine = screen.getByRole('radio', { name: new RegExp(`^${t.filters.mine}`) })
    expect(mine.getAttribute('aria-checked')).toBe('true')
    expect(mine.textContent).toContain('3')

    await user.click(screen.getByRole('button', { name: new RegExp(`^${t.filters.status}`) }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: fr.components.display.status.testing }))
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(rowNames()).toEqual(['Sour rhubarbe', 'Negroni fumé'])
    })
    expect(screen.getByText(t.shown(2, 3))).toBeDefined()

    await user.click(screen.getByRole('radio', { name: t.filters.favorites }))
    expect(rowNames()).toEqual(['Negroni fumé'])

    await user.click(screen.getByRole('button', { name: t.filters.reset }))
    await user.click(screen.getByRole('radio', { name: new RegExp(`^${t.filters.classics}`) }))
    expect(rowNames()).toEqual(['Highball yuzu'])
  })

  it('shows the version beside the name from the second one, and an unknown family as a line', async () => {
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    const option = screen.getAllByRole('option').find((row) => row.textContent.includes('Old Fashioned miel'))
    expect(option?.textContent).toContain(fr.components.display.version(3))
    expect(option?.textContent).toContain(fr.components.display.stat.empty)
    const first = screen.getAllByRole('option').find((row) => row.textContent.includes('Sour rhubarbe'))
    expect(first?.textContent).not.toContain(fr.components.display.version(1))
  })

  it('opens the other filters and says when no recipe matches them', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    expect(screen.queryByRole('button', { name: new RegExp(`^${t.filters.method}`) })).toBeNull()

    const more = screen.getByRole('button', { name: new RegExp(`^${t.filters.more}`) })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    await user.click(more)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    await user.click(screen.getByRole('button', { name: new RegExp(`^${t.filters.method}`) }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: fr.recipes.methods.shake }))
    await user.keyboard('{Escape}')
    expect(await screen.findByText(t.noMatch.title)).toBeDefined()
  })

  it('points to the classics at the end of the creations', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    expect(screen.getByText(t.classicsNote)).toBeDefined()
    await user.click(screen.getByRole('button', { name: t.browseClassics }))
    expect(rowNames()).toEqual(['Highball yuzu'])
    expect(screen.queryByText(t.classicsNote)).toBeNull()
  })

  it('explains what to do when the notebook has no recipe yet', async () => {
    api.recipes.list.mockResolvedValue(ok([]))
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    expect(await screen.findByText(t.empty.title)).toBeDefined()
    expect(screen.getAllByRole('button', { name: new RegExp(t.newRecipe) }).length).toBeGreaterThan(0)
  })
})

describe('filterRecipes, « without » (D-040)', () => {
  const facet = (
    id: string,
    allergens: RecipeFacets['allergens'],
    allergensUnknown = false,
  ): [string, RecipeFacets] => [
    id,
    {
      id,
      glassId: null,
      spirit: 'none',
      tags: [],
      flavors: [],
      allergens,
      allergensUnknown,
      rating: id === 'c' ? 4.5 : null,
    },
  ]

  it('hides what contains the allergen and what nobody can vouch for', () => {
    const facets = new Map<string, RecipeFacets>([facet('a', ['milk']), facet('b', [], true), facet('c', [])])
    const ids = (...without: RecipeFacets['allergens']) =>
      filterRecipes(RECIPES, { without }, { facets }).map((recipe) => recipe.id)
    expect(ids('milk')).toEqual(['c'])
    expect(ids('nuts').sort()).toEqual(['a', 'c'])
  })

  it('claims nothing while the allergens load', () => {
    expect(filterRecipes(RECIPES, { without: ['milk'] })).toEqual([])
  })

  it('sorts by grade, the recipes without grade last', () => {
    const facets = new Map<string, RecipeFacets>([facet('a', []), facet('b', []), facet('c', [])])
    expect(filterRecipes(RECIPES, { sort: 'rating' }, { facets }).map((recipe) => recipe.id)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ])
  })
})
