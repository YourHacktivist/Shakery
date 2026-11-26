import { CircleHelp, PanelLeftOpen, Plus, Search } from 'lucide-react'
import { useLocation } from 'react-router'
import { helpPlaceOf, useHelpStore } from '@renderer/app/help'
import { focusNextFrame, SIDEBAR_CLOSE_ID, SIDEBAR_OPEN_ID } from '@renderer/app/Sidebar'
import { useOverlayStore, useSidebarStore } from '@renderer/app/stores'
import logoUrl from '@renderer/assets/logo-160.png'
import { Button } from '@renderer/components/Button'
import { Kbd } from '@renderer/components/Kbd'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { ariaKeyShortcut, shortcutText } from '@renderer/lib/shortcuts'

/** The only way back by mouse once the sidebar is closed (D-047): the logo, and what it does. */
function OpenSidebarButton() {
  const toggleClosed = useSidebarStore((state) => state.toggleClosed)
  const t = fr.shell.sidebar
  return (
    <Button
      id={SIDEBAR_OPEN_ID}
      variant="outline"
      title={t.open}
      aria-keyshortcuts={ariaKeyShortcut('sidebar')}
      icon={<img src={logoUrl} alt="" width={20} height={20} className="size-5" />}
      onClick={() => {
        toggleClosed()
        focusNextFrame(SIDEBAR_CLOSE_ID)
      }}
    >
      {t.menu}
      <PanelLeftOpen size={14} strokeWidth={1.75} aria-hidden="true" className="text-fg-secondary" />
    </Button>
  )
}

/**
 * Top bar of every screen (D-057): search (opens the palette), quick idea as a discreet button,
 * help. The theme and the settings live in Paramètres only. It is also the title bar: its empty
 * parts move the window, the window buttons sit on its right.
 */
export function TopBar({ className }: { className?: string }) {
  const openOverlay = useOverlayStore((state) => state.open)
  const sidebarClosed = useSidebarStore((state) => state.closed)
  const openHelp = useHelpStore((state) => state.open)
  const { pathname } = useLocation()
  const t = fr.shell.topbar

  return (
    <header aria-label={t.label} className={cn('window-drag flex items-center gap-2', className)}>
      {sidebarClosed ? <OpenSidebarButton /> : null}
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
        variant="outline"
        icon={<Plus size={15} strokeWidth={2} aria-hidden="true" />}
        aria-haspopup="dialog"
        aria-keyshortcuts={ariaKeyShortcut('quickIdea')}
        onClick={() => {
          openOverlay('quickIdea')
        }}
        className="gap-2"
      >
        {t.quickIdea}
        <span aria-hidden="true">
          <Kbd>{shortcutText('quickIdea')}</Kbd>
        </span>
      </Button>
      <Button
        variant="outline"
        icon={<CircleHelp size={15} strokeWidth={1.75} aria-hidden="true" />}
        aria-haspopup="dialog"
        aria-keyshortcuts={ariaKeyShortcut('screenHelp')}
        title={`${fr.shell.shortcuts.items.screenHelp} (${shortcutText('screenHelp')})`}
        onClick={() => {
          openHelp(helpPlaceOf(pathname, null))
        }}
      >
        {t.help}
      </Button>
    </header>
  )
}
