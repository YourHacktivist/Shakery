import { Moon, Sun } from 'lucide-react'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { revealTheme } from '@renderer/lib/appearance'
import { useSetSetting, useSetting } from '@renderer/lib/queries'

/** Dark or light, one click away on every screen (D-038). */
export function ThemeToggle() {
  const theme = useSetting('appearance.theme')
  const change = useSetSetting()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = fr.shell.topbar.theme[next]
  const Icon = next === 'light' ? Sun : Moon

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={change.isPending}
      onClick={(event) => {
        // The centre of the button, so that the keyboard gets the same reveal as the mouse.
        const box = event.currentTarget.getBoundingClientRect()
        const origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
        revealTheme(next, origin)
        change.mutate(
          { key: 'appearance.theme', value: next },
          {
            onError: (error) => {
              revealTheme(theme, origin)
              notifyError(error)
            },
          },
        )
      }}
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-field border border-border-strong text-fg transition-colors duration-150 ease-out-soft hover:bg-surface-2"
    >
      <Icon key={next} size={16} strokeWidth={1.75} aria-hidden="true" className="animate-turn-in" />
    </button>
  )
}
