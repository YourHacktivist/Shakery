import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useToastStore } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import { ingredient, installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { IngredientDetail, Product } from '@shared/domain/catalog'
import { ok } from '@shared/ipc/result'
import { BarPage } from './BarPage'

const t = fr.bar

/** Testing Library reads no-break spaces as plain ones. */
const plain = (text: string) => text.replaceAll(String.fromCharCode(0xa0), ' ')

const CATEGORIES = [
  { id: 'spirits', name: 'Spiritueux', slug: 'spiritueux', parentId: null, sortOrder: 0, batchHint: 'ok' },
  { id: 'gin-cat', name: 'Gin', slug: 'gin', parentId: 'spirits', sortOrder: 0, batchHint: 'ok' },
  { id: 'juices', name: 'Jus', slug: 'jus', parentId: null, sortOrder: 1, batchHint: 'fresh' },
  { id: 'citrus', name: 'Agrumes', slug: 'agrumes', parentId: 'juices', sortOrder: 0, batchHint: 'fresh' },
] as const

const GIN_DETAIL: IngredientDetail = {
  ...ingredient('gin', 'Gin London Dry', { categoryId: 'gin-cat', defaultAbv: 40 }),
  sugarGPerL: null,
  acidGPerL: null,
  compositionSource: null,
  compositionConfidence: null,
  densityGPerMl: null,
  flavorTags: [],
  description: null,
  allergens: [],
  usedBy: [{ id: 'negroni', name: 'Negroni' }],
}

const BOTTLE: Product = {
  id: 'bottle-1',
  ingredientId: 'gin',
  brand: 'Maison',
  name: 'Gin sec',
  abv: 43,
  volumeMl: 700,
  sugarGPerL: null,
  acidGPerL: null,
  barcode: null,
  purchasePriceCents: null,
  purchasePriceBasis: null,
  packQuantity: null,
  packUnit: null,
  owned: false,
  personalNotes: null,
  allergens: [],
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.reference.listCategories.mockResolvedValue(ok([...CATEGORIES]))
  api.ingredients.list.mockResolvedValue(
    ok([
      ingredient('gin', 'Gin London Dry', { categoryId: 'gin-cat', defaultAbv: 40 }),
      ingredient('lime', 'Citron vert', { categoryId: 'citrus', aliases: ['lime'] }),
    ]),
  )
  api.ingredients.get.mockResolvedValue(ok(GIN_DETAIL))
  api.products.listByIngredient.mockResolvedValue(ok([BOTTLE]))
})

afterEach(() => {
  useToastStore.getState().clear()
})

function renderBar() {
  return renderRoutes([{ path: '/bar', element: <BarPage /> }], '/bar')
}

describe('BarPage', () => {
  it('groups ingredients by category and filters by name or alias', async () => {
    const user = userEvent.setup()
    renderBar()
    const list = await screen.findByRole('navigation', { name: t.listLabel })
    expect(await within(list).findByRole('button', { name: 'Gin London Dry' })).toBeDefined()
    expect(within(list).getByRole('button', { name: 'Citron vert' })).toBeDefined()

    await user.type(screen.getByLabelText(t.search), 'lime')
    await waitFor(() => {
      expect(within(list).queryByRole('button', { name: 'Gin London Dry' })).toBeNull()
    })
    expect(within(list).getByRole('button', { name: 'Citron vert' })).toBeDefined()

    await user.clear(screen.getByLabelText(t.search))
    await user.type(screen.getByLabelText(t.search), 'zzz')
    expect(await screen.findByText(t.noMatch)).toBeDefined()
  })

  it('shows an ingredient with what is missing, its recipes and its bottles', async () => {
    const user = userEvent.setup()
    api.products.setOwned.mockResolvedValue(ok({ ...BOTTLE, owned: true }))
    renderBar()
    await user.click(await screen.findByRole('button', { name: 'Gin London Dry' }))

    expect(await screen.findByRole('heading', { name: 'Gin London Dry', level: 2 })).toBeDefined()
    expect(screen.getByText(t.detail.compositionMissing)).toBeDefined()
    expect(screen.getByText('Negroni')).toBeDefined()
    expect(await screen.findByText('Maison Gin sec')).toBeDefined()

    await user.click(screen.getByRole('switch', { name: t.bottle.ownedLabel('Maison Gin sec') }))
    await waitFor(() => {
      expect(api.products.setOwned).toHaveBeenCalledWith({ id: 'bottle-1', owned: true })
    })
  })

  it('creates an ingredient in a leaf category', async () => {
    const user = userEvent.setup()
    api.ingredients.create.mockResolvedValue(ok(ingredient('yuzu', 'Jus de yuzu', { categoryId: 'citrus' })))
    renderBar()
    await screen.findByRole('button', { name: 'Gin London Dry' })

    await user.click(screen.getByRole('button', { name: t.newIngredient }))
    const dialog = await screen.findByRole('dialog', { name: t.ingredientForm.createTitle })
    await user.type(within(dialog).getByLabelText(t.ingredientForm.name), 'Jus de yuzu')
    await user.selectOptions(within(dialog).getByLabelText(t.ingredientForm.category), 'citrus')
    await user.click(within(dialog).getByRole('button', { name: t.ingredientForm.save }))

    await waitFor(() => {
      expect(api.ingredients.create).toHaveBeenCalledTimes(1)
    })
    expect(api.ingredients.create.mock.calls[0]?.[0]).toMatchObject({
      name: 'Jus de yuzu',
      categoryId: 'citrus',
    })
    expect(await screen.findByText(plain(t.ingredientForm.created('Jus de yuzu')))).toBeDefined()
  })
})
