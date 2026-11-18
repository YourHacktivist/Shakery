import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FilterPill } from './FilterPill'

type Sort = 'activity' | 'name' | 'rating'
type Family = 'sour' | 'highball' | 'spirit'

const SORTS = [
  { value: 'activity', label: 'Dernière activité' },
  { value: 'name', label: 'Nom' },
  { value: 'rating', label: 'Note' },
] as const

const FAMILIES = [
  { value: 'sour', label: 'Sour' },
  { value: 'highball', label: 'Highball' },
  { value: 'spirit', label: 'Spirit-forward' },
] as const

function SortHarness({ onValue }: { onValue?: (value: Sort) => void }) {
  const [sort, setSort] = useState<Sort>('activity')
  return (
    <FilterPill
      label="Tri"
      options={SORTS}
      value={sort}
      onChange={(next) => {
        setSort(next)
        onValue?.(next)
      }}
    />
  )
}

function FamilyHarness({ initial = [] }: { initial?: Family[] }) {
  const [families, setFamilies] = useState<Family[]>(initial)
  return (
    <FilterPill
      multiple
      label="Famille"
      allLabel="Toutes familles"
      options={FAMILIES}
      value={families}
      onChange={setFamilies}
    />
  )
}

describe('FilterPill', () => {
  it('shows the current choice and names the filter for screen readers', () => {
    render(<SortHarness />)
    const pill = screen.getByRole('button', { name: /^Tri\s: Dernière activité$/ })
    expect(pill.textContent).toBe('Dernière activité')
    expect(pill.getAttribute('aria-haspopup')).toBe('menu')
    expect(pill.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens with the keyboard and picks a single choice', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<SortHarness onValue={onValue} />)
    await user.tab()
    await user.keyboard('{Enter}')
    const current = screen.getByRole('menuitemradio', { name: 'Dernière activité' })
    expect(current.getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByRole('menuitemradio', { name: 'Note' }))
    expect(onValue).toHaveBeenCalledWith('rating')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button').textContent).toBe('Note')
  })

  it('shows the « all » text when nothing is selected in a multiple filter', () => {
    render(<FamilyHarness />)
    expect(screen.getByRole('button').textContent).toBe('Toutes familles')
  })

  it('keeps the menu open while several choices are ticked', async () => {
    const user = userEvent.setup()
    render(<FamilyHarness />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Highball' }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Sour' }))
    expect(screen.getByRole('menu')).toBeDefined()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Sour' }).getAttribute('aria-checked')).toBe('true')
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Toutes familles' }).getAttribute('aria-checked'),
    ).toBe('false')
    // Options keep their own order, whatever the order of the clicks.
    expect(screen.getByRole('button', { name: /^Famille\s: Sour \+1$/ })).toBeDefined()
  })

  it('unticks a choice and clears every choice with the « all » item', async () => {
    const user = userEvent.setup()
    render(<FamilyHarness initial={['sour', 'spirit']} />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Sour' }))
    expect(screen.getAllByRole('button')[0]?.textContent).toBe('Spirit-forward')
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Toutes familles' }))
    expect(screen.getByRole('button').textContent).toBe('Toutes familles')
  })
})
