import { describe, expect, it } from 'vitest'
import { roundServedVolume } from './format'

describe('roundServedVolume', () => {
  it('writes a served volume to the nearest 5 ml, as a bar does', () => {
    expect(roundServedVolume(126)).toBe(125)
    expect(roundServedVolume(108)).toBe(110)
    expect(roundServedVolume(99)).toBe(100)
    expect(roundServedVolume(102.4)).toBe(100)
  })

  it('keeps the millilitre for a very small volume', () => {
    expect(roundServedVolume(7.4)).toBe(7)
    expect(roundServedVolume(19.6)).toBe(20)
  })
})
