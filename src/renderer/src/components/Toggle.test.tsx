import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Toggle } from './Toggle'

function Harness({ hideLabel, showState }: { hideLabel?: boolean; showState?: boolean }) {
  const [checked, setChecked] = useState(true)
  return (
    <Toggle
      label="Ligne active"
      checked={checked}
      onCheckedChange={setChecked}
      hideLabel={hideLabel}
      showState={showState}
    />
  )
}

describe('Toggle', () => {
  it('is a switch named by its label that flips on click', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: 'Ligne active' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('flips with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    const toggle = screen.getByRole('switch')
    expect(document.activeElement).toBe(toggle)
    await user.keyboard(' ')
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    await user.keyboard('{Enter}')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('flips when the visible label is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('Ligne active'))
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
  })

  it('keeps an accessible name when the label is hidden', () => {
    render(<Harness hideLabel />)
    expect(screen.getByRole('switch', { name: 'Ligne active' })).toBeDefined()
    expect(screen.queryByText('Ligne active')).toBeNull()
  })

  it('writes the state in words when asked', async () => {
    const user = userEvent.setup()
    render(<Harness showState />)
    expect(screen.getByText('Activé')).toBeDefined()
    await user.click(screen.getByRole('switch'))
    expect(screen.getByText('Désactivé')).toBeDefined()
  })

  it('does nothing when disabled', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Toggle label="Ligne active" checked={false} onCheckedChange={onCheckedChange} disabled />)
    await user.click(screen.getByRole('switch'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
