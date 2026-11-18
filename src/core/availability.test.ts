import { describe, expect, it } from 'vitest'
import { isAvailable, missingIngredients, unlockers, type AvailabilityFacts } from './availability'

const facts: AvailabilityFacts = {
  owned: new Set(['gin', 'campari']),
  staples: new Set(['water', 'sugar']),
  activePreps: new Set(['syrup']),
}

const line = (ingredientId: string, extra: { isOptional?: boolean; isGarnish?: boolean } = {}) => ({
  ingredientId,
  isOptional: extra.isOptional ?? false,
  isGarnish: extra.isGarnish ?? false,
})

describe('availability', () => {
  it('counts owned bottles, staples and active preparations', () => {
    expect(isAvailable('gin', facts)).toBe(true)
    expect(isAvailable('water', facts)).toBe(true)
    expect(isAvailable('syrup', facts)).toBe(true)
    expect(isAvailable('vermouth', facts)).toBe(false)
  })

  it('ignores optional and garnish lines, and names each missing ingredient once', () => {
    const negroni = [line('gin'), line('campari'), line('vermouth'), line('orange', { isGarnish: true })]
    expect(missingIngredients(negroni, facts)).toEqual(['vermouth'])
    expect(missingIngredients([line('gin'), line('bitters', { isOptional: true })], facts)).toEqual([])
    expect(missingIngredients([line('lime'), line('lime'), line('rum')], facts)).toEqual(['lime', 'rum'])
  })

  it('groups recipes missing exactly one ingredient, the most useful first', () => {
    const result = unlockers([
      { id: 'negroni', missing: ['vermouth'] },
      { id: 'manhattan', missing: ['vermouth'] },
      { id: 'daiquiri', missing: ['rum'] },
      { id: 'mojito', missing: ['rum', 'mint'] },
      { id: 'gin-tonic', missing: [] },
    ])
    expect(result).toEqual([
      { ingredientId: 'vermouth', recipeIds: ['negroni', 'manhattan'] },
      { ingredientId: 'rum', recipeIds: ['daiquiri'] },
    ])
  })
})
