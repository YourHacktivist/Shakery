import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { rebuildSearchIndex } from '../db/repositories/index-rows'
import { SearchRepository } from '../db/repositories/search'
import { DomainError } from '../errors'
import type { IpcHandlers } from './dispatch'

/** Ctrl+K search and recently viewed items (phase 5). */
export function createSearchHandlers(
  manager: DatabaseManager,
): Pick<IpcHandlers, 'search.query' | 'search.notes' | 'search.rebuild' | 'recentViews.record'> {
  const ids = systemIds()
  const repo = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new SearchRepository(manager.db)
  }
  return {
    'search.query': ({ text, limit }) => repo().search(text, limit),
    'search.notes': ({ text, limit }) => repo().searchNotes(text, limit),
    'search.rebuild': () => {
      if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
      return { count: rebuildSearchIndex(manager.db) }
    },
    'recentViews.record': ({ entityType, entityId }) => {
      repo().recordView(entityType, entityId, ids)
      return null
    },
  }
}
