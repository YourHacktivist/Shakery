import { useEffect, useState } from 'react'
import { shakery, unwrap } from '@renderer/lib/ipc'

export type AppVersionState =
  { status: 'loading' } | { status: 'ready'; version: string } | { status: 'error' }

async function readVersion(): Promise<string> {
  const { version } = await unwrap(shakery.app.getVersion())
  return version
}

/** Version of the application, read once from the main process. */
export function useAppVersion(): AppVersionState {
  const [state, setState] = useState<AppVersionState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    readVersion().then(
      (version) => {
        if (active) setState({ status: 'ready', version })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [])

  return state
}
