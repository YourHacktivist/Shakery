import type { UpdateService } from '../services/updates'
import type { IpcHandlers } from './dispatch'

type UpdateChannels =
  'updates.status' | 'updates.check' | 'updates.download' | 'updates.install' | 'updates.skip'

/** Updates from the GitHub releases (D-051). */
export function createUpdateHandlers(updates: UpdateService): Pick<IpcHandlers, UpdateChannels> {
  return {
    'updates.status': () => updates.current,
    'updates.check': () => updates.check(),
    'updates.download': () => updates.download(),
    'updates.install': async () => {
      await updates.install()
      return updates.current
    },
    'updates.skip': ({ version }) => updates.skip(version),
  }
}
