import { Download, RefreshCw } from 'lucide-react'
import type { UpdateState } from '@shared/domain/updates'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Toggle } from '@renderer/components/Toggle'
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
  const autoCheck = useSetting('updates.autoCheck')
  const change = useSetSetting()

  const unsupported = state?.status === 'unsupported'
  const busy = state?.status === 'checking' || state?.status === 'downloading' || step.isPending
  const hasRelease =
    state?.release != null &&
    (state.status === 'available' || state.status === 'downloading' || state.status === 'ready')

  return (
    <Card aria-label={t.title} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{t.eyebrow}</span>
        <h2 className="m-0 text-body font-semibold text-fg">{t.title}</h2>
        <p className="m-0 text-small text-fg-secondary">{t.description}</p>
      </div>
      <Toggle
        checked={autoCheck}
        label={t.toggle}
        showState
        disabled={change.isPending}
        onCheckedChange={(value) => {
          change.mutate({ key: 'updates.autoCheck', value }, { onError: notifyError })
        }}
      />
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 flex-1 flex-col" role="status">
          <span className="text-small text-fg">{statusText(state)}</span>
          {state?.checkedAt ? (
            <span className="text-caption text-fg-muted">{t.checkedAt(formatRelative(state.checkedAt))}</span>
          ) : null}
        </div>
        {hasRelease ? (
          <Button
            size="sm"
            className="shrink-0"
            icon={<Download size={14} aria-hidden="true" />}
            onClick={show}
          >
            {t.show}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={unsupported || busy}
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => {
              step.mutate({ step: 'check' })
            }}
          >
            {t.check}
          </Button>
        )}
      </div>
    </Card>
  )
}
