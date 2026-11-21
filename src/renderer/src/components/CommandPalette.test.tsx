import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette, type CommandPaletteGroup } from './CommandPalette'

function results(labels: string[], onSelect: (label: string) => void): CommandPaletteGroup[] {
  return [
    {
      id: 'recipes',
      heading: 'Fiches',
      preFiltered: true,
      items: labels.map((label) => ({
        id: `recipe:${label}`,
        label,
        onSelect: () => {
          onSelect(label)
        },
      })),
    },
  ]
}

describe('CommandPalette', () => {
  it('selects the first item again when new results arrive, so that Enter opens the exact name', async () => {
    const user = userEvent.setup()
    const opened = vi.fn()
    // The results of « negr » arrive first, then those of « negroni » with the exact name first.
    const view = render(
      <CommandPalette
        open
        onClose={() => undefined}
        groups={results(['Negroni and the Goat', 'Negroni'], opened)}
      />,
    )
    const selected = () =>
      screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true')
    expect(selected()?.textContent).toContain('Negroni and the Goat')
    view.rerender(
      <CommandPalette
        open
        onClose={() => undefined}
        groups={results(['Negroni', 'Negroni and the Goat'], opened)}
      />,
    )
    expect(selected()?.textContent).toBe('Negroni')
    await user.keyboard('{Enter}')
    expect(opened).toHaveBeenCalledWith('Negroni')
  })
})
