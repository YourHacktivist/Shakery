import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TastingDialog } from '@renderer/app/TastingDialog'
import { fr } from '@renderer/i18n/fr'
import { installShakery, recipeDetail, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { TastingNote } from '@shared/domain/journal'
import { ok } from '@shared/ipc/result'
import { JournalPage } from './JournalPage'

const t = fr.journal

function note(extra: Partial<TastingNote> = {}): TastingNote {
  return {
    id: 'note-1',
    recipeId: 'recipe-1',
    recipeName: 'Essai',
    recipeVersion: 2,
    tastedAt: Date.now() - 60_000,
    overall: 4,
    scores: { sweetness: 1, acidity: 0 },
    comment: 'Un peu trop sucré.',
    nextStep: '5 ml de sirop en moins',
    nextStepDone: false,
    context: null,
    ...extra,
  }
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
})

describe('TastingDialog', () => {
  it('saves a note on the proposed recipe and version, with the rating, criteria and next step', async () => {
    const user = userEvent.setup()
    api.recipes.list.mockResolvedValue(
      ok([
        {
          id: 'recipe-1',
          name: 'Essai',
          kind: 'cocktail',
          status: 'testing',
          origin: 'mine',
          family: null,
          method: null,
          version: 2,
          isFavorite: false,
          updatedAt: 0,
          missingIngredientIds: [],
        },
      ]),
    )
    api.recipes.get.mockResolvedValue(
      ok(
        recipeDetail({
          version: 2,
          history: [
            { version: 1, label: null, createdAt: 0 },
            { version: 2, label: 'moins sucré', createdAt: 1 },
          ],
        }),
      ),
    )
    api.tastingNotes.create.mockImplementation((input) =>
      Promise.resolve(ok(note({ id: 'new', recipeId: input.recipeId, recipeVersion: input.recipeVersion }))),
    )
    let closed = false
    renderRoutes(
      [
        {
          path: '/',
          element: (
            <TastingDialog
              open
              recipeId="recipe-1"
              version={null}
              onClose={() => {
                closed = true
              }}
            />
          ),
        },
      ],
      '/',
    )
    const dialog = await screen.findByRole('dialog', { name: t.dialog.title })
    await waitFor(() => {
      expect(within(dialog).getByLabelText<HTMLSelectElement>(t.dialog.version).value).toBe('2')
    })
    await user.click(within(dialog).getByRole('radio', { name: t.dialog.overallOption(4) }))
    const sweetness = within(dialog).getByRole('radiogroup', { name: t.criteria.sweetness })
    await user.click(within(sweetness).getAllByRole('radio')[3] as HTMLElement)
    await user.type(within(dialog).getByLabelText(t.dialog.nextStep), '5 ml de sirop en moins')
    await user.click(within(dialog).getByRole('button', { name: t.dialog.save }))

    await waitFor(() => {
      expect(api.tastingNotes.create).toHaveBeenCalledOnce()
    })
    expect(api.tastingNotes.create.mock.calls[0]?.[0]).toMatchObject({
      recipeId: 'recipe-1',
      recipeVersion: 2,
      overall: 4,
      scores: { sweetness: 1 },
      nextStep: '5 ml de sirop en moins',
    })
    await waitFor(() => {
      expect(closed).toBe(true)
    })
  })

  it('asks for the recipe before saving', async () => {
    const user = userEvent.setup()
    renderRoutes(
      [
        {
          path: '/',
          element: <TastingDialog open recipeId={null} version={null} onClose={() => undefined} />,
        },
      ],
      '/',
    )
    const dialog = await screen.findByRole('dialog', { name: t.dialog.title })
    await user.click(within(dialog).getByRole('button', { name: t.dialog.save }))
    expect(await within(dialog).findByText(t.dialog.recipeRequired)).toBeDefined()
    expect(api.tastingNotes.create).not.toHaveBeenCalled()
  })
})

describe('JournalPage', () => {
  it('lists the notes, filters the ones to retest and checks a next step as tested', async () => {
    const user = userEvent.setup()
    api.tastingNotes.list.mockResolvedValue(
      ok([note(), note({ id: 'note-2', recipeName: 'Autre', recipeId: 'recipe-2', nextStep: null })]),
    )
    api.tastingNotes.setNextStepDone.mockResolvedValue(ok(note({ nextStepDone: true })))
    renderRoutes([{ path: '/journal', element: <JournalPage /> }], '/journal')

    expect(await screen.findByRole('link', { name: 'Essai' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Autre' })).toBeDefined()
    expect(screen.getAllByRole('img', { name: /4 sur 5/ })).toHaveLength(2)
    expect(screen.getAllByText(t.scoreChip(t.criteria.sweetness, '+1'))).toHaveLength(2)

    await user.click(screen.getByRole('radio', { name: t.filters.toRetest }))
    expect(screen.queryByRole('link', { name: 'Autre' })).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: t.markDone('5 ml de sirop en moins') }))
    await waitFor(() => {
      expect(api.tastingNotes.setNextStepDone).toHaveBeenCalledWith({ id: 'note-1', done: true })
    })
  })

  it('explains what to do when the journal is empty', async () => {
    renderRoutes([{ path: '/journal', element: <JournalPage /> }], '/journal')
    expect(await screen.findByText(t.empty.title)).toBeDefined()
  })
})
