import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc/channels'

/**
 * Exposes `window.shakery`: one function per operation of the contract, nothing else.
 * `ipcRenderer` and Node modules never reach the renderer. Each function forwards a
 * single argument; the main process validates it.
 */
type Invoker = (input?: unknown) => Promise<unknown>

const api: Record<string, Record<string, Invoker>> = {}

for (const channel of IPC_CHANNELS) {
  const [domain, operation] = channel.split('.') as [string, string]
  const group = (api[domain] ??= {})
  group[operation] = (input?: unknown) => ipcRenderer.invoke(channel, input)
}

contextBridge.exposeInMainWorld('shakery', api)
