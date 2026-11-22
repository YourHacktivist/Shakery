import { describe, expect, it } from 'vitest'
import { formatDose, inDisplayUnit, type DisplayUnit } from './model'

const NBSP = String.fromCharCode(0xa0)
const shown = (quantity: number, unit: 'ml' | 'cl' | 'oz' | 'dash', display: DisplayUnit) =>
  formatDose({ quantity, unit, topEstimateMl: null }, display).replaceAll(NBSP, ' ')

describe('doses in the display unit', () => {
  it('keeps the half and quarter doses of the bar', () => {
    expect(shown(22.5, 'ml', 'cl')).toBe('2,25 cl')
    expect(shown(7.5, 'ml', 'cl')).toBe('0,75 cl')
    expect(shown(45, 'ml', 'oz')).toBe('1,5 oz')
    expect(shown(22.5, 'ml', 'oz')).toBe('0,75 oz')
    expect(shown(0.25, 'oz', 'ml')).toBe('7,5 ml')
  })

  it('never turns a small dose into zero or into a wrong quarter', () => {
    expect(shown(2.5, 'ml', 'oz')).toBe('0,08 oz')
    expect(shown(5, 'ml', 'oz')).toBe('0,17 oz')
  })

  it('leaves the other units and the chosen one as they are', () => {
    expect(shown(2, 'dash', 'cl')).toBe('2 traits')
    expect(inDisplayUnit(22.5, 'ml', 'ml')).toEqual({ quantity: 22.5, unit: 'ml' })
  })
})
