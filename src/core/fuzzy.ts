/**
 * Approximate matching (section 8, « Recherche approchée »): a bounded Damerau-Levenshtein
 * distance (optimal string alignment: insertion, deletion, substitution, transposition of two
 * neighbours), used when the full-text search finds nothing. « cointrau » finds Cointreau.
 *
 * Inputs are expected normalized (normalize.ts): lower case, no accents.
 */

/** Rows of the distance table, reused from one call to the next (the core stays pure). */
let rowsSize = 0
let rowA = new Int32Array(0)
let rowB = new Int32Array(0)
let rowC = new Int32Array(0)

/**
 * Distance between `a` and `b`, or `max + 1` as soon as it is known to exceed `max`.
 * Only the diagonal band of width `max` is computed: a cell outside it is already above `max`,
 * so the result is the same as the full table, in O(len(a) × max). The search scans thousands
 * of names with it when the full-text search finds nothing.
 */
export function boundedDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  const n = a.length
  const m = b.length
  const over = max + 1
  if (Math.abs(n - m) > max) return over
  if (n === 0) return m
  if (m === 0) return n
  if (rowsSize < m + 2) {
    rowsSize = Math.max(m + 2, rowsSize * 2, 64)
    rowA = new Int32Array(rowsSize)
    rowB = new Int32Array(rowsSize)
    rowC = new Int32Array(rowsSize)
  }
  let before = rowA
  let previous = rowB
  let current = rowC
  for (let j = 0; j <= m; j += 1) previous[j] = j <= max ? j : over
  previous[m + 1] = over
  for (let i = 1; i <= n; i += 1) {
    const low = Math.max(1, i - max)
    const high = Math.min(m, i + max)
    current[0] = i <= max ? i : over
    current[low - 1] = low > 1 ? over : current[0]
    let rowMin = current[low - 1] ?? over
    const ai = a.charCodeAt(i - 1)
    for (let j = low; j <= high; j += 1) {
      const bj = b.charCodeAt(j - 1)
      let value = Math.min(
        (previous[j] ?? over) + 1,
        (current[j - 1] ?? over) + 1,
        (previous[j - 1] ?? over) + (ai === bj ? 0 : 1),
      )
      if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bj) {
        value = Math.min(value, (before[j - 2] ?? over) + 1)
      }
      if (value > over) value = over
      current[j] = value
      if (value < rowMin) rowMin = value
    }
    if (high < m) current[high + 1] = over
    if (rowMin > max) return over
    const spare = before
    before = previous
    previous = current
    current = spare
  }
  const result = previous[m] ?? over
  return result > max ? over : result
}

/** Allowed distance for a typed text: none under 4 letters, 1 up to 6, then 2. */
export function toleranceFor(text: string): number {
  if (text.length < 4) return 0
  if (text.length <= 6) return 1
  return 2
}

/**
 * Best distance between a typed text and a name: the whole name, or one of its words, or the
 * start of the name as long as the text (so that « negron » is close to « negroni sbagliato »).
 * Returns null when nothing is within the tolerance.
 */
export function fuzzyScore(query: string, candidate: string): number | null {
  const max = toleranceFor(query)
  if (max === 0) return null
  let best = boundedDistance(query, candidate, max)
  for (const word of candidate.split(' ')) {
    if (best === 0) break
    best = Math.min(best, boundedDistance(query, word, max))
  }
  if (candidate.length > query.length) {
    best = Math.min(best, boundedDistance(query, candidate.slice(0, query.length), max))
  }
  return best <= max ? best : null
}
