import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import type { UpdateState } from '@shared/domain/updates'
import { notifyError } from '@renderer/features/shared/notify'
import { unwrap } from '@renderer/lib/ipc'

export const UPDATE_KEY = ['updates', 'status'] as const

/**
 * How often the state of the main is read: often while something moves, and every second
 * during the first half-minute, when the check of the launch starts. Rarely otherwise.
 */
function pollInterval(state: UpdateState | undefined, reads: number): number | false {
  if (!state || state.status === 'unsupported') return false
  if (state.status === 'checking' || state.status === 'downloading') return 500
  if (state.status === 'idle' && reads < 30) return 1000
  return 60_000
}

/** State of the updates, owned by the main process (D-051). No network request here. */
export function useUpdateState() {
  return useQuery({
    queryKey: UPDATE_KEY,
    queryFn: () => unwrap(window.shakery.updates.status()),
    refetchInterval: (query) => pollInterval(query.state.data, query.state.dataUpdateCount),
  })
}

type Step = 'check' | 'download' | 'install' | 'skip'

/** One step asked of the main; the state it answers replaces the one shown. */
export function useUpdateStep() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ step, version }: { step: Step; version?: string }): Promise<UpdateState> => {
      const updates = window.shakery.updates
      if (step === 'check') return unwrap(updates.check())
      if (step === 'download') return unwrap(updates.download())
      if (step === 'install') return unwrap(updates.install())
      return unwrap(updates.skip({ version: version ?? '' }))
    },
    onSuccess: (state) => {
      client.setQueryData(UPDATE_KEY, state)
    },
    onError: notifyError,
  })
}

type UpdateWindowState = {
  /** Opened by a button, or kept open while the user goes on in it. */
  held: boolean
  /** Moments the user closed: `available:0.2.0`, `ready:0.2.0`. */
  dismissed: readonly string[]
  show: () => void
  close: (moment: string | null) => void
}

export const useUpdateWindow = create<UpdateWindowState>()((set) => ({
  held: false,
  dismissed: [],
  show: () => {
    set({ held: true })
  },
  close: (moment) => {
    set((state) => ({
      held: false,
      dismissed: moment && !state.dismissed.includes(moment) ? [...state.dismissed, moment] : state.dismissed,
    }))
  },
}))

/**
 * The moment that opens the window by itself: a release not ignored, then the download
 * finished. Closed once, a moment does not come back before the next launch.
 */
export function updateMoment(state: UpdateState | undefined): string | null {
  if (!state?.release) return null
  if (state.status === 'available' && !state.skipped) return `available:${state.release.version}`
  if (state.status === 'ready') return `ready:${state.release.version}`
  return null
}
