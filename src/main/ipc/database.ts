import type { BackupSummary } from '../../shared/domain/health'
import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { SqliteReferenceRepository } from '../db/repositories/reference'
import { DomainError } from '../errors'
import { BackupError, type BackupManifest } from '../services/backup'
import { removeUnusedPhotos } from '../services/photos'
import { TrashService } from '../services/trash'
import { mediaRoot } from '../paths'
import { log } from '../logger'
import type { IpcHandlers } from './dispatch'

export type DatabaseHandlerDeps = {
  readonly manager: DatabaseManager
  /** Called after a restore or a reset, to reload the windows on the notebook now in place. */
  readonly onRestored: () => void
}

export function toSummary(manifest: BackupManifest): BackupSummary {
  return {
    id: manifest.id,
    createdAt: manifest.createdAt,
    reason: manifest.reason,
    appVersion: manifest.appVersion,
    integrity: manifest.integrity,
    counts: manifest.counts,
    mediaCount: manifest.media.length,
  }
}

function asDomainError(error: unknown): never {
  if (error instanceof BackupError) {
    if (error.code === 'NOT_FOUND') throw new DomainError('NOT_FOUND', 'Unknown backup')
    if (error.code === 'DIRECTORY_UNAVAILABLE')
      throw new DomainError('UNAVAILABLE', 'Backup folder unavailable')
    throw new DomainError('CONFLICT', error.message)
  }
  throw error
}

function repository(manager: DatabaseManager): SqliteReferenceRepository {
  if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
  return new SqliteReferenceRepository(manager.db)
}

type DatabaseChannels =
  | 'database.getHealth'
  | 'backups.list'
  | 'backups.create'
  | 'backups.restore'
  | 'database.reset'
  | 'trash.list'
  | 'trash.restore'
  | 'trash.empty'
  | 'reference.listGlasses'
  | 'reference.listIceTypes'
  | 'reference.listCategories'

export function createDatabaseHandlers({
  manager,
  onRestored,
}: DatabaseHandlerDeps): Pick<IpcHandlers, DatabaseChannels> {
  const ids = systemIds()
  const trash = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new TrashService(manager.db, ids)
  }
  return {
    'trash.list': () => trash().list(),
    'trash.restore': ({ kind, id }) => {
      trash().restore(kind, id)
      return null
    },
    'trash.empty': async () => {
      trash() // refused before the backup when the notebook is not ready
      await manager.backupBeforeErasing('pre-purge').catch(asDomainError)
      const emptied = trash().empty()
      // The rows are gone for good already: a file that resists waits for the next time.
      await removeUnusedPhotos(manager.db, mediaRoot()).catch((error: unknown) => {
        log.warn('Unused photos could not all be removed', error)
      })
      return emptied
    },
    'database.reset': async () => {
      if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
      const manifest = await manager.reset().catch(asDomainError)
      onRestored()
      return toSummary(manifest)
    },
    'database.getHealth': () => manager.health(),
    'backups.list': async () => (await manager.listBackups()).map(toSummary),
    'backups.create': async () => {
      if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
      return toSummary(await manager.backup('manual').catch(asDomainError))
    },
    'backups.restore': async ({ id }) => {
      const manifest = await manager.restore(id).catch(asDomainError)
      onRestored()
      return toSummary(manifest)
    },
    'reference.listGlasses': () => repository(manager).listGlasses(),
    'reference.listIceTypes': () => repository(manager).listIceTypes(),
    'reference.listCategories': () => repository(manager).listCategories(),
  }
}
