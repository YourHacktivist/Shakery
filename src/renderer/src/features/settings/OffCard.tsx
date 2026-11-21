import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@renderer/components/Card'
import { Toggle } from '@renderer/components/Toggle'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

export const OFF_STATUS_KEY = ['off', 'status'] as const

/** Whether the barcode lookup may reach Open Food Facts (section 9). */
export function useOffEnabled(): boolean {
  const status = useQuery({
    queryKey: OFF_STATUS_KEY,
    queryFn: () => unwrap(window.shakery.off.status()),
  })
  return status.data?.enabled ?? false
}

/** The switch of the only network feature of Shakery. */
export function OffCard() {
  const t = fr.settings.off
  const queryClient = useQueryClient()
  const enabled = useOffEnabled()
  const change = useMutation({
    mutationFn: (value: boolean) => unwrap(window.shakery.off.setEnabled({ enabled: value })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: OFF_STATUS_KEY }),
    onError: notifyError,
  })

  return (
    <Card aria-label={t.title} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{t.eyebrow}</span>
        <h2 className="m-0 text-body font-semibold text-fg">{t.title}</h2>
        <p className="m-0 text-small text-fg-secondary">{t.description}</p>
      </div>
      <Toggle
        checked={enabled}
        label={t.toggle}
        showState
        disabled={change.isPending}
        onCheckedChange={(value) => {
          change.mutate(value)
        }}
      />
      <p className="m-0 text-caption text-fg-muted">{t.attribution}</p>
    </Card>
  )
}
