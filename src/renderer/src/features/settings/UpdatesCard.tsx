import { Download, RefreshCw } from 'lucide-react'
import type { UpdateState } from '@shared/domain/updates'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { Toggle } from '@renderer/components/Toggle'
import { useAppVersion } from '@renderer/app/useAppVersion'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
import { useUpdateState, useUpdateStep, useUpdateWindow } from '@renderer/features/updates/useUpdates'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { formatRelative } from '@renderer/lib/format'
import { useSetSetting, useSetting } from '@renderer/lib/queries'

const t = fr.settings.updates

function statusText(state: UpdateState | undefined): string {
  if (!state) return t.status.idle
  const version = state.release?.version ?? ''
  switch (state.status) {
    case 'unsupported':
      return t.status.unsupported
    case 'idle':
      return t.status.idle
    case 'checking':
      return t.status.checking
    case 'none':
      return t.status.none
    case 'available':
      return state.skipped ? t.status.skipped(version) : t.status.available(version)
    case 'downloading':
      return t.status.downloading(fr.shell.update.percent(String(Math.round(state.progress ?? 0))))
    case 'ready':
      return t.status.ready(version)
    case 'error':
      return fr.shell.update.errors[state.error ?? 'failed']
  }
}

/** New releases on GitHub (D-051): the check at launch, a check now, the window again. */
export function UpdatesCard() {
  const state = useUpdateState().data
  const step = useUpdateStep()
  const show = useUpdateWindow((s) => s.show)
  const version = useAppVersion()
  const autoCheck = useSetting('updates.autoCheck')
  const change = useSetSetting()

  const unsupported = state?.status === 'unsupported'
  const busy = state?.status === 'checking' || state?.status === 'downloading' || step.isPending
  const hasRelease =
    state?.release != null &&
    (state.status === 'available' || state.status === 'downloading' || state.status === 'ready')

  return (
    <SettingsBlock block="updates" title={t.title} description={t.description}>
      <SettingsGroup>
        <ControlRow label={t.toggle}>
          <Toggle
            checked={autoCheck}
            label={t.toggle}
            hideLabel
            showState
            disabled={change.isPending}
            onCheckedChange={(value) => {
              change.mutate({ key: 'updates.autoCheck', value }, { onError: notifyError })
            }}
          />
        </ControlRow>
        <ControlRow
          label={version.status === 'ready' ? fr.shell.version(version.version) : t.installed}
          hint={
            <span role="status" className="flex flex-col">
              <span>{statusText(state)}</span>
              {state?.checkedAt ? <span>{t.checkedAt(formatRelative(state.checkedAt))}</span> : null}
            </span>
          }
        >
          {hasRelease ? (
            <Button variant="outline" icon={<Download size={16} aria-hidden="true" />} onClick={show}>
              {t.show}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={unsupported || busy}
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => {
                step.mutate({ step: 'check' })
              }}
            >
              {t.check}
            </Button>
          )}
        </ControlRow>
      </SettingsGroup>
    </SettingsBlock>
  )
}
