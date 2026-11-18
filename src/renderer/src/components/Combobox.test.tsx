import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { normalizeName } from '@core/normalize'
import { fr } from '@renderer/i18n/fr'
import { Combobox, filterOptions, type ComboboxOption } from './Combobox'

const OPTIONS: ComboboxOption[] = [
  { id: 'a', label: 'Crème de cassis', hint: 'Liqueur' },
  { id: 'b', label: 'Citron vert', hint: 'Agrume' },
  { id: 'c', label: 'Sirop de citron' },
  { id: 'd', label: 'Cointreau' },
]

function Harness({
  onSelect,
  onCreate,
  initial = null,
}: {
  onSelect?: (id: string) => void
  onCreate?: (label: string) => void
  initial?: string | null
}) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <Combobox
      label="Ingrédient"
      placeholder="Cherche un ingrédient"
      options={OPTIONS}
      value={value}
      onSelect={(id) => {
        setValue(id)
        onSelect?.(id)
      }}
      onCreate={onCreate}
    />
  )
}

function field() {
  return screen.getByRole<HTMLInputElement>('combobox', { name: 'Ingrédient' })
}

function optionNames() {
  return screen.queryAllByRole('option').map((option) => option.textContent)
}

describe('filterOptions', () => {
  const indexed = OPTIONS.map((option) => {
    const normalized = normalizeName(option.label)
    return { ...option, normalized, words: normalized.split(' ') }
  })

  it('ignores accents and case', () => {
    expect(filterOptions(indexed, 'CREME').map((option) => option.id)).toEqual(['a'])
  })

  it('needs every typed word, in any order', () => {
    expect(filterOptions(indexed, 'vert cit').map((option) => option.id)).toEqual(['b'])
  })

  it('lists labels starting with the query first', () => {
    expect(filterOptions(indexed, 'citron').map((option) => option.id)).toEqual(['b', 'c'])
    expect(filterOptions(indexed, 'co').map((option) => option.id)).toEqual(['d'])
  })

  it('tolerates a typo when nothing matches exactly', () => {
    expect(filterOptions(indexed, 'cointrau').map((option) => option.id)).toEqual(['d'])
    expect(filterOptions(indexed, 'cassys').map((option) => option.id)).toEqual(['a'])
  })

  it('returns every option for an empty query', () => {
    expect(filterOptions(indexed, '  ')).toHaveLength(4)
  })
})

describe('Combobox', () => {
  it('is a collapsed combobox until the user types', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(field().getAttribute('aria-expanded')).toBe('false')
    await user.type(field(), 'cit')
    expect(field().getAttribute('aria-expanded')).toBe('true')
    expect(optionNames()).toEqual(['Citron vertAgrume', 'Sirop de citron'])
  })

  it('selects the highlighted option with Enter', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await user.type(field(), 'citron')
    const first = screen.getByRole('option', { name: /Citron vert/ })
    expect(field().getAttribute('aria-activedescendant')).toBe(first.id)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('c')
    expect(field().value).toBe('Sirop de citron')
    expect(field().getAttribute('aria-expanded')).toBe('false')
  })

  it('selects an option on click', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await user.click(field())
    await user.click(screen.getByRole('option', { name: /Cointreau/ }))
    expect(onSelect).toHaveBeenCalledWith('d')
    expect(field().value).toBe('Cointreau')
  })

  it('opens with the down arrow on the selected option', async () => {
    const user = userEvent.setup()
    render(<Harness initial="b" />)
    expect(field().value).toBe('Citron vert')
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const selected = screen.getByRole('option', { name: /Citron vert/ })
    await waitFor(() => {
      expect(field().getAttribute('aria-activedescendant')).toBe(selected.id)
    })
    expect(selected.getAttribute('aria-selected')).toBe('true')
  })

  it('offers to create an entry that matches nothing exactly', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<Harness onCreate={onCreate} />)
    await user.type(field(), 'Sirop de rhubarbe')
    expect(optionNames()).toEqual([fr.components.forms.combobox.create('Sirop de rhubarbe')])
    await user.keyboard('{Enter}')
    expect(onCreate).toHaveBeenCalledWith('Sirop de rhubarbe')
  })

  it('does not offer to create an entry that exists, accents and case aside', async () => {
    const user = userEvent.setup()
    render(<Harness onCreate={vi.fn()} />)
    await user.type(field(), 'creme DE cassis')
    expect(screen.queryByRole('option', { name: /Créer/ })).toBeNull()
    expect(screen.getByRole('option', { name: /Crème de cassis/ })).toBeDefined()
  })

  it('says when nothing matches and creation is not offered', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(field(), 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('Aucun résultat.')).toBeDefined()
  })

  it('closes with Escape, then gives back the selected option', async () => {
    const user = userEvent.setup()
    render(<Harness initial="d" />)
    await user.clear(field())
    await user.type(field(), 'cit')
    expect(field().getAttribute('aria-expanded')).toBe('true')
    await user.keyboard('{Escape}')
    expect(field().getAttribute('aria-expanded')).toBe('false')
    await user.keyboard('{Escape}')
    expect(field().value).toBe('Cointreau')
  })

  it('gives back the selected option when the focus leaves', async () => {
    const user = userEvent.setup()
    render(<Harness initial="d" />)
    await user.clear(field())
    await user.type(field(), 'xyz')
    await user.tab()
    expect(field().value).toBe('Cointreau')
    expect(field().getAttribute('aria-expanded')).toBe('false')
  })
})
