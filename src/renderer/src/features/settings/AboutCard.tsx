import { BookOpenText, FileText, FolderOpen, Keyboard } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { useAppVersion } from '@renderer/app/useAppVersion'
import licences from '@renderer/assets/licenses.json'
import logoUrl from '@renderer/assets/logo-512.png'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { Dialog } from '@renderer/components/Dialog'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

/** Version, guide, logs, credits of the data and licences (sections 9, 10.14 and 13.3), last of the page. */
export function AboutCard() {
  const t = fr.settings.about
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const version = useAppVersion()
  const [showLicences, setShowLicences] = useState(false)

  return (
    <SettingsBlock block="about" title={t.title}>
      <div className="flex items-center gap-4 pt-4 pb-1.5">
        <img src={logoUrl} alt="" className="size-12 shrink-0" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-heading font-semibold text-fg">{fr.app.name}</span>
          <span className="text-small text-fg-secondary">{t.tagline}</span>
        </div>
        {version.status === 'ready' ? (
          <span className="nums ml-auto shrink-0 text-small text-fg-muted">
            {fr.shell.version(version.version)}
          </span>
        ) : null}
      </div>
      <SettingsGroup title={fr.settings.groups.help}>
        <ControlRow stacked label={t.tools} hint={t.toolsHint}>
          <Button
            variant="outline"
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
        </ControlRow>
      </SettingsGroup>
      <SettingsGroup title={fr.settings.groups.credits}>
        <dl className="m-0 pb-1.5">
          {t.sources.map((source) => (
            <div
              key={source.name}
              className="grid grid-cols-1 gap-x-6 gap-y-0.5 border-t border-border py-2.5 first:border-t-0 @min-[36rem]:grid-cols-[240px_minmax(0,1fr)]"
            >
              <dt className="text-small font-semibold text-fg">{source.name}</dt>
              <dd className="m-0 text-small text-fg-secondary">{source.text}</dd>
            </div>
          ))}
        </dl>
      </SettingsGroup>

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
    </SettingsBlock>
  )
}
