/**
 * Approximate matching (section 8, « Recherche approchée »): a bounded Damerau-Levenshtein
 * distance (optimal string alignment: insertion, deletion, substitution, transposition of two
 * neighbours), used when the full-text search finds nothing. « cointrau » finds Cointreau.
 *
 * Inputs are expected normalized (normalize.ts): lower case, no accents.
 */

/**
 * Distance between `a` and `b`, or `max + 1` as soon as it is known to exceed `max`.
 * Runs in O(len(a) × len(b)) at worst, and stops early on clearly different words.
 */
export function boundedDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previous2: number[] = []
  let previous: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        (previous[j] ?? Infinity) + 1,
        (current[j - 1] ?? Infinity) + 1,
        (previous[j - 1] ?? Infinity) + cost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (previous2[j - 2] ?? Infinity) + 1)
      }
      current.push(value)
      if (value < rowMin) rowMin = value
    }
    if (rowMin > max) return max + 1
    previous2 = previous
    previous = current
  }
  const result = previous[b.length] ?? max + 1
  return result > max ? max + 1 : result
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
