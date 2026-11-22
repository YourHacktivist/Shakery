import { BookOpenText, FileText, FolderOpen, Keyboard } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { useAppVersion } from '@renderer/app/useAppVersion'
import licences from '@renderer/assets/licenses.json'
import logoUrl from '@renderer/assets/logo-512.png'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Dialog } from '@renderer/components/Dialog'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

/** Version, guide, logs, attributions and licences (sections 9, 10.14 and 13.3). */
export function AboutCard() {
  const t = fr.settings.about
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const version = useAppVersion()
  const [showLicences, setShowLicences] = useState(false)

  return (
    <Card aria-label={t.title} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="logo-halo logo-shake flex size-24 shrink-0 items-center justify-center rounded-full">
          <img src={logoUrl} alt="" className="size-20" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-title font-semibold tracking-tight text-fg">{fr.app.name}</h2>
          <p className="m-0 text-small text-fg-secondary">{t.tagline}</p>
          {version.status === 'ready' ? (
            <p className="nums m-0 text-caption text-fg-muted">{fr.shell.version(version.version)}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<BookOpenText size={14} aria-hidden="true" />}
          onClick={() => void navigate('/guide')}
        >
          {t.guide}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Keyboard size={14} aria-hidden="true" />}
          onClick={() => {
            openOverlay('shortcuts')
          }}
        >
          {t.shortcuts}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<FolderOpen size={14} aria-hidden="true" />}
          onClick={() => {
            unwrap(window.shakery.app.openLogs()).catch(notifyError)
          }}
        >
          {t.logs}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<FileText size={14} aria-hidden="true" />}
          onClick={() => {
            setShowLicences(true)
          }}
        >
          {t.licences}
        </Button>
      </div>
      <dl className="m-0 flex flex-col gap-2 border-t border-border pt-3">
        {t.sources.map((source) => (
          <div key={source.name} className="flex flex-col">
            <dt className="text-small font-semibold text-fg">{source.name}</dt>
            <dd className="m-0 text-small text-fg-secondary">{source.text}</dd>
          </div>
        ))}
      </dl>

      <Dialog
        open={showLicences}
        onClose={() => {
          setShowLicences(false)
        }}
        title={t.licencesTitle}
        description={t.licencesText}
        size="lg"
      >
        <ul
          tabIndex={0}
          aria-label={t.licencesTitle}
          className="m-0 max-h-[52vh] list-none overflow-y-auto p-0"
        >
          {licences.map((item) => (
            <li
              key={`${item.name}@${item.version}`}
              className="flex items-baseline gap-3 border-b border-border py-1.5 text-small last:border-b-0"
            >
              <span className="min-w-0 flex-1 break-all text-fg">{item.name}</span>
              <span className="nums shrink-0 text-fg-muted">{item.version}</span>
              <span className="w-28 shrink-0 text-right text-fg-secondary">{item.license}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </Card>
  )
}
