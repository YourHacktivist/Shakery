import { systemIds } from '../db/client'
import type { DatabaseManager } from '../db/manager'
import { JournalRepository } from '../db/repositories/journal'
import { DomainError } from '../errors'
import type { IpcHandlers } from './dispatch'

type JournalChannels = Extract<keyof IpcHandlers, `tastingNotes.${string}` | `notebook.${string}`>

/** Tasting journal and notebook (phase 7). */
export function createJournalHandlers(manager: DatabaseManager): Pick<IpcHandlers, JournalChannels> {
  const ids = systemIds()
  const repo = () => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return new JournalRepository(manager.db, ids)
  }
  return {
    'tastingNotes.list': (filter) => repo().listTastings(filter),
    'tastingNotes.create': (data) => repo().createTasting(data),
    'tastingNotes.update': ({ id, data }) => repo().updateTasting(id, data),
    'tastingNotes.setNextStepDone': ({ id, done }) => repo().setNextStepDone(id, done),
    'tastingNotes.delete': ({ id }) => {
      repo().deleteTasting(id)
      return null
    },
    'notebook.list': () => repo().listEntries(),
    'notebook.create': (data) => repo().createEntry(data),
    'notebook.update': ({ id, data }) => repo().updateEntry(id, data),
    'notebook.delete': ({ id }) => {
      repo().deleteEntry(id)
      return null
    },
  }
}
