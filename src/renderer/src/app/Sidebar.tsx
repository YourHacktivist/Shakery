import * as Tooltip from '@radix-ui/react-tooltip'
import { ChevronsLeft, ChevronsRight, Keyboard, PanelLeftClose } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  SIDEBAR_BOTTOM,
  SIDEBAR_GROUPS,
  SIDEBAR_TOP,
  type NavGroup,
  type NavItem,
} from '@renderer/app/navigation'
import { useOverlayStore, useSidebarStore } from '@renderer/app/stores'
import { useAppVersion } from '@renderer/app/useAppVersion'
import logoUrl from '@renderer/assets/logo-160.png'
import { IconButton, type ButtonSize } from '@renderer/components/Button'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { ariaKeyShortcut } from '@renderer/lib/shortcuts'

/** The button that closes the sidebar takes the focus back when it opens again. */
export const SIDEBAR_CLOSE_ID = 'sidebar-close'
/** The button of the top bar that opens it. */
export const SIDEBAR_OPEN_ID = 'sidebar-open'

/** The button just pressed leaves the screen: the one that undoes it takes the focus. */
export function focusNextFrame(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

/**
 * A label that folds away: it fades, shrinks to nothing and takes the gap that precedes it, so
 * the folded sidebar holds only its icons and nothing sticks out of it.
 */
const FOLD = 'transition-[opacity,max-width,margin] duration-200 ease-out-soft'
const FOLDED = '-ml-2.5 max-w-0 opacity-0'

const SCROLLBAR = '[scrollbar-color:var(--color-border-strong)_transparent] [scrollbar-width:thin]'

/** Text that fades out while the sidebar folds; the width animation does the rest. */
const FADE = 'transition-opacity duration-200 ease-out-soft'

/**
 * An entry of the navigation. A plain string: the tooltip trigger (Radix `asChild`) joins the
 * class names as text, so a NavLink class function would reach the DOM as its source code
 * (D-057). The active state is read from the `aria-current="page"` that NavLink sets.
 */
export const NAV_ENTRY_CLASS =
  'group/nav relative z-10 flex h-8 items-center gap-2.5 overflow-hidden rounded-field px-2 text-body font-medium whitespace-nowrap text-fg-secondary transition-colors duration-150 ease-out-soft hover:bg-tint/4 hover:text-fg aria-[current=page]:text-fg aria-[current=page]:hover:bg-transparent'

/** Copper pill of the active entry, with its lit edge on the left. */
const PILL = cn(
  'pointer-events-none rounded-field border border-accent/20 bg-[linear-gradient(90deg,rgb(239_120_43/0.16),rgb(239_120_43/0.03))]',
  "before:absolute before:top-2 before:-left-px before:h-4 before:w-[3px] before:rounded-full before:bg-accent before:shadow-[0_0_10px_rgb(239_120_43/0.8)] before:content-['']",
)

/** Label shown on the right of a folded sidebar entry, on hover and on keyboard focus. */
function SideTooltip({ label, enabled, children }: { label: string; enabled: boolean; children: ReactNode }) {
  return (
    <Tooltip.Root open={enabled ? undefined : false}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 animate-fade-in rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 text-small font-medium text-fg shadow-float"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

/**
 * `ownPill`: the entry draws its pill itself. Paramètres sits outside the list where the
 * sliding pill runs.
 */
function NavEntry({
  item,
  collapsed,
  ownPill = false,
}: {
  item: NavItem
  collapsed: boolean
  ownPill?: boolean
}) {
  const label = fr.shell.nav[item.id]
  const Icon = item.icon
  return (
    <li>
      <SideTooltip label={label} enabled={collapsed}>
        <NavLink to={item.path} end={item.path === '/'} className={NAV_ENTRY_CLASS}>
          {({ isActive }) => (
            <>
              {ownPill && isActive ? (
                <span aria-hidden="true" className={cn('absolute inset-0 -z-10', PILL)} />
              ) : null}
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                  'shrink-0 transition-[color,transform] duration-200 ease-out-soft',
                  isActive ? 'text-accent' : 'group-hover/nav:translate-x-px',
                )}
              />
              <span className={cn('truncate', FOLD, collapsed ? FOLDED : 'max-w-[170px]')}>{label}</span>
            </>
          )}
        </NavLink>
      </SideTooltip>
    </li>
  )
}

function NavList({
  items,
  collapsed,
  labelledBy,
  ownPill,
}: {
  items: readonly NavItem[]
  collapsed: boolean
  labelledBy?: string
  ownPill?: boolean
}) {
  return (
    <ul aria-labelledby={labelledBy} className="m-0 flex list-none flex-col gap-0.5 p-0">
      {items.map((item) => (
        <NavEntry key={item.id} item={item} collapsed={collapsed} ownPill={ownPill} />
      ))}
    </ul>
  )
}

/**
 * A titled group, in small capitals with a hairline (D-057). Folded, the title leaves its
 * hairline alone, at the same height, so the icons do not move.
 */
function NavGroupBlock({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const id = useId()
  return (
    <div>
      <p
        id={id}
        className={cn(
          'm-0 mb-1.5 flex h-4 items-center text-[10.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-fg-muted uppercase',
          "after:h-px after:min-w-0 after:flex-1 after:bg-border after:content-['']",
          collapsed ? 'px-1' : 'px-2',
        )}
      >
        <span
          className={cn(
            'overflow-hidden transition-[opacity,max-width,margin] duration-200 ease-out-soft',
            collapsed ? 'mr-0 max-w-0 opacity-0' : 'mr-2 max-w-[160px]',
          )}
        >
          {fr.shell.nav.groups[group.id]}
        </span>
      </p>
      <NavList items={group.items} collapsed={collapsed} labelledBy={id} />
    </div>
  )
}

/**
 * Where the copper pill stands: the active link, measured once the entries are laid out (the
 * group titles make the steps uneven). Hidden where no entry leads (guide, Révision).
 */
function useActivePill(list: RefObject<HTMLDivElement | null>, pathname: string, collapsed: boolean) {
  const [pill, setPill] = useState<{ top: number; shown: boolean } | null>(null)
  useLayoutEffect(() => {
    const active = list.current?.querySelector<HTMLElement>('a[aria-current="page"]')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the DOM after commit, before paint
    setPill((previous) => {
      if (active) {
        return previous?.top === active.offsetTop && previous.shown
          ? previous
          : { top: active.offsetTop, shown: true }
      }
      return previous && previous.shown ? { ...previous, shown: false } : previous
    })
  }, [list, pathname, collapsed])
  return pill
}

/** The pill slides from one entry to the next (transform only). */
function ActiveIndicator({ pill }: { pill: { top: number; shown: boolean } | null }) {
  if (!pill) return null
  return (
    <span
      aria-hidden="true"
      data-testid="nav-indicator"
      className={cn(
        'absolute top-0 left-0 h-8 w-full transition-[transform,opacity] duration-250 ease-out-soft',
        PILL,
        !pill.shown && 'opacity-0',
      )}
      style={{ transform: `translateY(${String(pill.top)}px)` }}
    />
  )
}

function CloseButton({ size = 'md' }: { size?: ButtonSize }) {
  const toggleClosed = useSidebarStore((state) => state.toggleClosed)
  return (
    <IconButton
      id={SIDEBAR_CLOSE_ID}
      variant="ghost"
      size={size}
      label={fr.shell.sidebar.close}
      aria-keyshortcuts={ariaKeyShortcut('sidebar')}
      icon={<PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />}
      onClick={() => {
        toggleClosed()
        focusNextFrame(SIDEBAR_OPEN_ID)
      }}
    />
  )
}

function VersionCaption({ collapsed }: { collapsed: boolean }) {
  const version = useAppVersion()
  return (
    <p
      data-testid="app-version"
      className={cn(
        'm-0 mr-auto min-w-0 truncate nums text-caption text-fg-muted',
        FADE,
        collapsed && 'opacity-0',
      )}
    >
      {version.status === 'ready'
        ? fr.shell.version(version.version)
        : version.status === 'error'
          ? fr.shell.versionUnknown
          : null}
    </p>
  )
}

/**
 * Sidebar (section 10.1, D-057): brand, Accueil, three titled groups, Paramètres at the foot,
 * then the version. Folded, it keeps the icons only; closed (D-047), nothing is left of it and
 * the top bar offers to open it. Ctrl+B closes and opens it. The width is the only animated
 * layout property of the interface (D-032).
 */
export function Sidebar({ className }: { className?: string }) {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const closed = useSidebarStore((state) => state.closed)
  const toggle = useSidebarStore((state) => state.toggle)
  const openOverlay = useOverlayStore((state) => state.open)
  const { pathname } = useLocation()
  const list = useRef<HTMLDivElement>(null)
  const pill = useActivePill(list, pathname, collapsed)
  const t = fr.shell
  const toggleLabel = collapsed ? t.sidebar.expand : t.sidebar.collapse

  return (
    <aside
      aria-label={t.sidebar.label}
      data-collapsed={collapsed ? 'true' : 'false'}
      inert={closed}
      className={cn(
        'flex h-full shrink-0 flex-col overflow-hidden bg-sidebar duration-250 ease-out-soft',
        // Hidden once the width is down, but shown at once when it opens, so it can take the focus.
        closed ? 'invisible w-0 transition-[width,visibility]' : 'border-r border-border transition-[width]',
        !closed && (collapsed ? 'w-[56px]' : 'w-[220px]'),
        className,
      )}
    >
      <div className="window-drag sidebar-brand group/brand flex h-12 shrink-0 items-center gap-2.5 px-3 whitespace-nowrap">
        <span className="logo-halo logo-shake flex size-8 shrink-0 items-center justify-center rounded-full">
          <img src={logoUrl} alt="" width={28} height={28} className="size-7" />
        </span>
        <span
          className={cn(
            'flex min-w-0 flex-col gap-0.5 overflow-hidden',
            FOLD,
            collapsed ? FOLDED : 'max-w-[170px]',
          )}
        >
          <span className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-fg">
            {t.brand.name}
          </span>
          <span className="text-caption text-fg-muted">{t.brand.tagline}</span>
        </span>
        {collapsed ? null : (
          <span className="ml-auto">
            <CloseButton />
          </span>
        )}
      </div>

      <Tooltip.Provider delayDuration={250}>
        <nav aria-label={t.nav.label} className="flex min-h-0 flex-1 flex-col">
          <div
            data-testid="nav-scroll"
            className={cn('min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-2 pb-4', SCROLLBAR)}
          >
            <div ref={list} className="relative flex flex-col gap-[18px]">
              <ActiveIndicator pill={pill} />
              <NavList items={SIDEBAR_TOP} collapsed={collapsed} />
              {SIDEBAR_GROUPS.map((group) => (
                <NavGroupBlock key={group.id} group={group} collapsed={collapsed} />
              ))}
            </div>
          </div>
          <div className="px-3 pb-2">
            <NavList items={SIDEBAR_BOTTOM} collapsed={collapsed} ownPill />
          </div>
        </nav>
      </Tooltip.Provider>

      {collapsed ? (
        <div className="flex justify-end border-t border-border px-3.5 pt-2">
          <CloseButton size="sm" />
        </div>
      ) : null}
      <div
        className={cn(
          'flex items-center justify-end gap-1 px-3.5 py-2',
          !collapsed && 'border-t border-border',
        )}
      >
        <VersionCaption collapsed={collapsed} />
        <span inert={collapsed} className={cn('flex shrink-0', FADE, collapsed && 'opacity-0')}>
          <IconButton
            variant="ghost"
            size="sm"
            label={t.sidebar.shortcuts}
            icon={<Keyboard size={16} strokeWidth={1.75} aria-hidden="true" />}
            aria-haspopup="dialog"
            aria-keyshortcuts="?"
            onClick={() => {
              openOverlay('shortcuts')
            }}
          />
        </span>
        <IconButton
          variant="ghost"
          size="sm"
          label={toggleLabel}
          icon={
            collapsed ? (
              <ChevronsRight size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            )
          }
          onClick={toggle}
        />
      </div>
    </aside>
  )
}
