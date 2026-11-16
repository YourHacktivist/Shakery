import { app } from 'electron'
import type { IpcHandlers } from './dispatch'

export const appHandlers = {
  'app.getVersion': () => ({ version: app.getVersion() }),
} satisfies Pick<IpcHandlers, 'app.getVersion'>
