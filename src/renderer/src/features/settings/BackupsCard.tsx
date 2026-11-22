import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { SettingCard } from '@renderer/features/settings/SettingCard'
import { BACKUPS_KEY, useBackupDirectory } from '@renderer/features/settings/useBackupDirectory'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'
import { useSetSetting, useSetting } from '@renderer/lib/queries'
import type { BackupSummary } from '@shared/domain/health'

/** Backups shown for a restore; the older ones stay in the folder. */
const SHOWN = 6
const FREQUENCY_HOURS = [6, 12, 24, 72, 168]
const KEPT_DAYS = [7, 14, 30, 60]
const KEPT_WEEKS = [0, 4, 8, 12, 26, 52]

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Folder, backup now, restore with a confirmation (sections 10.14 and 12.3). */
export function BackupsCard() {
  const t = fr.settings.backups
  const client = useQueryClient()
  const folder = useBackupDirectory()
  const frequency = useSetting('backup.frequencyHours')
  const days = useSetting('backup.keepDaily')
  const weeks = useSetting('backup.keepWeekly')
  const { mutate: change } = useSetSetting()
  const selects = [
    {
      key: 'backup.frequencyHours',
      value: frequency,
      values: FREQUENCY_HOURS,
      name: t.frequency,
      label: t.every,
    },
    { key: 'backup.keepDaily', value: days, values: KEPT_DAYS, name: t.keepDaily, label: t.keptDays },
    { key: 'backup.keepWeekly', value: weeks, values: KEPT_WEEKS, name: t.keepWeekly, label: t.keptWeeks },
  ] as const
  const [restoring, setRestoring] = useState<BackupSummary | null>(null)
  const list = useQuery({
    queryKey: [...BACKUPS_KEY, 'list'],
    queryFn: () => unwrap(window.shakery.backups.list()),
  })
  const create = useMutation({
    mutationFn: () => unwrap(window.shakery.backups.create()),
    onSuccess: () => {
      toast.show({ message: t.created })
      return client.invalidateQueries({ queryKey: BACKUPS_KEY })
    },
    onError: notifyError,
  })
  const restore = useMutation({
    // The main process saves the current notebook first, then reloads the window.
    mutationFn: (id: string) => unwrap(window.shakery.backups.restore({ id })),
    onError: notifyError,
  })
  const backups = (list.data ?? []).filter((backup) => backup.integrity === 'ok').slice(0, SHOWN)

  return (
    <SettingCard eyebrow={t.eyebrow} title={t.title} description={t.description}>
      {folder.directory ? (
        <p className="m-0 rounded-nested border border-border bg-surface-2 px-3 py-2 text-small break-all text-fg">
          {folder.directory.directory}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<Save size={14} aria-hidden="true" />}
          disabled={create.isPending}
          onClick={() => {
            create.mutate()
          }}
        >
          {t.create}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<FolderOpen size={14} aria-hidden="true" />}
          disabled={folder.busy}
          onClick={folder.choose}
        >
          {t.choose}
        </Button>
        {folder.directory && !folder.directory.isDefault ? (
          <Button variant="ghost" size="sm" disabled={folder.busy} onClick={folder.reset}>
            {t.useDefault}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {selects.map((select) => (
          <Select
            key={select.key}
            className={select.key === 'backup.frequencyHours' ? 'col-span-2' : undefined}
            label={select.name}
            value={String(select.value)}
            options={[...new Set([...select.values, select.value])]
              .sort((a, b) => a - b)
              .map((value) => ({ value: String(value), label: select.label(value) }))}
            onChange={(event) => {
              change({ key: select.key, value: Number(event.target.value) }, { onError: notifyError })
            }}
          />
        ))}
      </div>
      {backups.length > 0 ? (
        <ul className="m-0 flex list-none flex-col border-t border-border p-0 pt-1">
          {backups.map((backup) => {
            const when = dateTime.format(backup.createdAt)
            return (
              <li key={backup.id} className="flex items-center justify-between gap-3 py-1">
                <span className="nums min-w-0 text-small text-fg">
                  {when} <span className="text-fg-muted">{t.reasons[backup.reason]}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t.restoreOf(when)}
                  onClick={() => {
                    setRestoring(backup)
                  }}
                >
                  {t.restore}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <Dialog
        open={restoring !== null}
        onClose={() => {
          setRestoring(null)
        }}
        title={t.confirmTitle}
        description={restoring ? t.confirmText(dateTime.format(restoring.createdAt)) : undefined}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              data-autofocus=""
              onClick={() => {
                setRestoring(null)
              }}
            >
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={restore.isPending}
              onClick={() => {
                if (restoring) restore.mutate(restoring.id)
              }}
            >
              {t.restore}
            </Button>
          </>
        }
      />
    </SettingCard>
  )
}
