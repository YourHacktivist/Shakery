import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { WorkshopRepository } from '../db/repositories/workshop'
import { DomainError } from '../errors'
import { savePdf } from '../services/print'
import type { IpcHandlers } from './dispatch'

type WorkshopChannels = Extract<
  keyof IpcHandlers,
  `preps.${string}` | `batches.${string}` | `collections.${string}` | `practice.${string}`
>

/** Preparations, collections and revision (phase 8). */
export function createWorkshopHandlers(manager: DatabaseManager): Pick<IpcHandlers, WorkshopChannels> {
  const ids = systemIds()
  const repo = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new WorkshopRepository(manager.db, ids)
  }
  return {
    'preps.list': () => repo().listPreps(),
    'batches.create': (data) => repo().createBatch(data),
    'batches.setStatus': ({ id, status }) => repo().setBatchStatus(id, status),
    'batches.delete': ({ id }) => {
      repo().deleteBatch(id)
      return null
    },
    'collections.list': () => repo().listCollections(),
    'collections.get': ({ id }) => repo().getCollection(id),
    'collections.create': (data) => repo().createCollection(data),
    'collections.update': ({ id, data }) => repo().updateCollection(id, data),
    'collections.delete': ({ id }) => {
      repo().deleteCollection(id)
      return null
    },
    'collections.restore': ({ id }) => repo().restoreCollection(id),
    'collections.addRecipes': ({ id, recipeIds }) => repo().addRecipes(id, recipeIds),
    'collections.updateItem': ({ id, note, salePriceCents }) => {
      repo().updateItem(id, { note, salePriceCents })
      return null
    },
    'collections.removeItem': ({ id }) => {
      repo().removeItem(id)
      return null
    },
    'collections.restoreItem': ({ id }) => {
      repo().restoreItem(id)
      return null
    },
    'collections.reorder': ({ id, itemIds }) => {
      repo().reorder(id, itemIds)
      return null
    },
    'collections.exportPdf': ({ id }) => {
      const collection = repo().getCollection(id)
      return savePdf(`print/collection/${id}`, collection.name)
    },
    'practice.corpus': ({ id }) => repo().practiceCorpus(id),
    'practice.weakKeys': () => repo().weakKeys(),
    'practice.finish': (data) => repo().finishPractice(data),
    'practice.history': () => repo().history(),
  }
}
