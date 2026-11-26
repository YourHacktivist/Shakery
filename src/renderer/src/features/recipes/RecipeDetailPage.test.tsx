import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useToastStore } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import {
  computation,
  ingredient,
  installShakery,
  recipeDetail,
  renderRoutes,
  type FakeShakery,
} from '@renderer/test/shakery'
import type { RecipeDetail, RecipeSummary } from '@shared/domain/catalog'
import { fail, ok } from '@shared/ipc/result'
import { RecipeDetailPage } from './RecipeDetailPage'

const td = fr.recipes.detail

/** Testing Library reads no-break spaces as plain ones. */
const plain = (text: string) => text.replaceAll(String.fromCharCode(0xa0), ' ')

const NEGRONI = recipeDetail({
  id: 'negroni',
  name: 'Negroni',
  status: 'testing',
  method: 'stir',
  family: 'spirit_forward',
  steps: ['Verser sur glace.', 'Remuer.'],
  lines: [
    {
      id: 'l1',
      ingredientId: 'gin',
      preferredProductId: null,
      quantity: 30,
      unit: 'ml',
      topEstimateMl: null,
      isOptional: false,
      isGarnish: false,
      note: null,
    },
    {
      id: 'l2',
      ingredientId: 'campari',
      preferredProductId: null,
      quantity: 2,
      unit: 'dash',
      topEstimateMl: null,
      isOptional: true,
      isGarnish: false,
      note: 'pour la couleur',
    },
  ],
  history: [
    { version: 1, label: null, createdAt: 0 },
    { version: 2, label: 'moins de vermouth', createdAt: 1 },
  ],
  version: 2,
})

function summary(detail: RecipeDetail, extra: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    id: detail.id,
    name: detail.name,
    kind: detail.kind,
    status: detail.status,
    origin: detail.origin,
    family: detail.family,
    method: detail.method,
    version: detail.version,
    isFavorite: detail.isFavorite,
    updatedAt: detail.updatedAt,
    missingIngredientIds: [],
    ...extra,
  }
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.ingredients.list.mockResolvedValue(ok([ingredient('gin', 'Gin'), ingredient('campari', 'Campari')]))
  api.recipes.get.mockResolvedValue(ok(NEGRONI))
  api.recipes.compute.mockResolvedValue(
    ok(computation({ initialVolumeMl: 30.5, finalVolumeMl: 36.6, dilution: 0.2 })),
  )
})

afterEach(() => {
  useToastStore.getState().clear()
})

function renderDetail(id = 'negroni') {
  return renderRoutes(
    [
      { path: '/recipes', element: <p>liste</p> },
      { path: '/recipes/:id', element: <RecipeDetailPage /> },
      { path: '/recipes/:id/edit', element: <p>éditeur</p> },
    ],
    `/recipes/${id}`,
  )
}

describe('RecipeDetailPage', () => {
  it('shows the lines, steps, versions and the calculated panel', async () => {
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Negroni', level: 1 })).toBeDefined()
    expect(await screen.findByText('Gin')).toBeDefined()
    expect(screen.getByText('Campari')).toBeDefined()
    expect(screen.getByText('pour la couleur')).toBeDefined()
    expect(screen.getByText(td.optional)).toBeDefined()
    expect(screen.getByText('Verser sur glace.')).toBeDefined()
    expect(screen.getByText(/moins de vermouth/)).toBeDefined()
    expect(await screen.findByText(plain(fr.recipes.panel.initialVolume('31')))).toBeDefined()
  })

  it('keeps four actions in sight and the others in « Plus »', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: 'Negroni', level: 1 })
    for (const name of [td.edit, td.lab, fr.recipes.prepare.open, td.taste]) {
      expect(screen.getByRole('button', { name })).toBeDefined()
    }
    expect(screen.queryByRole('button', { name: fr.recipes.share.open })).toBeNull()

    await user.click(screen.getByRole('button', { name: td.more }))
    const menu = await screen.findByRole('menu', { name: td.more })
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent)
    expect(items[0]).toBe(td.variant)
    expect(items.at(-1)).toBe(td.delete)
    expect(
      within(menu).getByRole('menuitem', { name: new RegExp(`^${fr.recipes.sheet.open}`) }),
    ).toBeDefined()
    expect(within(menu).getByRole('menuitem', { name: fr.recipes.share.open })).toBeDefined()
    expect(within(menu).getByRole('separator')).toBeDefined()
  })

  it('gathers the unknown values of the calculations in one sentence', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: 'Negroni', level: 1 })
    const tp = fr.recipes.panel
    const sentence = plain(
      tp.toComplete([tp.unknown.abv, tp.unknown.sugar, tp.unknown.acid, tp.unknown.cost]),
    )
    expect(await screen.findByText(sentence, { exact: false })).toBeDefined()
    const toggle = screen.getByRole('button', { name: tp.showMissing })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: tp.hideMissing }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(tp.costMissing)).toBeDefined()
    expect(screen.getByText(tp.noAllergen)).toBeDefined()
  })

  it('says when the recipe does not exist', async () => {
    api.recipes.get.mockResolvedValue(fail('NOT_FOUND', 'missing'))
    renderDetail('ghost')
    expect(await screen.findByText(td.notFound)).toBeDefined()
  })

  it('changes the status and the favorite flag', async () => {
    const user = userEvent.setup()
    api.recipes.setStatus.mockResolvedValue(ok(summary(NEGRONI, { status: 'final' })))
    api.recipes.setFavorite.mockResolvedValue(ok(summary(NEGRONI, { isFavorite: true })))
    renderDetail()
    await screen.findByRole('heading', { name: 'Negroni', level: 1 })

    await user.click(screen.getByRole('button', { name: /^Statut/ }))
    await user.click(await screen.findByRole('menuitemradio', { name: fr.components.display.status.final }))
    await waitFor(() => {
      expect(api.recipes.setStatus).toHaveBeenCalledWith({ id: 'negroni', status: 'final' })
    })
    expect(await screen.findByText(plain(td.statusChanged(fr.components.display.status.final)))).toBeDefined()

    await user.click(screen.getByRole('button', { name: td.favoriteAdd }))
    await waitFor(() => {
      expect(api.recipes.setFavorite).toHaveBeenCalledWith({ id: 'negroni', favorite: true })
    })
    expect(await screen.findByText(td.favoriteAdded)).toBeDefined()
  })

  it('deletes, goes back to the list and offers to undo', async () => {
    const user = userEvent.setup()
    api.recipes.delete.mockResolvedValue(ok(null))
    api.recipes.restore.mockResolvedValue(ok(NEGRONI))
    renderDetail()
    await screen.findByRole('heading', { name: 'Negroni', level: 1 })

    // Nothing destructive in sight: the deletion waits at the end of « Plus » (D-057).
    expect(screen.queryByRole('button', { name: td.delete })).toBeNull()
    await user.click(screen.getByRole('button', { name: td.more }))
    await user.click(await screen.findByRole('menuitem', { name: td.delete }))
    expect(await screen.findByText('liste')).toBeDefined()
    expect(screen.getByText(plain(td.deleted('Negroni')))).toBeDefined()

    await user.click(screen.getByRole('button', { name: fr.shell.toast.undo }))
    await waitFor(() => {
      expect(api.recipes.restore).toHaveBeenCalledWith({ id: 'negroni' })
    })
    expect(await screen.findByText(plain(td.restored('Negroni')))).toBeDefined()
  })

  it('creates a variant under a new name and opens it', async () => {
    const user = userEvent.setup()
    api.recipes.createVariant.mockResolvedValue(ok(recipeDetail({ id: 'variant', name: 'Negroni blanc' })))
    renderDetail()
    await screen.findByRole('heading', { name: 'Negroni', level: 1 })

    await user.click(screen.getByRole('button', { name: td.more }))
    await user.click(await screen.findByRole('menuitem', { name: td.variant }))
    const field = await screen.findByLabelText(td.variantDialog.name)
    expect((field as HTMLInputElement).value).toBe(td.variantDialog.defaultName('Negroni'))
    await user.clear(field)
    await user.type(field, 'Negroni blanc')
    await user.click(screen.getByRole('button', { name: td.variantDialog.confirm }))
    await waitFor(() => {
      expect(api.recipes.createVariant).toHaveBeenCalledWith({ id: 'negroni', name: 'Negroni blanc' })
    })
    expect(await screen.findByText(plain(td.variantDialog.created('Negroni blanc')))).toBeDefined()
  })
})
