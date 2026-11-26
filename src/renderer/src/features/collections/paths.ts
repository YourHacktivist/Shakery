/** Address of a collection's page, on one of its tabs (D-057): « Fiches » by default, or « Réviser ». */
export function collectionPath(id: string, tab: 'recipes' | 'practice' = 'recipes'): string {
  return tab === 'practice' ? `/collections/${id}?tab=practice` : `/collections/${id}`
}
