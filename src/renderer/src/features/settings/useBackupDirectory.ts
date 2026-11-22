import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifyError } from '@renderer/features/shared/notify'
import { unwrap } from '@renderer/lib/ipc'

export const BACKUPS_KEY = ['backups'] as const

/** The backup folder and the two ways to change it, both in the main process (section 12.3). */
export function useBackupDirectory() {
  const client = useQueryClient()
  const directory = useQuery({
    queryKey: [...BACKUPS_KEY, 'directory'],
    queryFn: () => unwrap(window.shakery.backups.directory()),
  })
  const refresh = () => client.invalidateQueries({ queryKey: BACKUPS_KEY })
  const choose = useMutation({
    mutationFn: () => unwrap(window.shakery.backups.chooseDirectory()),
    onSuccess: refresh,
    onError: notifyError,
  })
  const reset = useMutation({
    mutationFn: () => unwrap(window.shakery.backups.useDefaultDirectory()),
    onSuccess: refresh,
    onError: notifyError,
  })
  return {
    directory: directory.data,
    busy: choose.isPending || reset.isPending,
    choose: () => {
      choose.mutate()
    },
    reset: () => {
      reset.mutate()
    },
  }
}
