import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { CollectionDetail, CollectionSummary } from '@shared/domain/workshop'
import { ok } from '@shared/ipc/result'
import { CollectionsPage } from './CollectionsPage'

const t = fr.workshop.collections

const SUMMARY: CollectionSummary = {
  id: 'c1',
  name: 'Carte d’hiver',
  description: null,
  kind: 'menu',
  updatedAt: 0,
  recipeIds: ['negroni', 'sour'],
  sheetCount: 0,
}

const DETAIL: CollectionDetail = {
  id: 'c1',
  name: 'Carte d’hiver',
  description: null,
  kind: 'menu',
  updatedAt: 0,
  items: [
    {
      id: 'i1',
      recipeId: 'negroni',
      sheetId: null,
      title: 'Negroni',
      status: 'final',
      family: null,
      version: 1,
      note: null,
      salePriceCents: null,
      sortOrder: 0,
    },
    {
      id: 'i2',
      recipeId: 'sour',
      sheetId: null,
      title: 'Whiskey Sour',
      status: 'testing',
      family: null,
      version: 2,
      note: null,
      salePriceCents: 1100,
      sortOrder: 1,
    },
  ],
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.collections.list.mockResolvedValue(ok([SUMMARY]))
  api.collections.get.mockResolvedValue(ok(DETAIL))
  api.collections.reorder.mockResolvedValue(ok(null))
  api.collections.exportPdf.mockResolvedValue(ok(true))
})

describe('CollectionsPage', () => {
  it('shows the items in order, moves one down and exports the PDF', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/collections', element: <CollectionsPage /> }], '/collections')

    expect(await screen.findByRole('heading', { name: 'Carte d’hiver', level: 2 })).toBeDefined()
    const links = screen.getAllByRole('link').map((link) => link.textContent)
    expect(links).toEqual(['Negroni', 'Whiskey Sour'])

    await user.click(screen.getByRole('button', { name: /^Descendre.*Negroni/ }))
    await waitFor(() => {
      expect(api.collections.reorder).toHaveBeenCalledWith({ id: 'c1', itemIds: ['i2', 'i1'] })
    })

    expect(screen.getByRole<HTMLButtonElement>('button', { name: t.prepare }).disabled).toBe(false)
    await user.click(screen.getByRole('button', { name: t.exportPdf }))
    await waitFor(() => {
      expect(api.collections.exportPdf).toHaveBeenCalledWith({ id: 'c1' })
    })
    expect(await screen.findByText(t.exported)).toBeDefined()
  })
})
