import { describe, expect, it } from 'vitest'
import { normalizeName, uniqueTags } from './normalize'

describe('normalizeName', () => {
  it.each([
    ['Crème de cassis', 'creme de cassis'],
    ['CRÈME DE MÛRE', 'creme de mure'],
    ['Liqueur aux œufs', 'liqueur aux oeufs'],
    ['Œil-de-perdrix', 'oeil-de-perdrix'],
    ['Cachaça', 'cachaca'],
    ['Piña Colada', 'pina colada'],
    ['Żubrówka', 'zubrowka'],
    ['Kōriyama', 'koriyama'],
    ['Rakı', 'raki'],
    ['Łącko', 'lacko'],
    ['Ørbæk', 'orbaek'],
    ['Straße', 'strasse'],
    ['Encyclopædia', 'encyclopaedia'],
  ])('%s becomes %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected)
  })

  it('unifies apostrophes and dashes', () => {
    expect(normalizeName('Eau‑de‑vie d’abricot')).toBe("eau-de-vie d'abricot")
    expect(normalizeName('Horse’s Neck')).toBe(normalizeName("Horse's Neck"))
  })

  it('collapses every kind of space and trims', () => {
    expect(normalizeName('  Gin  London \t Dry  ')).toBe('gin london dry')
  })

  it('is idempotent', () => {
    const once = normalizeName('  Œuf  Crème’s \u2014 Négroni ')
    expect(normalizeName(once)).toBe(once)
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeName('   ')).toBe('')
  })
})

describe('invisible characters and case', () => {
  const char = (...codes: number[]) => String.fromCharCode(...codes)

  it('ignores zero-width spaces, soft hyphens, BOM and direction marks', () => {
    for (const hidden of [char(0x200b), char(0xad), char(0xfeff), char(0x202e), char(0x200d), char(0x2066)]) {
      expect(normalizeName(`Ne${hidden}groni`)).toBe('negroni')
    }
    expect(normalizeName(char(0x200b, 0xfeff))).toBe('')
  })

  it('folds the case of every script it can', () => {
    expect(normalizeName('İSTANBUL')).toBe('istanbul')
    expect(normalizeName('STRAẞE')).toBe('strasse')
    expect(normalizeName('ΣΊΣΥΦΟΣ')).toBe(normalizeName('σίσυφος'))
  })

  it('never throws on a lone surrogate or a very long text', () => {
    expect(() => normalizeName(char(0xd800, 0x61, 0xdc00))).not.toThrow()
    expect(normalizeName('A'.repeat(100_000))).toHaveLength(100_000)
  })
})

describe('uniqueTags', () => {
  it('keeps the first spelling of each tag, trimmed', () => {
    expect(uniqueTags([' Été ', 'été', 'ETE', 'Agrumes', 'agrumes', 'Amer'])).toEqual([
      'Été',
      'Agrumes',
      'Amer',
    ])
  })

  it('drops a tag made of invisible characters only', () => {
    expect(uniqueTags([String.fromCharCode(0x200b), 'Sec'])).toEqual(['Sec'])
  })
})
