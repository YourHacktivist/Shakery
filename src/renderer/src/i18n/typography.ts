/**
 * French typography for every text of the interface: a no-break space before « : », « ; »,
 * « ? », « ! » and inside the quotation marks, so a sign never starts a line alone. Applied
 * once to the whole of `fr`, functions included: a text written with an ordinary space, or
 * built around a name, comes out right. A sign glued to its word (« Pourquoi? ») is a
 * writing mistake that `typography.test.ts` reports instead.
 */
const NBSP = String.fromCharCode(0xa0)
const NNBSP = String.fromCharCode(0x202f)
const HARD = `${NBSP}${NNBSP}`
const SPACE_BEFORE = /[ \t]+([:;?!»])/g
const SPACE_AFTER_OPEN = /«[ \t]+/g
const GLUED_AFTER_OPEN = new RegExp(`«(?=[^\\s${HARD}])`, 'g')
const GLUED_BEFORE_CLOSE = new RegExp(`(?<=[^\\s${HARD}])»`, 'g')

export function frenchSpaces(text: string): string {
  return text
    .replace(SPACE_BEFORE, `${NBSP}$1`)
    .replace(SPACE_AFTER_OPEN, `«${NBSP}`)
    .replace(GLUED_AFTER_OPEN, `«${NBSP}`)
    .replace(GLUED_BEFORE_CLOSE, `${NBSP}»`)
}

/**
 * The same tree, every text and every text a function returns set in French typography. An
 * object met twice (a block of help shared by two screens) gives one copy, met twice too.
 */
export function typeset<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (typeof value === 'string') return frenchSpaces(value) as T
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown
    return ((...args: unknown[]) => typeset(fn(...args))) as T
  }
  if (value === null || typeof value !== 'object') return value
  const known = seen.get(value)
  if (known !== undefined) return known as T
  if (Array.isArray(value)) {
    const copy: unknown[] = []
    seen.set(value, copy)
    for (const item of value as unknown[]) copy.push(typeset(item, seen))
    return copy as T
  }
  const copy: Record<string, unknown> = {}
  seen.set(value, copy)
  for (const [key, item] of Object.entries(value)) copy[key] = typeset(item, seen)
  return copy as T
}
