/**
 * Working copy of the lab (section 8, « Atelier »): an in-memory copy of the recipe, unlimited
 * undo and redo during the session, lines that can be switched off without being deleted.
 * Nothing is written before an explicit save.
 */
import type { RecipeInputParsed } from '@shared/domain/catalog'
import type { RecipeLineValues } from '@renderer/features/recipes/model'

export type LabLine = RecipeLineValues & { key: string; enabled: boolean }

export type LabDraft = Omit<RecipeInputParsed, 'lines'> & { lines: LabLine[] }

export type LabState = {
  past: LabDraft[]
  present: LabDraft
  future: LabDraft[]
}

export type LabAction =
  | { type: 'change'; draft: LabDraft }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; draft: LabDraft }

let counter = 0
const newKey = () => `line-${(counter += 1)}`

export function toDraft(input: RecipeInputParsed): LabDraft {
  return { ...input, lines: input.lines.map((line) => ({ ...line, key: newKey(), enabled: true })) }
}

/** The recipe as it would be saved: switched-off lines left out. */
export function toInput(draft: LabDraft): RecipeInputParsed {
  return {
    ...draft,
    lines: draft.lines
      .filter((line) => line.enabled)
      .map(({ key: _key, enabled: _enabled, ...line }) => line),
  }
}

export function sameRecipe(a: LabDraft, b: LabDraft): boolean {
  const strip = (draft: LabDraft) => ({
    ...draft,
    lines: draft.lines.map(({ key: _key, ...line }) => line),
  })
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

export function initLab(draft: LabDraft): LabState {
  return { past: [], present: draft, future: [] }
}

export function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'change':
      if (sameRecipe(state.present, action.draft)) return state
      return { past: [...state.past, state.present], present: action.draft, future: [] }
    case 'undo': {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return { past: [...state.past, state.present], present: next, future: rest }
    }
    case 'reset':
      return initLab(action.draft)
  }
}

/** Step of the dose arrows by unit (2.5 ml or ¼ oz by default, section 8). */
export function stepFor(unit: RecipeLineValues['unit']): number {
  switch (unit) {
    case 'ml':
      return 2.5
    case 'cl':
    case 'oz':
      return 0.25
    case 'barspoon':
    case 'tsp':
      return 0.5
    case 'g':
      return 5
    default:
      return 1
  }
}
