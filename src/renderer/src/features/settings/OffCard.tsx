import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ControlRow } from '@renderer/components/ControlRow'
import { Toggle } from '@renderer/components/Toggle'
import { SettingsBlock, SettingsGroup } from '@renderer/features/settings/SettingsBlock'
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

/** The switch of the only network feature of Shakery; its credit is in « À propos ». */
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
    <SettingsBlock block="barcode" title={t.title} description={t.description}>
      <SettingsGroup>
        <ControlRow label={t.toggle} hint={t.toggleHint}>
          <Toggle
            checked={enabled}
            label={t.toggle}
            hideLabel
            showState
            disabled={change.isPending}
            onCheckedChange={(value) => {
              change.mutate(value)
            }}
          />
        </ControlRow>
      </SettingsGroup>
    </SettingsBlock>
  )
}
