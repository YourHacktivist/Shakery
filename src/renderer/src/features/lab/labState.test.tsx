import { describe, expect, it } from 'vitest'
import { emptyLine, emptyRecipe } from '@renderer/features/recipes/model'
import { initLab, labReducer, sameRecipe, stepFor, toDraft, toInput } from './labState'

function draftWith(doses: number[]) {
  return toDraft({
    ...emptyRecipe(),
    name: 'Essai',
    lines: doses.map((quantity, index) => ({ ...emptyLine(), ingredientId: `i${index}`, quantity })),
  })
}

describe('labReducer', () => {
  it('undoes and redoes every change without limit', () => {
    let state = initLab(draftWith([30]))
    for (const dose of [32.5, 35, 37.5]) {
      const line = state.present.lines[0]
      if (!line) throw new Error('fixture')
      state = labReducer(state, {
        type: 'change',
        draft: { ...state.present, lines: [{ ...line, quantity: dose }] },
      })
    }
    expect(state.past).toHaveLength(3)
    state = labReducer(state, { type: 'undo' })
    state = labReducer(state, { type: 'undo' })
    expect(state.present.lines[0]?.quantity).toBe(32.5)
    state = labReducer(state, { type: 'redo' })
    expect(state.present.lines[0]?.quantity).toBe(35)
    // A new change after an undo drops what could be redone.
    const line = state.present.lines[0]
    if (!line) throw new Error('fixture')
    state = labReducer(state, {
      type: 'change',
      draft: { ...state.present, lines: [{ ...line, quantity: 40 }] },
    })
    expect(state.future).toEqual([])
    expect(labReducer(initLab(draftWith([1])), { type: 'undo' }).past).toEqual([])
  })

  it('ignores a change that changes nothing', () => {
    const state = initLab(draftWith([30]))
    expect(labReducer(state, { type: 'change', draft: { ...state.present } })).toBe(state)
  })

  it('leaves switched-off lines out of what is computed and saved', () => {
    const draft = draftWith([30, 20])
    const second = draft.lines[1]
    if (!second) throw new Error('fixture')
    const off = {
      ...draft,
      lines: [draft.lines[0], { ...second, enabled: false }].filter((l) => l !== undefined),
    }
    expect(toInput(off).lines.map((line) => line.quantity)).toEqual([30])
    expect(toInput(off).lines[0]).not.toHaveProperty('key')
    expect(sameRecipe(draft, off)).toBe(false)
    expect(
      sameRecipe(draft, { ...draft, lines: draft.lines.map((line) => ({ ...line, key: 'other' })) }),
    ).toBe(true)
  })

  it('steps doses by 2.5 ml or a quarter of an ounce', () => {
    expect(stepFor('ml')).toBe(2.5)
    expect(stepFor('oz')).toBe(0.25)
    expect(stepFor('dash')).toBe(1)
  })
})
