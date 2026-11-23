import { Download, ExternalLink, RotateCw, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import type { UpdateState } from '@shared/domain/updates'
import { useOverlayStore } from '@renderer/app/stores'
import logoUrl from '@renderer/assets/logo-512.png'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { fr } from '@renderer/i18n/fr'
import { formatDate } from '@renderer/lib/format'
import { useSetting } from '@renderer/lib/queries'
import { updateMoment, useUpdateState, useUpdateStep, useUpdateWindow } from './useUpdates'

const t = fr.shell.update

type View = 'available' | 'downloading' | 'ready' | 'error'

function viewOf(state: UpdateState): View {
  if (state.status === 'downloading') return 'downloading'
  if (state.status === 'ready') return 'ready'
  if (state.status === 'error') return 'error'
  return 'available'
}

function percentText(value: number): string {
  return t.percent(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value))
}

/**
 * The window of a new release (D-051). It opens by itself at launch when GitHub has a
 * newer version, once the first-launch assistant is done and no other window is open,
 * then again when the download is over. « Plus tard » keeps it closed until the next launch.
 */
export function UpdateHost() {
  const state = useUpdateState().data
  const step = useUpdateStep()
  const held = useUpdateWindow((s) => s.held)
  const dismissed = useUpdateWindow((s) => s.dismissed)
  const show = useUpdateWindow((s) => s.show)
  const close = useUpdateWindow((s) => s.close)
  const onboarded = useSetting('onboarding.done')
  const otherOverlay = useOverlayStore((s) => s.current) !== null

  const moment = updateMoment(state)
  const due = moment !== null && !dismissed.includes(moment) && onboarded && !otherOverlay
  useEffect(() => {
    if (due && !held) show()
  }, [due, held, show])

  const release = state?.release ?? null
  if (!state || !release) return null
  const view = viewOf(state)
  const version = release.version
  const leave = () => {
    close(moment)
  }

  const title =
    view === 'downloading'
      ? t.downloadingTitle(version)
      : view === 'ready'
        ? t.readyTitle(version)
        : view === 'error'
          ? t.errorTitle
          : t.title(version)

  const description =
    view === 'available'
      ? [t.current(state.current), release.date === null ? null : t.published(formatDate(release.date))]
          .filter(Boolean)
          .join(' ')
      : view === 'downloading'
        ? t.downloadingNote
        : view === 'ready'
          ? t.readyNote
          : null

  const portable = state.mode === 'portable'
  const progress = state.progress ?? 0
  const installing = step.isPending && step.variables.step === 'install'

  return (
    <Dialog
      open={held}
      onClose={leave}
      size="md"
      title={
        <span className="flex items-center gap-3">
          <span className="logo-halo flex size-12 shrink-0 items-center justify-center rounded-full">
            <img src={logoUrl} alt="" className="size-10" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption font-medium tracking-[0.01em] text-accent">{t.eyebrow}</span>
            <span className="[overflow-wrap:anywhere]">{title}</span>
          </span>
        </span>
      }
      description={description}
      footer={
        view === 'available' ? (
          <>
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                step.mutate({ step: 'skip', version })
                leave()
              }}
            >
              {t.skip}
            </Button>
            <Button variant="outline" onClick={leave}>
              {t.later}
            </Button>
            {portable ? (
              <Button
                data-autofocus
                icon={<ExternalLink size={15} aria-hidden="true" />}
                onClick={() => {
                  step.mutate({ step: 'openRelease' })
                  leave()
                }}
              >
                {t.downloadPortable}
              </Button>
            ) : (
              <Button
                data-autofocus
                icon={<Download size={15} aria-hidden="true" />}
                onClick={() => {
                  show()
                  step.mutate({ step: 'download' })
                }}
              >
                {t.update}
              </Button>
            )}
          </>
        ) : view === 'downloading' ? (
          <Button
            variant="outline"
            onClick={() => {
              close(null)
            }}
          >
            {t.background}
          </Button>
        ) : view === 'ready' ? (
          <>
            <Button variant="outline" disabled={installing} onClick={leave}>
              {t.later}
            </Button>
            <Button
              data-autofocus
              disabled={installing}
              icon={<RotateCw size={15} aria-hidden="true" />}
              onClick={() => {
                step.mutate({ step: 'install' })
              }}
            >
              {installing ? t.restarting : t.restart}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={leave}>
              {t.close}
            </Button>
            <Button
              data-autofocus
              icon={<RotateCw size={15} aria-hidden="true" />}
              disabled={step.isPending}
              onClick={() => {
                show()
                step.mutate({ step: 'download' })
              }}
            >
              {t.retry}
            </Button>
          </>
        )
      }
    >
      {view === 'available' ? (
        <>
          <section className="flex flex-col gap-2" aria-label={t.notesTitle}>
            <h3 className="m-0 text-small font-semibold text-fg">{t.notesTitle}</h3>
            <div
              tabIndex={0}
              className="max-h-[36vh] overflow-y-auto rounded-field border border-border bg-surface-2 px-3 py-2.5 text-small leading-relaxed whitespace-pre-line text-fg-secondary [overflow-wrap:anywhere]"
            >
              {release.notes || t.noNotes}
            </div>
          </section>
          <p className="m-0 flex items-start gap-2 text-small text-fg-secondary">
            <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            <span>{portable ? t.portableNote : t.safeNote}</span>
          </p>
        </>
      ) : null}

      {view === 'downloading' ? (
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={t.downloadingTitle(version)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-accent-gradient transition-[width] duration-300"
              style={{ width: `${String(progress)}%` }}
            />
          </div>
          <span className="nums w-12 shrink-0 text-right text-small text-fg">{percentText(progress)}</span>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="m-0 text-small text-status-danger">
          {t.errors[state.error]}
        </p>
      ) : null}
    </Dialog>
  )
}
