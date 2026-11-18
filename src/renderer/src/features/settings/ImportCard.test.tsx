import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useToastStore } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import { fail, ok } from '@shared/ipc/result'
import { ImportCard } from './ImportCard'

const t = fr.settings.import

/** Testing Library reads no-break spaces as plain ones. */
const plain = (text: string) => text.replaceAll(String.fromCharCode(0xa0), ' ')

const PREVIEW = {
  token: 'token-1',
  label: 'maf-2025.shakery',
  tables: [
    { table: 'recipes', total: 36, added: 30, matched: 6, conflicts: 2 },
    { table: 'categories', total: 96, added: 0, matched: 96, conflicts: 0 },
    { table: 'knowledge_items', total: 900, added: 900, matched: 0, conflicts: 0 },
    { table: 'recipe_lines', total: 200, added: 200, matched: 0, conflicts: 0 },
  ],
}

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
})

afterEach(() => {
  useToastStore.getState().clear()
})

function renderCard() {
  return renderRoutes([{ path: '/', element: <ImportCard /> }], '/')
}

describe('ImportCard', () => {
  it('previews the file, hides known referentials and imports with the chosen strategy', async () => {
    const user = userEvent.setup()
    api.import.choose.mockResolvedValue(ok(PREVIEW))
    api.import.apply.mockResolvedValue(ok({ inserted: 1130, updated: 2, skipped: 0 }))
    renderCard()

    await user.click(screen.getByRole('button', { name: t.choose }))
    expect(await screen.findByText(plain(t.source('maf-2025.shakery')))).toBeDefined()
    const table = screen.getByRole('table')
    expect(within(table).getByText('Recettes')).toBeDefined()
    expect(within(table).getByText(t.otherTables)).toBeDefined()
    expect(within(table).queryByText(/cat/i)).toBeNull()
    expect(screen.getByText(t.conflicts(2))).toBeDefined()

    await user.click(screen.getByRole('radio', { name: t.strategies.replace }))
    await user.click(screen.getByRole('button', { name: t.apply }))
    await waitFor(() => {
      expect(api.import.apply).toHaveBeenCalledWith({ token: 'token-1', strategy: 'replace' })
    })
    expect(await screen.findByText(plain(t.done(1130, 2)))).toBeDefined()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('does nothing when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    api.import.choose.mockResolvedValue(ok(null))
    renderCard()
    await user.click(screen.getByRole('button', { name: t.choose }))
    await waitFor(() => {
      expect(api.import.choose).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('says when the file is not a valid notebook', async () => {
    const user = userEvent.setup()
    api.import.choose.mockResolvedValue(fail('INVALID_INPUT', 'bad archive'))
    renderCard()
    await user.click(screen.getByRole('button', { name: t.choose }))
    expect(await screen.findByText(t.invalid)).toBeDefined()
  })

  it('asks to choose again when the preview expired', async () => {
    const user = userEvent.setup()
    api.import.choose.mockResolvedValue(ok(PREVIEW))
    api.import.apply.mockResolvedValue(fail('NOT_FOUND', 'expired'))
    renderCard()
    await user.click(screen.getByRole('button', { name: t.choose }))
    await user.click(await screen.findByRole('button', { name: t.apply }))
    expect(await screen.findByText(t.expired)).toBeDefined()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
