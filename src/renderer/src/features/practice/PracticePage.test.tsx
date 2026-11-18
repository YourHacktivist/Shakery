import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { PracticeCorpusData } from '@shared/domain/workshop'
import { ok } from '@shared/ipc/result'
import { PracticePage } from './PracticePage'

const t = fr.workshop.practice

function recipe(id: string, glass: string): PracticeCorpusData['recipes'][number] {
  return {
    id,
    subjectType: 'recipe',
    name: id,
    lines: [{ id: `${id}-l`, label: 'Gin', doseText: null, quantity: 30, unit: 'ml' }],
    method: 'stir',
    methodLabel: null,
    glass,
    ice: null,
    garnish: null,
    steps: [],
    drinkLength: null,
    servingMoment: null,
    family: null,
    familyLabel: null,
    statedAbvPct: null,
  }
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.collections.list.mockResolvedValue(
    ok([
      {
        id: 'c1',
        name: 'Concours',
        description: null,
        kind: 'competition',
        updatedAt: 0,
        recipeIds: ['A', 'B', 'C', 'D'],
        sheetCount: 0,
      },
    ]),
  )
  api.practice.corpus.mockResolvedValue(
    ok({
      recipes: [recipe('A', 'Coupe'), recipe('B', 'Tumbler'), recipe('C', 'Highball'), recipe('D', 'Flûte')],
      sheets: [],
      rows: [],
    }),
  )
  api.practice.finish.mockImplementation((input) =>
    Promise.resolve(
      ok({
        id: 's1',
        collectionId: input.collectionId,
        collectionName: 'Concours',
        mode: input.mode,
        score: 0,
        total: input.answers.length,
        finishedAt: 0,
      }),
    ),
  )
})

describe('PracticePage', () => {
  it('runs a flash card session to the end and writes every answer', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/practice', element: <PracticePage /> }], '/practice')

    await user.click(await screen.findByRole('radio', { name: t.modes.flashcards }))
    await user.selectOptions(screen.getByLabelText(t.length), '10')
    const start = screen.getByRole('button', { name: t.start })
    await waitFor(() => {
      expect((start as HTMLButtonElement).disabled).toBe(false)
    })
    await user.click(start)

    for (let i = 0; i < 10; i += 1) {
      await user.click(await screen.findByRole('button', { name: t.reveal }))
      await user.click(screen.getByRole('button', { name: i % 2 === 0 ? t.knew : t.didNotKnow }))
    }
    expect(await screen.findByText(t.result.title)).toBeDefined()
    await waitFor(() => {
      expect(api.practice.finish).toHaveBeenCalledOnce()
    })
    const sent = api.practice.finish.mock.calls[0]?.[0]
    expect(sent?.answers).toHaveLength(10)
    expect(sent?.answers.filter((answer) => answer.isCorrect === false)).toHaveLength(5)
    expect(sent?.answers.every((answer) => answer.selfGraded)).toBe(true)
  })
})
