import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import {
  computation,
  installShakery,
  recipeDetail,
  renderRoutes,
  type FakeShakery,
} from '@renderer/test/shakery'
import type { RecipeSummary } from '@shared/domain/catalog'
import type { TastingNote } from '@shared/domain/journal'
import { ok } from '@shared/ipc/result'
import { HomePage } from './HomePage'

const t = fr.home
const plain = (text: string) => text.replaceAll(String.fromCharCode(0xa0), ' ')

function summary(id: string, name: string, extra: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    id,
    name,
    kind: 'cocktail',
    status: 'testing',
    origin: 'mine',
    family: 'spirit_forward',
    method: 'stir',
    version: 2,
    isFavorite: false,
    updatedAt: 1_000,
    missingIngredientIds: [],
    ...extra,
  }
}

function note(
  id: string,
  recipeId: string,
  version: number,
  overall: number,
  extra: Partial<TastingNote> = {},
): TastingNote {
  return {
    id,
    recipeId,
    recipeName: recipeId,
    recipeVersion: version,
    tastedAt: 2_000 + version,
    overall,
    scores: {},
    comment: null,
    nextStep: null,
    nextStepDone: false,
    context: null,
    photoPath: null,
    ...extra,
  }
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.recipes.referenceZones.mockResolvedValue(ok({}))
  api.recipes.compute.mockResolvedValue(ok(computation()))
})

describe('HomePage', () => {
  it('shows the creations in progress with their last rating, and the one in focus with its next step', async () => {
    api.recipes.list.mockResolvedValue(
      ok([
        summary('fume', 'Negroni fumé', { updatedAt: 5_000 }),
        summary('sour', 'Sour rhubarbe', { status: 'draft', family: 'sour', updatedAt: 4_000 }),
        summary('classic', 'Daiquiri', { status: 'final' }),
      ]),
    )
    api.tastingNotes.list.mockResolvedValue(
      ok([
        note('n1', 'fume', 1, 3),
        note('n2', 'fume', 2, 4, { nextStep: 'Baisser le Campari de 5 ml' }),
        note('n3', 'fume', 2, 5),
      ]),
    )
    api.recipes.get.mockResolvedValue(
      ok(recipeDetail({ id: 'fume', name: 'Negroni fumé', status: 'testing', version: 2 })),
    )
    api.recipes.getVersion.mockResolvedValue(
      ok(recipeDetail({ id: 'fume', name: 'Negroni fumé', version: 1 })),
    )
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    expect(await screen.findByText(t.count(2))).toBeDefined()
    const card = screen.getAllByRole('article')[0] as HTMLElement
    expect(within(card).getByRole('heading', { name: 'Negroni fumé' })).toBeDefined()
    // The large figure, and the last point of the curve.
    expect(within(card).getAllByText('4,5').length).toBeGreaterThanOrEqual(1)
    expect(plain(within(card).getByText(/vs v1/).textContent)).toContain('1,5 vs v1')
    expect(screen.queryByText('Daiquiri')).toBeNull()

    // The card and the focus panel.
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Negroni fumé', level: 2 })).toHaveLength(2)
    })
    expect(screen.getByText('Baisser le Campari de 5 ml')).toBeDefined()
  })

  it('stays an inviting empty home without any creation', async () => {
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')
    expect(await screen.findByText(t.empty.title)).toBeDefined()
    expect(screen.getByText(t.focus.empty)).toBeDefined()
  })
})
