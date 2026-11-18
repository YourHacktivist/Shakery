import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NumberWithUnit, parseDecimal } from './NumberWithUnit'

type HarnessProps = {
  initial: number | null
  onValue?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
}

function Harness({ initial, onValue, ...rest }: HarnessProps) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <NumberWithUnit
        label="Volume"
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
  return screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Volume' })
}

function stored() {
  return screen.getByTestId('value').textContent
}

describe('parseDecimal', () => {
  it('reads French and English decimals, spaces and the minus sign', () => {
    expect(parseDecimal('22,5')).toBe(22.5)
    expect(parseDecimal('22.5')).toBe(22.5)
    expect(parseDecimal(' 1 000,25 ')).toBe(1000.25)
    expect(parseDecimal(',5')).toBe(0.5)
    expect(parseDecimal('12,')).toBe(12)
    expect(parseDecimal('−3')).toBe(-3)
    expect(parseDecimal('-3')).toBe(-3)
  })

  it('returns null for an empty entry and undefined for text', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
    expect(parseDecimal('abc')).toBeUndefined()
    expect(parseDecimal('2,,5')).toBeUndefined()
    expect(parseDecimal('1e3')).toBeUndefined()
  })
})

describe('NumberWithUnit', () => {
  it('shows the value with a decimal comma and speaks it with its unit', () => {
    render(<Harness initial={22.5} />)
    expect(field().value).toBe('22,5')
    expect(field().getAttribute('aria-valuenow')).toBe('22.5')
    expect(field().getAttribute('aria-valuetext')).toMatch(/^22,5\sml$/)
  })

  it('accepts a comma while typing', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness initial={null} onValue={onValue} />)
    await user.type(field(), '7,5')
    expect(onValue).toHaveBeenLastCalledWith(7.5)
    expect(stored()).toBe('7.5')
  })

  it('gives null, never 0, when the field is emptied', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<Harness initial={30} onValue={onValue} />)
    await user.clear(field())
    expect(onValue).toHaveBeenLastCalledWith(null)
    expect(stored()).toBe('null')
    await user.tab()
    expect(field().value).toBe('')
  })

  it('steps with the up and down arrows and stays within min and max', async () => {
    const user = userEvent.setup()
    render(<Harness initial={9} min={0} max={10} step={0.5} />)
    await user.click(field())
    await user.keyboard('{ArrowUp}')
    expect(stored()).toBe('9.5')
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(stored()).toBe('10')
    expect(field().value).toBe('10')
    await user.keyboard('{PageDown}{PageDown}{PageDown}')
    expect(stored()).toBe('0')
  })

  it('snaps an off-grid value to the step', async () => {
    const user = userEvent.setup()
    render(<Harness initial={23} step={2.5} />)
    await user.click(field())
    await user.keyboard('{ArrowUp}')
    expect(stored()).toBe('25')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(stored()).toBe('20')
  })

  it('clamps a typed value to the bounds', async () => {
    const user = userEvent.setup()
    render(<Harness initial={null} max={100} />)
    await user.type(field(), '250')
    expect(stored()).toBe('100')
    await user.tab()
    expect(field().value).toBe('100')
  })

  it('flags text that is not a number, then restores the last value on blur', async () => {
    const user = userEvent.setup()
    render(<Harness initial={12} />)
    await user.type(field(), 'x')
    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Saisis un nombre, par exemple 22,5.')).toBeDefined()
    expect(stored()).toBe('12')
    await user.tab()
    expect(field().value).toBe('12')
    expect(field().getAttribute('aria-invalid')).toBeNull()
  })

  it('does not flag a number still being typed', async () => {
    const user = userEvent.setup()
    render(<Harness initial={null} />)
    await user.type(field(), '-')
    expect(field().getAttribute('aria-invalid')).toBeNull()
    await user.type(field(), '4')
    expect(stored()).toBe('-4')
  })

  it('shows a fixed number of decimals when asked', () => {
    render(<Harness initial={30} decimals={1} />)
    expect(field().value).toBe('30,0')
  })
})
