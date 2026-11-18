import type { SelectGroup } from '@renderer/components/Select'
import type { Category } from '@shared/domain/reference'

/**
 * Leaves of the category tree, grouped under their root: an ingredient always belongs to
 * the most precise category. The list keeps the order of the tree (parents first, then
 * siblings by sort order, as reference.listCategories returns it).
 */
export function leafCategoryGroups(categories: readonly Category[]): SelectGroup[] {
  const children = new Map<string | null, Category[]>()
  for (const category of categories) {
    const siblings = children.get(category.parentId) ?? []
    siblings.push(category)
    children.set(category.parentId, siblings)
  }
  const leavesUnder = (category: Category): Category[] => {
    const below = children.get(category.id)
    if (!below || below.length === 0) return [category]
    return below.flatMap(leavesUnder)
  }
  return (children.get(null) ?? []).map((root) => ({
    label: root.name,
    options: leavesUnder(root).map((leaf) => ({ value: leaf.id, label: leaf.name })),
  }))
}

/** Id to name, for the hints next to an ingredient. */
export function categoryNames(categories: readonly Category[] | undefined): Map<string, string> {
  return new Map((categories ?? []).map((category) => [category.id, category.name]))
}

/** « Spiritueux / Whiskies / Scotch whisky ». */
export function categoryPath(categories: readonly Category[] | undefined, id: string): string | null {
  const byId = new Map((categories ?? []).map((category) => [category.id, category]))
  const names: string[] = []
  let current = byId.get(id)
  while (current && names.length < 10) {
    names.unshift(current.name)
    current = current.parentId === null ? undefined : byId.get(current.parentId)
  }
  return names.length === 0 ? null : names.join(' / ')
}
