import { Plus, Search, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { ThemeToggle } from '@renderer/app/ThemeToggle'
import { Button } from '@renderer/components/Button'
import { Kbd } from '@renderer/components/Kbd'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { ariaKeyShortcut, shortcutText } from '@renderer/lib/shortcuts'

/**
 * Top bar of every screen: search (opens the palette), quick idea, theme, settings. It is
 * also the title bar: its empty parts move the window, the window buttons sit on its right.
 */
export function TopBar({ className }: { className?: string }) {
  const openOverlay = useOverlayStore((state) => state.open)
  const t = fr.shell.topbar

  return (
    <header aria-label={t.label} className={cn('window-drag flex items-center gap-2', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts={ariaKeyShortcut('palette')}
        onClick={() => {
          openOverlay('palette')
        }}
        className="flex h-8 min-w-0 flex-[1_1_320px] cursor-pointer items-center gap-2 rounded-field border border-border-strong bg-surface-1 px-2.5 text-left font-sans text-body text-fg-muted transition-colors duration-150 ease-out-soft hover:bg-surface-2 hover:text-fg-secondary"
      >
        <Search size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t.search}</span>
        <span aria-hidden="true">
          <Kbd>{shortcutText('palette')}</Kbd>
        </span>
      </button>
      <Button
        icon={<Plus size={14} strokeWidth={2} aria-hidden="true" />}
        aria-haspopup="dialog"
        aria-keyshortcuts={ariaKeyShortcut('quickIdea')}
        onClick={() => {
          openOverlay('quickIdea')
        }}
        className="gap-2"
      >
        {t.quickIdea}
        <span aria-hidden="true">
          <Kbd tone="onAccent">{shortcutText('quickIdea')}</Kbd>
        </span>
      </Button>
      <ThemeToggle />
      <Link
        to="/settings"
        aria-label={t.settings}
        title={t.settings}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-field border border-border-strong text-fg transition-colors duration-150 ease-out-soft hover:bg-surface-2"
      >
        <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </header>
  )
}
