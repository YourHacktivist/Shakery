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
import type { IngredientSummary } from '@shared/domain/catalog'
import { fail, ok } from '@shared/ipc/result'
import { RecipeEditorPage } from './RecipeEditorPage'

const t = fr.recipes
const tl = t.editor.lines

let api: FakeShakery
let known: IngredientSummary[]

beforeEach(() => {
  api = installShakery()
  known = [
    ingredient('gin', 'Gin'),
    ingredient('campari', 'Campari'),
    ingredient('vermouth', 'Vermouth rouge'),
  ]
  api.ingredients.list.mockImplementation(() => Promise.resolve(ok([...known])))
  api.reference.listCategories.mockResolvedValue(
    ok([
      { id: 'cat-root', name: 'Sirops', slug: 'sirops', parentId: null, sortOrder: 0, batchHint: 'ok' },
      {
        id: 'cat-leaf',
        name: 'Sirops maison',
        slug: 'sirops-maison',
        parentId: 'cat-root',
        sortOrder: 0,
        batchHint: 'ok',
      },
    ]),
  )
  api.recipes.compute.mockResolvedValue(ok(computation()))
  api.recipes.create.mockImplementation(({ data }) =>
    Promise.resolve(ok(recipeDetail({ id: 'new-1', name: data.name }))),
  )
})

afterEach(() => {
  useToastStore.getState().clear()
})

function renderEditor() {
  return renderRoutes(
    [
      { path: '/recipes/new', element: <RecipeEditorPage /> },
      { path: '/recipes/:id', element: <p>detail</p> },
    ],
    '/recipes/new',
  )
}

function lineField(position: number) {
  return screen.getByRole<HTMLInputElement>('combobox', { name: tl.ingredient(position) })
}

async function chooseIngredient(
  user: ReturnType<typeof userEvent.setup>,
  position: number,
  text: string,
  option: RegExp,
) {
  await user.type(lineField(position), text)
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('RecipeEditorPage', () => {
  it('adds lines, picks ingredients with typos, and reorders them with the buttons and Alt+arrows', async () => {
    const user = userEvent.setup()
    renderEditor()
    await screen.findByRole('heading', { name: t.editor.newTitle })

    await user.click(screen.getByRole('button', { name: tl.add }))
    await chooseIngredient(user, 1, 'gin', /^Gin/)
    await user.click(screen.getByRole('button', { name: tl.add }))
    // « campri » has a typo: the tolerant search still finds Campari.
    await chooseIngredient(user, 2, 'campri', /^Campari/)
    expect([lineField(1).value, lineField(2).value]).toEqual(['Gin', 'Campari'])

    await user.click(screen.getByRole('button', { name: tl.moveDown(1) }))
    expect([lineField(1).value, lineField(2).value]).toEqual(['Campari', 'Gin'])
    expect(screen.getByText(tl.moved('Gin', 2, 2))).toBeDefined()

    // Alt and the up arrow from the dose field of line 2 moves it back up.
    await user.click(screen.getByRole('spinbutton', { name: tl.quantity(2) }))
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect([lineField(1).value, lineField(2).value]).toEqual(['Gin', 'Campari'])
  })

  it('saves the lines in their order with their doses', async () => {
    const user = userEvent.setup()
    const { router } = renderEditor()
    await user.type(await screen.findByRole('textbox', { name: t.editor.fields.name }), 'Negroni')
    await user.click(screen.getByRole('button', { name: tl.add }))
    await chooseIngredient(user, 1, 'verm', /^Vermouth rouge/)
    await user.type(screen.getByRole('spinbutton', { name: tl.quantity(1) }), '30')
    await user.click(screen.getByRole('button', { name: tl.add }))
    await chooseIngredient(user, 2, 'gin', /^Gin/)
    await user.click(screen.getByRole('button', { name: tl.moveUp(2) }))

    await user.click(screen.getByRole('button', { name: t.editor.save }))
    await waitFor(() => {
      expect(api.recipes.create).toHaveBeenCalled()
    })
    const call = api.recipes.create.mock.calls[0]?.[0]
    expect(call?.data.name).toBe('Negroni')
    expect(call?.data.lines?.map((line) => [line.ingredientId, line.quantity])).toEqual([
      ['gin', null],
      ['vermouth', 30],
    ])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes/new-1')
    })
  })

  it('creates a missing ingredient in a chosen category and puts it on the line', async () => {
    const user = userEvent.setup()
    api.ingredients.create.mockImplementation((input) => {
      const created = ingredient('syrup', input.name, { categoryId: input.categoryId })
      known.push(created)
      return Promise.resolve(ok(created))
    })
    renderEditor()
    await user.click(await screen.findByRole('button', { name: tl.add }))
    await user.type(lineField(1), 'Sirop de rhubarbe')
    await user.click(
      await screen.findByRole('option', { name: fr.components.forms.combobox.create('Sirop de rhubarbe') }),
    )

    const dialog = await screen.findByRole('dialog', { name: t.ingredientDialog.title })
    expect(
      within(dialog).getByRole<HTMLInputElement>('textbox', { name: t.ingredientDialog.name }).value,
    ).toBe('Sirop de rhubarbe')
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: t.ingredientDialog.category }),
      'cat-leaf',
    )
    await user.click(screen.getByRole('button', { name: t.ingredientDialog.create }))

    await waitFor(() => {
      expect(api.ingredients.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Sirop de rhubarbe', categoryId: 'cat-leaf' }),
      )
    })
    await waitFor(() => {
      expect(lineField(1).value).toBe('Sirop de rhubarbe')
    })
  })

  it('says when the new ingredient already exists in that category', async () => {
    const user = userEvent.setup()
    api.ingredients.create.mockResolvedValue(fail('CONFLICT', 'duplicate'))
    renderEditor()
    await user.click(await screen.findByRole('button', { name: tl.add }))
    await user.type(lineField(1), 'Orgeat')
    await user.click(
      await screen.findByRole('option', { name: fr.components.forms.combobox.create('Orgeat') }),
    )
    const dialog = await screen.findByRole('dialog', { name: t.ingredientDialog.title })
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: t.ingredientDialog.category }),
      'cat-leaf',
    )
    await user.click(screen.getByRole('button', { name: t.ingredientDialog.create }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(t.ingredientDialog.conflict)
  })

  it('asks for a category before creating an ingredient', async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole('button', { name: tl.add }))
    await user.type(lineField(1), 'Orgeat')
    await user.click(
      await screen.findByRole('option', { name: fr.components.forms.combobox.create('Orgeat') }),
    )
    const dialog = await screen.findByRole('dialog', { name: t.ingredientDialog.title })
    await user.click(screen.getByRole('button', { name: t.ingredientDialog.create }))
    expect(await within(dialog).findByText(t.form.categoryRequired)).toBeDefined()
    expect(api.ingredients.create).not.toHaveBeenCalled()
  })
})
