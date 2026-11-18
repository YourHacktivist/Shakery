import { fr } from '@renderer/i18n/fr'

/**
 * Central registry of the keyboard shortcuts of section 10.1. The shell listens to them
 * (app/useGlobalShortcuts.ts) and the « ? » panel lists them all from here.
 */
export type ShortcutId =
  | 'palette'
  | 'typeToSearch'
  | 'quickIdea'
  | 'newRecipe'
  | 'tastingNote'
  | 'openInLab'
  | 'print'
  | 'prepMode'
  | 'back'
  | 'help'

/** A key as shown to the user: a named key (translated), or a literal one such as « K » or « ? ». */
export type KeyToken = 'mod' | 'shift' | 'escape' | 'letter' | 'K' | 'N' | 'J' | 'E' | 'P' | 'F11' | '?'

export type Shortcut = {
  readonly id: ShortcutId
  readonly keys: readonly KeyToken[]
  /** False while the feature behind it is not built yet: listed as « bientôt », never handled. */
  readonly available: boolean
}

export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'palette', keys: ['mod', 'K'], available: true },
  { id: 'typeToSearch', keys: ['letter'], available: true },
  { id: 'quickIdea', keys: ['mod', 'N'], available: true },
  { id: 'newRecipe', keys: ['mod', 'shift', 'N'], available: true },
  { id: 'tastingNote', keys: ['mod', 'J'], available: false },
  { id: 'openInLab', keys: ['mod', 'E'], available: false },
  { id: 'print', keys: ['mod', 'P'], available: false },
  { id: 'prepMode', keys: ['F11'], available: false },
  { id: 'back', keys: ['escape'], available: true },
  { id: 'help', keys: ['?'], available: true },
]

export function getShortcut(id: ShortcutId): Shortcut {
  const shortcut = SHORTCUTS.find((entry) => entry.id === id)
  if (!shortcut) throw new Error(`Unknown shortcut ${id}`)
  return shortcut
}

/** Labels of the keys of a shortcut, in order: ['Ctrl', 'K']. */
export function shortcutKeyLabels(id: ShortcutId): string[] {
  const keys = fr.shell.keys
  return getShortcut(id).keys.map((token) => {
    switch (token) {
      case 'mod':
        return keys.mod
      case 'shift':
        return keys.shift
      case 'escape':
        return keys.escape
      case 'letter':
        return keys.letter
      default:
        return token
    }
  })
}

/** The shortcut as one string for a <Kbd>: « Ctrl K ». */
export function shortcutText(id: ShortcutId): string {
  return shortcutKeyLabels(id).join(' ')
}

/** Value of `aria-keyshortcuts` (WAI-ARIA syntax): « Control+K ». */
export function ariaKeyShortcut(id: ShortcutId): string {
  return getShortcut(id)
    .keys.map((token) => {
      switch (token) {
        case 'mod':
          return 'Control'
        case 'shift':
          return 'Shift'
        case 'escape':
          return 'Escape'
        default:
          return token
      }
    })
    .join('+')
}

/** The parts of a KeyboardEvent the matcher reads, so tests can pass plain objects. */
export type KeyInput = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'
>

const SINGLE_LETTER = /^\p{L}$/u

/** Letter of a Ctrl combination, read from the layout first, then from the physical key. */
function comboLetter(event: KeyInput): string {
  const key = event.key.toLowerCase()
  if (/^[a-z]$/.test(key)) return key
  const match = /^Key([A-Z])$/.exec(event.code)
  return match?.[1] ? match[1].toLowerCase() : key
}

/**
 * Which shortcut a key press asks for, whatever the focus. Ctrl and Cmd are equivalent.
 * The caller decides whether it applies (text field, open dialog, feature not built yet).
 */
export function matchShortcut(event: KeyInput): ShortcutId | null {
  if (event.isComposing) return null
  const mod = event.ctrlKey || event.metaKey
  if (event.altKey) return null

  if (mod) {
    switch (comboLetter(event)) {
      case 'k':
        return event.shiftKey ? null : 'palette'
      case 'n':
        return event.shiftKey ? 'newRecipe' : 'quickIdea'
      case 'j':
        return event.shiftKey ? null : 'tastingNote'
      case 'e':
        return event.shiftKey ? null : 'openInLab'
      case 'p':
        return event.shiftKey ? null : 'print'
      default:
        return null
    }
  }

  if (event.key === 'Escape') return 'back'
  if (event.key === 'F11') return 'prepMode'
  if (event.key === '?') return 'help'
  if (SINGLE_LETTER.test(event.key)) return 'typeToSearch'
  return null
}

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
])

const TEXT_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton'])

/** True when typing in this element writes text: shortcuts without Ctrl must stay quiet. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  const role = target.getAttribute('role')
  return role !== null && TEXT_ROLES.has(role)
}

/**
 * True when letters already mean something where the focus is: menus and lists use them
 * to jump to an item (typeahead), so typing there must not open the palette.
 */
export function isTypeaheadTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return (
    target.closest('[role="menu"], [role="menubar"], [role="listbox"], [role="tree"], [role="grid"]') !== null
  )
}
