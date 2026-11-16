import { useEffect, useState } from 'react'
import logoUrl from '@renderer/assets/logo-160.png'
import { fr } from '@renderer/i18n/fr'
import { shakery, unwrap } from '@renderer/lib/ipc'

type VersionState = { status: 'loading' } | { status: 'ready'; version: string } | { status: 'error' }

/** Phase 0 placeholder: proves the IPC round trip and the design tokens. Replaced in phase 2. */
export function App() {
  const [version, setVersion] = useState<VersionState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    unwrap(shakery.app.getVersion())
      .then(({ version: value }) => {
        if (active) setVersion({ status: 'ready', version: value })
      })
      .catch(() => {
        if (active) setVersion({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="flex h-full items-center justify-center p-6">
      <section className="flex flex-col items-center gap-6 text-center">
        <div className="logo-halo flex size-40 items-center justify-center rounded-full">
          <img src={logoUrl} alt={fr.boot.logoAlt} width={128} height={128} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-light tracking-tight">{fr.app.name}</h1>
          <p className="text-lead text-fg-secondary">{fr.app.tagline}</p>
        </div>
        <p className="nums text-small text-fg-muted" data-testid="app-version">
          {version.status === 'ready'
            ? fr.boot.version(version.version)
            : version.status === 'error'
              ? fr.boot.versionUnknown
              : ' '}
        </p>
        <p className="max-w-md text-body text-fg-secondary">{fr.boot.phase}</p>
      </section>
    </main>
  )
}
