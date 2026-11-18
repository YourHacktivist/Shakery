/**
 * Test helpers for the screens: a fake `window.shakery` whose operations are Vitest mocks,
 * and a render inside the providers of the application (React Query, data router, toasts).
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi, type Mock } from 'vitest'
import { Toaster } from '@renderer/components/Toast'
import { createQueryClient } from '@renderer/lib/queries'
import type { ShakeryApi } from '@shared/ipc/api'
import { IPC_CHANNELS } from '@shared/ipc/channels'
import { fail, ok } from '@shared/ipc/result'
import type { IngredientSummary, RecipeComputation, RecipeDetail } from '@shared/domain/catalog'

export type FakeShakery = {
  [D in keyof ShakeryApi]: {
    [O in keyof ShakeryApi[D]]: ShakeryApi[D][O] extends (...args: never[]) => unknown
      ? Mock<ShakeryApi[D][O]>
      : never
  }
}

const EMPTY_LISTS = [
  'reference.listGlasses',
  'reference.listIceTypes',
  'reference.listCategories',
  'ingredients.list',
  'products.listByIngredient',
  'recipes.list',
  'tastingNotes.list',
  'notebook.list',
  'preps.list',
  'collections.list',
  'practice.history',
  'practice.weakKeys',
]

/** Installs a fake bridge: lists are empty, any other call fails until a test mocks it. */
export function installShakery(): FakeShakery {
  const api: Record<string, Record<string, Mock>> = {}
  for (const channel of IPC_CHANNELS) {
    const [domain = '', operation = ''] = channel.split('.')
    const calls = (api[domain] ??= {})
    calls[operation] = EMPTY_LISTS.includes(channel)
      ? vi.fn(() => Promise.resolve(ok([])))
      : vi.fn(() => Promise.resolve(fail('UNAVAILABLE', `${channel} is not mocked`)))
  }
  Object.defineProperty(window, 'shakery', { value: api, configurable: true })
  return api as unknown as FakeShakery
}

/** Renders routes at a path, with a fresh query cache and the toast area. */
export function renderRoutes(routes: RouteObject[], path: string) {
  const client = createQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return { ...view, router, client }
}

export function ingredient(
  id: string,
  name: string,
  extra: Partial<IngredientSummary> = {},
): IngredientSummary {
  return {
    id,
    name,
    categoryId: 'cat-leaf',
    defaultAbv: null,
    isStaple: false,
    isFavorite: false,
    prepRecipeId: null,
    aliases: [],
    ...extra,
  }
}

export function recipeDetail(extra: Partial<RecipeDetail> = {}): RecipeDetail {
  return {
    id: 'recipe-1',
    name: 'Essai',
    kind: 'cocktail',
    status: 'draft',
    origin: 'mine',
    credit: null,
    family: null,
    method: null,
    glassId: null,
    iceId: null,
    garnish: null,
    steps: [],
    notes: null,
    tags: [],
    dilutionOverridePct: null,
    parentRecipeId: null,
    yieldMl: null,
    shelfLifeDays: null,
    storageNotes: null,
    drinkLength: null,
    servingMoment: null,
    profile: null,
    garnishCostHtCents: null,
    prepCategoryId: null,
    version: 1,
    isFavorite: false,
    createdAt: 0,
    updatedAt: 0,
    lines: [],
    history: [{ version: 1, label: null, createdAt: 0 }],
    ...extra,
  }
}

export function computation(extra: Partial<RecipeComputation> = {}): RecipeComputation {
  const unknown = { value: null, status: 'incomplete' as const, issues: [] }
  return {
    initialVolumeMl: 0,
    finalVolumeMl: 0,
    dilution: 0,
    approximate: false,
    abv: unknown,
    sugarPer100Ml: unknown,
    acidPer100Ml: unknown,
    ratio: unknown,
    costCents: null,
    costBasis: null,
    costStatus: 'incomplete',
    allergens: [],
    optionalAllergens: [],
    ...extra,
  }
}
