import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, SearchCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { toast } from '@renderer/components/Toast'
import { SettingCard } from '@renderer/features/settings/SettingCard'
import { BACKUPS_KEY } from '@renderer/features/settings/useBackupDirectory'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { formatRelative } from '@renderer/lib/format'
import { unwrap } from '@renderer/lib/ipc'
import { invalidateCatalog } from '@renderer/lib/queries'
import type { TrashItem } from '@shared/domain/trash'

const t = fr.settings.maintenance
const TRASH_KEY = ['trash'] as const

/** Search index, trash and reset: the « zone sensible » of section 10.14. */
export function MaintenanceCard() {
  const [open, setOpen] = useState<'trash' | 'reset' | null>(null)
  const close = () => {
    setOpen(null)
  }
  const rebuild = useMutation({
    mutationFn: () => unwrap(window.shakery.search.rebuild()),
    onSuccess: ({ count }) => {
      toast.show({ message: t.rebuilt(count) })
    },
    onError: notifyError,
  })

  return (
    <SettingCard eyebrow={t.eyebrow} title={t.title} description={t.description}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={<SearchCheck size={14} aria-hidden="true" />}
          disabled={rebuild.isPending}
          onClick={() => {
            rebuild.mutate()
          }}
        >
          {t.rebuild}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => {
            setOpen('trash')
          }}
        >
          {t.trash}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<RotateCcw size={14} aria-hidden="true" />}
          onClick={() => {
            setOpen('reset')
          }}
        >
          {t.reset}
        </Button>
      </div>
      <Dialog
        open={open === 'trash'}
        onClose={close}
        title={t.trashTitle}
        description={t.trashText}
        size="lg"
      >
        {open === 'trash' ? <TrashList /> : null}
      </Dialog>
      <Dialog
        open={open === 'reset'}
        onClose={close}
        title={t.resetTitle}
        description={t.resetText}
        size="sm"
      >
        {open === 'reset' ? <ResetForm onCancel={close} /> : null}
      </Dialog>
    </SettingCard>
  )
}

function TrashList() {
  const client = useQueryClient()
  const trash = useQuery({
    queryKey: TRASH_KEY,
    queryFn: () => unwrap(window.shakery.trash.list()),
    staleTime: 0,
  })
  const [confirming, setConfirming] = useState(false)
  const refresh = () =>
    Promise.all([client.invalidateQueries({ queryKey: TRASH_KEY }), invalidateCatalog(client)])
  const restore = useMutation({
    mutationFn: ({ kind, id }: TrashItem) => unwrap(window.shakery.trash.restore({ kind, id })),
    onSuccess: (_result, item) => {
      toast.show({ message: t.restored(item.title) })
      return refresh()
    },
    onError: notifyError,
  })
  const empty = useMutation({
    // The main process backs the notebook up first, and stops there if that fails.
    mutationFn: () => unwrap(window.shakery.trash.empty()),
    onSuccess: () => {
      setConfirming(false)
      toast.show({ message: t.emptied })
      return Promise.all([refresh(), client.invalidateQueries({ queryKey: BACKUPS_KEY })])
    },
    onError: notifyError,
  })

  if (!trash.data) return null
  const { items, total } = trash.data
  if (total === 0) return <p className="m-0 py-6 text-center text-body text-fg-secondary">{t.trashEmpty}</p>

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex max-h-[320px] list-none flex-col overflow-y-auto p-0">
        {items.map((item) => (
          <li
            key={`${item.kind}:${item.id}`}
            className="flex items-center justify-between gap-3 border-t border-border py-1.5 first:border-t-0"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body text-fg">{item.title}</span>
              <span className="text-caption text-fg-muted">
                {`${t.kinds[item.kind]} · ${formatRelative(item.deletedAt)}`}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t.restoreOf(item.title)}
              disabled={restore.isPending || empty.isPending}
              onClick={() => {
                restore.mutate(item)
              }}
            >
              {t.restore}
            </Button>
          </li>
        ))}
      </ul>
      {total > items.length ? (
        <p className="m-0 text-caption text-fg-muted">{t.more(total - items.length)}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {confirming ? (
          <>
            <p role="alert" className="m-0 w-full text-small text-fg">
              {t.emptyConfirm(total)}
            </p>
            <Button
              variant="ghost"
              data-autofocus=""
              onClick={() => {
                setConfirming(false)
              }}
            >
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={empty.isPending}
              onClick={() => {
                empty.mutate()
              }}
            >
              {t.emptyNow}
            </Button>
          </>
        ) : (
          <Button
            variant="danger"
            onClick={() => {
              setConfirming(true)
            }}
          >
            {t.empty}
          </Button>
        )}
      </div>
    </div>
  )
}

function ResetForm({ onCancel }: { onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const reset = useMutation({
    // The main process backs up, checks the copy, starts a new notebook, then reloads the window.
    mutationFn: () => unwrap(window.shakery.database.reset({ confirm: 'reset' })),
    onError: notifyError,
  })
  const confirmed = typed.trim().toLocaleUpperCase('fr') === t.resetWord

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (confirmed && !reset.isPending) reset.mutate()
      }}
    >
      <Input
        label={t.resetField}
        value={typed}
        autoComplete="off"
        data-autofocus=""
        onChange={(event) => {
          setTyped(event.target.value)
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" variant="danger" disabled={!confirmed || reset.isPending}>
          {t.resetNow}
        </Button>
      </div>
    </form>
  )
}
