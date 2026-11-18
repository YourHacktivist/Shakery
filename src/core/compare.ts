/**
 * Comparison of two versions or two recipes (section 8, « Comparaison »): lines added, removed,
 * doses changed with the gap, method or glass changed, and the gap of each indicator.
 *
 * Lines are matched by ingredient, in order: the second line of an ingredient is matched with
 * the second line of the same ingredient on the other side. A pure reordering is no change.
 */

export type CompareLine = {
  readonly ingredientId: string
  readonly quantity: number | null
  readonly unit: string
  readonly isOptional?: boolean
  readonly isGarnish?: boolean
}

export type CompareRecipe = {
  readonly method: string | null
  readonly glassId: string | null
  readonly lines: readonly CompareLine[]
}

export type LineChange =
  | { readonly kind: 'added'; readonly line: CompareLine }
  | { readonly kind: 'removed'; readonly line: CompareLine }
  | {
      readonly kind: 'dose'
      readonly ingredientId: string
      readonly before: CompareLine
      readonly after: CompareLine
      /** after − before when both are numbers in the same unit, else null. */
      readonly delta: number | null
    }
  | { readonly kind: 'unchanged'; readonly line: CompareLine }

export type RecipeDiff = {
  readonly lines: readonly LineChange[]
  readonly method: { readonly before: string | null; readonly after: string | null } | null
  readonly glass: { readonly before: string | null; readonly after: string | null } | null
  /** Same lines in another order. */
  readonly reordered: boolean
  /** No difference at all, the order of the lines aside. */
  readonly identical: boolean
}

function sameDose(a: CompareLine, b: CompareLine): boolean {
  return (
    a.quantity === b.quantity &&
    a.unit === b.unit &&
    Boolean(a.isOptional) === Boolean(b.isOptional) &&
    Boolean(a.isGarnish) === Boolean(b.isGarnish)
  )
}

export function compareRecipes(before: CompareRecipe, after: CompareRecipe): RecipeDiff {
  const remaining = before.lines.map((line, index) => ({ line, index, used: false }))
  const changes: LineChange[] = []
  const matchedOrder: number[] = []
  for (const line of after.lines) {
    const match = remaining.find((entry) => !entry.used && entry.line.ingredientId === line.ingredientId)
    if (!match) {
      changes.push({ kind: 'added', line })
      continue
    }
    match.used = true
    matchedOrder.push(match.index)
    if (sameDose(match.line, line)) {
      changes.push({ kind: 'unchanged', line })
    } else {
      const delta =
        match.line.quantity !== null && line.quantity !== null && match.line.unit === line.unit
          ? Math.round((line.quantity - match.line.quantity) * 1000) / 1000
          : null
      changes.push({ kind: 'dose', ingredientId: line.ingredientId, before: match.line, after: line, delta })
    }
  }
  for (const entry of remaining) if (!entry.used) changes.push({ kind: 'removed', line: entry.line })

  const method = before.method === after.method ? null : { before: before.method, after: after.method }
  const glass = before.glassId === after.glassId ? null : { before: before.glassId, after: after.glassId }
  const reordered = matchedOrder.some((value, index) => index > 0 && value < (matchedOrder[index - 1] ?? 0))
  const identical =
    method === null && glass === null && changes.every((change) => change.kind === 'unchanged')
  return { lines: changes, method, glass, reordered, identical }
}

/** Gap of an indicator between two versions, or null when one side is unknown. */
export function metricDelta(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return null
  return after - before
}
