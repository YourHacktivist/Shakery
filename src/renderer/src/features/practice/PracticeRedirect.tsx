import { Navigate, useSearchParams } from 'react-router'
import { collectionPath } from '@renderer/features/collections/paths'

/**
 * The revision is a tab of each collection (D-057). An old address `/practice` leads to the
 * collections, or to the tab « Réviser » of the collection it named.
 */
export function PracticeRedirect() {
  const [params] = useSearchParams()
  const collection = params.get('collection')
  return <Navigate to={collection ? collectionPath(collection, 'practice') : '/collections'} replace />
}
