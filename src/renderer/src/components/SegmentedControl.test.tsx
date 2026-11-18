import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

type View = 'current' | 'favorites' | 'classics'

const OPTIONS = [
  { value: 'current', label: 'En cours' },
  { value: 'favorites', label: 'Favoris' },
  { value: 'classics', label: 'Classiques' },
] as const

function Harness({ disabled }: { disabled?: boolean }) {
  const [view, setView] = useState<View>('current')
  return (
    <SegmentedControl
      label="Affichage"
      options={OPTIONS}
      value={view}
      onChange={setView}
      disabled={disabled}
    />
  )
}

function radio(name: string) {
  return screen.getByRole('radio', { name })
}

describe('SegmentedControl', () => {
  it('is a named radio group with the current choice checked', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'Affichage' })).toBeDefined()
    expect(radio('En cours').getAttribute('aria-checked')).toBe('true')
    expect(radio('Favoris').getAttribute('aria-checked')).toBe('false')
  })

  it('puts only the checked choice in the tab order', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(radio('En cours').tabIndex).toBe(0)
    expect(radio('Favoris').tabIndex).toBe(-1)
    await user.tab()
    expect(document.activeElement).toBe(radio('En cours'))
    await user.tab()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves and selects with the left and right arrows, wrapping around', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(radio('Favoris').getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(radio('Favoris'))
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(radio('En cours').getAttribute('aria-checked')).toBe('true')
    await user.keyboard('{ArrowLeft}')
    expect(radio('Classiques').getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(radio('Classiques'))
  })

  it('jumps to the first and last choices with Home and End', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{End}')
    expect(radio('Classiques').getAttribute('aria-checked')).toBe('true')
    await user.keyboard('{Home}')
    expect(radio('En cours').getAttribute('aria-checked')).toBe('true')
  })

  it('selects on click', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(radio('Favoris'))
    expect(radio('Favoris').getAttribute('aria-checked')).toBe('true')
    expect(radio('En cours').getAttribute('aria-checked')).toBe('false')
  })

  it('ignores clicks and arrows when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness disabled />)
    await user.click(radio('Favoris'))
    expect(radio('En cours').getAttribute('aria-checked')).toBe('true')
  })
})
