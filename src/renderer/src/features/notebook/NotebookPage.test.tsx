import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, recipeDetail, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { NotebookEntry } from '@shared/domain/journal'
import { ok } from '@shared/ipc/result'
import { NotebookPage } from './NotebookPage'

const t = fr.journal.notebook

function entry(extra: Partial<NotebookEntry> = {}): NotebookEntry {
  return {
    id: 'entry-1',
    title: 'Fraise et basilic',
    body: 'À essayer avec un gin floral.',
    tags: ['été'],
    isPinned: false,
    updatedAt: Date.now() - 60_000,
    links: [],
    ...extra,
  }
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
})

describe('NotebookPage', () => {
  it('links a recipe typed after « @ », then saves the note on its own', async () => {
    const user = userEvent.setup()
    api.notebook.list.mockResolvedValue(
      ok([entry(), entry({ id: 'entry-2', title: 'Épinglée', isPinned: true })]),
    )
    api.search.query.mockResolvedValue(
      ok([
        {
          entityType: 'recipe',
          id: 'recipe-1',
          title: 'Negroni',
          detail: null,
          status: 'final',
          parentId: null,
          match: 'prefix',
        },
      ]),
    )
    api.notebook.update.mockImplementation(({ id, data }) =>
      Promise.resolve(
        ok(
          entry({
            id,
            title: data.title,
            body: data.body ?? '',
            links: (data.links ?? []).map((link) => ({ ...link, name: 'Negroni' })),
          }),
        ),
      ),
    )
    renderRoutes([{ path: '/notebook', element: <NotebookPage /> }], '/notebook')

    const items = await screen.findAllByRole('button', { name: /Fraise et basilic|Épinglée/ })
    // Pinned notes come first.
    expect(items[0]?.textContent).toContain('Épinglée')

    await user.click(screen.getByRole('button', { name: /Fraise et basilic/ }))
    const body = screen.getByRole('combobox', { name: t.body })
    await user.click(body)
    await user.keyboard('{End} Comme un @Negr')
    const listbox = await screen.findByRole('listbox', { name: t.mentions })
    await user.click(within(listbox).getByRole('option', { name: /Negroni/ }))

    expect(screen.getByRole('link', { name: 'Negroni' })).toBeDefined()
    await waitFor(
      () => {
        expect(api.notebook.update).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )
    const saved = api.notebook.update.mock.calls.at(-1)?.[0]
    expect(saved?.data.body).toContain('Comme un Negroni')
    expect(saved?.data.links).toEqual([{ entityType: 'recipe', entityId: 'recipe-1' }])
  })

  it('turns a note into a recipe idea', async () => {
    const user = userEvent.setup()
    api.notebook.list.mockResolvedValue(ok([entry()]))
    api.recipes.create.mockResolvedValue(
      ok(recipeDetail({ id: 'idea-1', name: 'Fraise et basilic', status: 'idea' })),
    )
    renderRoutes(
      [
        { path: '/notebook', element: <NotebookPage /> },
        { path: '/recipes/:id', element: <p>Fiche ouverte</p> },
      ],
      '/notebook',
    )
    await user.click(await screen.findByRole('button', { name: /Fraise et basilic/ }))
    await user.click(screen.getByRole('button', { name: t.toIdea }))
    expect(await screen.findByText('Fiche ouverte')).toBeDefined()
    expect(api.recipes.create.mock.calls[0]?.[0].data).toMatchObject({
      name: 'Fraise et basilic',
      status: 'idea',
      notes: 'À essayer avec un gin floral.',
    })
  })
})
