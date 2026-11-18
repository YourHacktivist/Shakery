import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import {
  ingredient,
  installShakery,
  recipeDetail,
  renderRoutes,
  type FakeShakery,
} from '@renderer/test/shakery'
import { ok } from '@shared/ipc/result'
import { QuickIdeaDialog } from './QuickIdeaDialog'

const t = fr.shell.quickIdea

let api: FakeShakery

beforeEach(() => {
  api = installShakery()
  api.ingredients.list.mockResolvedValue(
    ok([ingredient('lime', 'Citron vert', { aliases: ['Lime'] }), ingredient('gin', 'Gin')]),
  )
  api.recipes.quickIdea.mockImplementation((input) =>
    Promise.resolve(ok(recipeDetail({ id: 'idea-1', name: input.name, status: 'idea' }))),
  )
})

afterEach(() => {
  useToastStore.getState().clear()
})

function renderDialog(onClose = vi.fn()) {
  renderRoutes([{ path: '/', element: <QuickIdeaDialog open onClose={onClose} /> }], '/')
  return onClose
}

describe('QuickIdeaDialog', () => {
  it('creates an idea with a name, ingredients and a note, then closes', async () => {
    const user = userEvent.setup()
    const onClose = renderDialog()
    const name = screen.getByRole('textbox', { name: t.name })
    await waitFor(() => {
      expect(document.activeElement).toBe(name)
    })
    await user.type(name, 'Highball yuzu')

    const ingredients = screen.getByRole('combobox', { name: t.ingredients })
    await user.click(ingredients)
    await user.type(ingredients, 'cit')
    // A known ingredient is suggested; the arrows pick it, Enter adds it.
    await screen.findByRole('option', { name: 'Citron vert' })
    await user.keyboard('{ArrowDown}{Enter}')
    // An unknown one is added as typed, with a comma.
    await user.type(ingredients, 'Yuzu,')
    const chips = screen.getByRole('list', { name: t.ingredients })
    expect(chips.textContent).toContain('Citron vert')
    expect(chips.textContent).toContain('Yuzu')

    await user.type(screen.getByRole('textbox', { name: t.note }), 'Tester avec du shiso{Enter}')

    await waitFor(() => {
      expect(api.recipes.quickIdea).toHaveBeenCalledWith({
        name: 'Highball yuzu',
        ingredients: ['Citron vert', 'Yuzu'],
        note: 'Tester avec du shiso',
      })
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    expect(useToastStore.getState().toasts[0]?.message).toBe(t.created('Highball yuzu'))
  })

  it('needs only a name: Enter in the name field creates the idea', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByRole('textbox', { name: t.name }), 'Sour rhubarbe{Enter}')
    await waitFor(() => {
      expect(api.recipes.quickIdea).toHaveBeenCalledWith({
        name: 'Sour rhubarbe',
        ingredients: [],
        note: null,
      })
    })
  })

  it('keeps an ingredient still being typed and removes a chip with its button', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByRole('textbox', { name: t.name }), 'Essai')
    const ingredients = screen.getByRole('combobox', { name: t.ingredients })
    await user.type(ingredients, 'Gin{Enter}Shiso')
    await user.click(screen.getByRole('button', { name: t.remove('Gin') }))
    await user.click(screen.getByRole('button', { name: new RegExp(t.create) }))
    await waitFor(() => {
      expect(api.recipes.quickIdea).toHaveBeenCalledWith({
        name: 'Essai',
        ingredients: ['Shiso'],
        note: null,
      })
    })
  })

  it('refuses an idea without a name and says so', async () => {
    const user = userEvent.setup()
    const onClose = renderDialog()
    await user.type(screen.getByRole('textbox', { name: t.name }), '   {Enter}')
    expect(await screen.findByText(t.nameRequired)).toBeDefined()
    expect(api.recipes.quickIdea).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
