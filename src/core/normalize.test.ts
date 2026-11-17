import { describe, expect, it } from 'vitest'
import { normalizeName } from './normalize'

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
