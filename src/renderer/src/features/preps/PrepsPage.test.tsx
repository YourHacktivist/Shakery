import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import type { PrepOverview } from '@shared/domain/workshop'
import { ok } from '@shared/ipc/result'
import { PrepsPage } from './PrepsPage'

const t = fr.workshop.preps
const DAY = 86_400_000

let api: FakeShakery

function syrup(extra: Partial<PrepOverview> = {}): PrepOverview {
  return {
    recipeId: 'syrup',
    name: 'Sirop simple',
    status: 'final',
    shelfLifeDays: 14,
    yieldMl: 800,
    storageNotes: null,
    batches: [],
    ...extra,
  }
}

beforeEach(() => {
  api = installShakery()
})

describe('PrepsPage', () => {
  it('shows a batch close to its date and records a new one with the yield filled in', async () => {
    const user = userEvent.setup()
    api.preps.list.mockResolvedValue(
      ok([
        syrup({
          batches: [
            {
              id: 'b1',
              recipeId: 'syrup',
              madeAt: Date.now() - 13 * DAY,
              quantityMl: 750,
              bestBefore: Date.now() + DAY / 2,
              status: 'active',
              notes: null,
            },
          ],
        }),
      ]),
    )
    api.batches.create.mockImplementation((input) =>
      Promise.resolve(
        ok({
          id: 'b2',
          recipeId: input.recipeId,
          madeAt: input.madeAt,
          quantityMl: input.quantityMl ?? null,
          bestBefore: null,
          status: 'active' as const,
          notes: null,
        }),
      ),
    )
    renderRoutes([{ path: '/preps', element: <PrepsPage /> }], '/preps')

    expect(await screen.findByRole('link', { name: 'Sirop simple' })).toBeDefined()
    expect(screen.getByText(t.shelfLife(14))).toBeDefined()

    await user.click(screen.getByRole('button', { name: t.newBatch }))
    const dialog = await screen.findByRole('dialog', { name: t.batch.title('Sirop simple') })
    expect(within(dialog).getByText(/À consommer avant le/)).toBeDefined()
    await user.click(within(dialog).getByRole('button', { name: t.batch.create }))
    await waitFor(() => {
      expect(api.batches.create).toHaveBeenCalledOnce()
    })
    expect(api.batches.create.mock.calls[0]?.[0]).toMatchObject({ recipeId: 'syrup', quantityMl: 800 })
  })

  it('explains how to start without any preparation', async () => {
    renderRoutes([{ path: '/preps', element: <PrepsPage /> }], '/preps')
    expect(await screen.findByText(t.empty.title)).toBeDefined()
  })
})
