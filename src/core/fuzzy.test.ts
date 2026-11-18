import { describe, expect, it } from 'vitest'
import { boundedDistance, fuzzyScore, toleranceFor } from './fuzzy'

describe('boundedDistance', () => {
  it('counts insertions, deletions, substitutions and transpositions', () => {
    expect(boundedDistance('cointreau', 'cointreau', 2)).toBe(0)
    expect(boundedDistance('cointrau', 'cointreau', 2)).toBe(1)
    expect(boundedDistance('cointreaux', 'cointreau', 2)).toBe(1)
    expect(boundedDistance('negroin', 'negroni', 2)).toBe(1)
    expect(boundedDistance('nagroni', 'negroni', 2)).toBe(1)
    expect(boundedDistance('', 'abc', 5)).toBe(3)
    expect(boundedDistance('abc', '', 5)).toBe(3)
  })

  it('stops at the bound', () => {
    expect(boundedDistance('gin', 'vodka', 2)).toBe(3)
    expect(boundedDistance('martini', 'margarita', 1)).toBe(2)
    expect(boundedDistance('a', 'abcdef', 2)).toBe(3)
  })
})

describe('fuzzyScore', () => {
  it('finds a name from a misspelt word, the whole name or its start', () => {
    expect(fuzzyScore('cointrau', 'cointreau')).toBe(1)
    expect(fuzzyScore('chartrese', 'chartreuse verte')).toBe(1)
    expect(fuzzyScore('negron', 'negroni sbagliato')).toBe(0)
    expect(fuzzyScore('angostrua', 'angostura bitters')).toBe(1)
  })

  it('refuses short texts and distant names', () => {
    expect(toleranceFor('gin')).toBe(0)
    expect(fuzzyScore('gin', 'gim')).toBeNull()
    expect(fuzzyScore('vodka', 'campari')).toBeNull()
    expect(toleranceFor('mojitos')).toBe(2)
  })
})
