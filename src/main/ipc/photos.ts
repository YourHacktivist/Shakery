import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { DomainError } from '../errors'
import { mediaRoot } from '../paths'
import { PhotoService } from '../services/photos'
import type { IpcHandlers } from './dispatch'

type PhotoChannels = Extract<keyof IpcHandlers, `photos.${string}`>

/** Photos of recipes and tastings (D-045). */
export function createPhotoHandlers(manager: DatabaseManager): Pick<IpcHandlers, PhotoChannels> {
  const ids = systemIds()
  const photos = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new PhotoService(manager.db, ids, mediaRoot())
  }
  return {
    'photos.get': ({ owner, id }) => ({ path: photos().get(owner, id) }),
    'photos.set': ({ owner, id, content }) => photos().set(owner, id, content),
    'photos.restore': async ({ owner, id, path }) => {
      await photos().restore(owner, id, path)
      return null
    },
  }
}
