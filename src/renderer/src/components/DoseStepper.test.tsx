import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DoseStepper } from './DoseStepper'

type HarnessProps = {
  initial: number | null
  onValue?: (value: number | null) => void
  step?: number
  max?: number
  disabled?: boolean
}

function Harness({ initial, onValue, ...rest }: HarnessProps) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <DoseStepper
        label="Dose de Campari"
        unit="ml"
        value={value}
        onChange={(next) => {
          setValue(next)
          onValue?.(next)
        }}
        {...rest}
      />
      <output data-testid="value">{value === null ? 'null' : String(value)}</output>
    </>
  )
}

function field() {
  return screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Dose de Campari' })
}

function minus() {
  return screen.getByRole<HTMLButtonElement>('button', { name: /^Retirer 2,5\sml$/ })
}

function plus() {
  return screen.getByRole<HTMLButtonElement>('button', { name: /^Ajouter 2,5\sml$/ })
}

function stored() {
  return screen.getByTestId('value').textContent
}

describe('DoseStepper', () => {
  it('shows the dose with one decimal so that doses line up', () => {
    render(<Harness initial={30} />)
    expect(field().value).toBe('30,0')
  })

  it('adds and removes one step of 2,5 with the buttons', async () => {
    const user = userEvent.setup()
    render(<Harness initial={20} />)
    await user.click(plus())
    expect(stored()).toBe('22.5')
    expect(field().value).toBe('22,5')
    await user.click(minus())
    await user.click(minus())
    expect(stored()).toBe('17.5')
  })

  it('keeps the buttons out of the tab order, the arrows do the same job', async () => {
    const user = userEvent.setup()
    render(<Harness initial={10} />)
    expect(plus().tabIndex).toBe(-1)
    expect(minus().tabIndex).toBe(-1)
    await user.tab()
    expect(document.activeElement).toBe(field())
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(stored()).toBe('15')
    await user.keyboard('{ArrowDown}')
    expect(stored()).toBe('12.5')
  })

  it('uses the given step', async () => {
    const user = userEvent.setup()
    render(<Harness initial={10} step={5} />)
    await user.click(screen.getByRole('button', { name: /^Ajouter 5\sml$/ }))
    expect(stored()).toBe('15')
  })

  it('never goes below zero', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn<(value: number | null) => void>()
    render(<Harness initial={2.5} onValue={onValue} />)
    await user.click(minus())
    expect(stored()).toBe('0')
    expect(minus().disabled).toBe(true)
    await user.click(field())
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.clear(field())
    await user.type(field(), '-5')
    await user.tab()
    for (const [value] of onValue.mock.calls) {
      expect(value === null || value >= 0).toBe(true)
    }
    expect(field().value).toBe('0,0')
  })

  it('stops at the maximum', async () => {
    const user = userEvent.setup()
    render(<Harness initial={95} max={100} />)
    await user.click(plus())
    await user.click(plus())
    expect(stored()).toBe('100')
    expect(plus().disabled).toBe(true)
  })

  it('starts from zero when the line has no dose yet', async () => {
    const user = userEvent.setup()
    render(<Harness initial={null} />)
    expect(field().value).toBe('')
    expect(minus().disabled).toBe(true)
    await user.click(plus())
    expect(stored()).toBe('2.5')
  })

  it('accepts a dose typed directly', async () => {
    const user = userEvent.setup()
    render(<Harness initial={20} />)
    await user.clear(field())
    await user.type(field(), '22,5')
    await user.tab()
    expect(stored()).toBe('22.5')
    expect(field().value).toBe('22,5')
  })

  it('follows the wheel only while the field has the focus', () => {
    render(<Harness initial={20} />)
    fireEvent.wheel(field(), { deltaY: -100 })
    expect(stored()).toBe('20')
    act(() => {
      field().focus()
    })
    fireEvent.wheel(field(), { deltaY: -100 })
    expect(stored()).toBe('22.5')
    fireEvent.wheel(field(), { deltaY: 100 })
    expect(stored()).toBe('20')
    fireEvent.wheel(field(), { deltaY: 100 })
    expect(stored()).toBe('17.5')
  })

  it('adds up small touchpad deltas before moving one step', () => {
    render(<Harness initial={20} />)
    field().focus()
    fireEvent.wheel(field(), { deltaY: -20 })
    fireEvent.wheel(field(), { deltaY: -20 })
    expect(stored()).toBe('20')
    fireEvent.wheel(field(), { deltaY: -20 })
    expect(stored()).toBe('22.5')
  })

  it('locks the input and the buttons when disabled', async () => {
    const user = userEvent.setup()
    render(<Harness initial={20} disabled />)
    expect(field().disabled).toBe(true)
    expect(plus().disabled).toBe(true)
    expect(minus().disabled).toBe(true)
    await user.click(plus())
    expect(stored()).toBe('20')
  })
})
