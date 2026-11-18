import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('ties the visible label to the field', async () => {
    const user = userEvent.setup()
    render(<Input label="Nom de la fiche" />)
    const input = screen.getByLabelText<HTMLInputElement>('Nom de la fiche')
    await user.type(input, 'Negroni')
    expect(input.value).toBe('Negroni')
  })

  it('keeps a hidden label as the accessible name', () => {
    render(<Input label="Nom de la fiche" hideLabel />)
    expect(screen.getByRole('textbox', { name: 'Nom de la fiche' })).toBeDefined()
  })

  it('describes the field with its description and error, and marks it invalid', () => {
    render(<Input label="Nom" description="Le nom de la carte." error="Le nom est obligatoire." />)
    const input = screen.getByRole('textbox', { name: 'Nom' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby')?.split(' ') ?? []
    const texts = describedBy.map((id) => document.getElementById(id)?.textContent)
    expect(texts).toEqual(['Le nom de la carte.', 'Le nom est obligatoire.'])
  })

  it('keeps the aria-describedby given by the caller', () => {
    render(
      <>
        <p id="hint">Aide</p>
        <Input label="Nom" aria-describedby="hint" description="Détail" />
      </>,
    )
    const ids = screen.getByRole('textbox', { name: 'Nom' }).getAttribute('aria-describedby')
    expect(ids?.startsWith('hint ')).toBe(true)
  })

  it('is not invalid without an error', () => {
    render(<Input label="Nom" />)
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBeNull()
  })

  it('renders the search variant as a search box with its shortcut hint', () => {
    render(
      <Input label="Rechercher" hideLabel variant="search" shortcut="Ctrl K" aria-keyshortcuts="Control+K" />,
    )
    const search = screen.getByRole('searchbox', { name: 'Rechercher' })
    expect(search.getAttribute('aria-keyshortcuts')).toBe('Control+K')
    expect(screen.getByText('Ctrl K').tagName).toBe('KBD')
  })

  it('focuses the input when the frame is clicked', () => {
    render(<Input label="Rechercher" variant="search" />)
    const input = screen.getByRole('searchbox')
    const frame = input.parentElement
    if (!frame) throw new Error('missing frame')
    fireEvent.mouseDown(frame)
    expect(document.activeElement).toBe(input)
  })

  it('cannot be edited when disabled', async () => {
    const user = userEvent.setup()
    render(<Input label="Nom" disabled defaultValue="Sour" />)
    const input = screen.getByRole<HTMLInputElement>('textbox')
    await user.type(input, 'x')
    expect(input.disabled).toBe(true)
    expect(input.value).toBe('Sour')
  })

  it('passes the ref to the input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input label="Nom" ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('textbox'))
  })
})
