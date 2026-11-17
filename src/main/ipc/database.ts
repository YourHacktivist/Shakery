import type { BackupSummary } from '../../shared/domain/health'
import type { DatabaseManager } from '../db/manager'
import { SqliteReferenceRepository } from '../db/repositories/reference'
import { DomainError } from '../errors'
import { BackupError, type BackupManifest } from '../services/backup'
import type { IpcHandlers } from './dispatch'

export type DatabaseHandlerDeps = {
  readonly manager: DatabaseManager
  /** Called after a restore, to reload the windows on the restored notebook. */
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
  | 'reference.listGlasses'
  | 'reference.listIceTypes'
  | 'reference.listCategories'

export function createDatabaseHandlers({
  manager,
  onRestored,
}: DatabaseHandlerDeps): Pick<IpcHandlers, DatabaseChannels> {
  return {
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
