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

function filledNotebook() {
  api.recipes.list.mockResolvedValue(
    ok([
      summary('fume', 'Negroni fumé', { updatedAt: 5_000 }),
      summary('sour', 'Sour rhubarbe', { status: 'draft', family: null, version: 1, updatedAt: 4_000 }),
      summary('classic', 'Daiquiri', { status: 'final' }),
    ]),
  )
  api.tastingNotes.list.mockResolvedValue(
    ok([
      note('n1', 'fume', 1, 3),
      note('n2', 'fume', 2, 4, { recipeName: 'Negroni fumé', nextStep: 'Baisser le Campari de 5 ml' }),
      note('n3', 'fume', 2, 5),
    ]),
  )
  api.recipes.get.mockResolvedValue(
    ok(recipeDetail({ id: 'fume', name: 'Negroni fumé', status: 'testing', version: 2 })),
  )
  api.recipes.getVersion.mockResolvedValue(ok(recipeDetail({ id: 'fume', name: 'Negroni fumé', version: 1 })))
}

describe('HomePage', () => {
  it('lists the creations in progress in rows, without the finished ones', async () => {
    filledNotebook()
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    expect(await screen.findByText(t.count(2))).toBeDefined()
    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeDefined()
    const table = screen.getByRole('table', { name: t.inProgress.label })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    const [first, second] = rows as [HTMLElement, HTMLElement]
    expect(within(first).getByRole('link', { name: 'Negroni fumé' }).getAttribute('href')).toBe(
      '/recipes/fume',
    )
    // The mean of the last tasted version, and its version from v2 on.
    await waitFor(() => {
      expect(first.textContent).toContain('4,5')
    })
    expect(within(first).getByText(fr.components.display.versionLong(2))).toBeDefined()
    // No family, no rating yet: the drawn line, read by a screen reader.
    expect(within(second).getAllByText(fr.components.display.stat.empty)).toHaveLength(2)
    expect(screen.queryByText('Daiquiri')).toBeNull()
  })

  it('puts the creation in test in focus, and says which indicators are still unknown', async () => {
    filledNotebook()
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    const focus = await screen.findByRole('region', { name: t.focus.title })
    expect(within(focus).getByRole('heading', { level: 3, name: 'Negroni fumé' })).toBeDefined()
    expect(within(focus).getByText(fr.components.display.status.testing)).toBeDefined()
    const { abv, sugar, acid } = t.focus.unknown
    expect(await within(focus).findByText(t.focus.missing([abv, sugar, acid]))).toBeDefined()
    // No gauge while no indicator is known.
    expect(within(focus).queryByRole('img')).toBeNull()
    expect(within(focus).getByRole('button', { name: t.focus.taste })).toBeDefined()
  })

  it('draws a gauge for a known indicator only', async () => {
    filledNotebook()
    api.recipes.compute.mockResolvedValue(
      ok(computation({ abv: { value: 23.5, status: 'complete', issues: [] } })),
    )
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    const focus = await screen.findByRole('region', { name: t.focus.title })
    const { sugar, acid } = t.focus.unknown
    expect(await within(focus).findByText(t.focus.missing([sugar, acid]))).toBeDefined()
    expect(within(focus).getByText(t.focus.abv)).toBeDefined()
    expect(within(focus).getAllByRole('img')).toHaveLength(1)
  })

  it('lists the next steps to test, each with its way back to the lab', async () => {
    filledNotebook()
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    const retest = await screen.findByRole('region', { name: t.retest.title })
    expect(await within(retest).findByText('Baisser le Campari de 5 ml')).toBeDefined()
    expect(within(retest).getByText(t.retest.from(2))).toBeDefined()
    expect(within(retest).getByRole('button', { name: t.retest.actionLabel('Negroni fumé') })).toBeDefined()
    expect(within(retest).getByRole('link', { name: t.retest.journal })).toBeDefined()
  })

  it('stays an inviting home without any creation, with a single solid button', async () => {
    renderRoutes([{ path: '/', element: <HomePage /> }], '/')

    expect(await screen.findByText(t.empty.title)).toBeDefined()
    expect(screen.getByText(t.count(0))).toBeDefined()
    expect(screen.getByRole('button', { name: new RegExp(`^${t.empty.firstIdea}`) })).toBeDefined()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(t.retest.empty)).toBeDefined()
    expect(screen.getByText(t.preps.empty)).toBeDefined()
    expect(await screen.findByText(t.tonight.empty)).toBeDefined()
    expect(screen.getByRole('link', { name: t.hero.fromClassic })).toBeDefined()
    const solid = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('bg-accent-gradient'))
    expect(solid.map((button) => button.textContent)).toEqual([t.hero.openLab])
  })
})
