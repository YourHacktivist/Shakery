import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { RecipeSummary } from '@shared/domain/catalog'
import { ok } from '@shared/ipc/result'
import { filterRecipes, RecipesPage, useRecipeFilters } from './RecipesPage'

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
  useRecipeFilters.getState().reset()
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
      origins: [],
      methods: [],
      view: 'all',
      sort: 'activity',
    }
    expect(filterRecipes(RECIPES, base).map((r) => r.id)).toEqual(['a', 'c', 'b'])
    expect(filterRecipes(RECIPES, { ...base, sort: 'name' }).map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(
      filterRecipes(RECIPES, { ...base, statuses: ['testing'], families: ['sour'] }).map((r) => r.id),
    ).toEqual(['a'])
    expect(filterRecipes(RECIPES, { ...base, view: 'favorites' }).map((r) => r.id)).toEqual(['b'])
    expect(filterRecipes(RECIPES, { ...base, origins: ['classic'] }).map((r) => r.id)).toEqual(['c'])
  })
})

describe('RecipesPage', () => {
  it('lists the recipes by last activity, then filters them by status and favourites', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    expect(rowNames()).toEqual(['Sour rhubarbe', 'Highball yuzu', 'Negroni fumé'])
    expect(screen.getByText(t.count(3))).toBeDefined()

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
    expect(rowNames()).toHaveLength(3)
  })

  it('says when no recipe matches the filters', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    await screen.findByRole('listbox', { name: t.tableLabel })
    await user.click(screen.getByRole('button', { name: new RegExp(`^${t.filters.origin}`) }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: fr.recipes.origins.other }))
    await user.keyboard('{Escape}')
    expect(await screen.findByText(t.noMatch.title)).toBeDefined()
  })

  it('explains what to do when the notebook has no recipe yet', async () => {
    api.recipes.list.mockResolvedValue(ok([]))
    renderRoutes([{ path: '/recipes', element: <RecipesPage /> }], '/recipes')
    expect(await screen.findByText(t.empty.title)).toBeDefined()
    expect(screen.getAllByRole('button', { name: new RegExp(t.newRecipe) }).length).toBeGreaterThan(0)
  })
})
