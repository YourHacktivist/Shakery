import * as Tooltip from '@radix-ui/react-tooltip'
import { ArrowRight, Keyboard, Milk, PanelLeftClose, PanelLeftOpen, RotateCcw, Wine } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { NAV_ITEMS, type NavItem } from '@renderer/app/navigation'
import { useOverlayStore, useSidebarStore } from '@renderer/app/stores'
import { useAppVersion } from '@renderer/app/useAppVersion'
import logoUrl from '@renderer/assets/logo-160.png'
import { IconButton } from '@renderer/components/Button'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const SCROLLBAR = '[scrollbar-color:var(--color-border-strong)_transparent] [scrollbar-width:thin]'

/** Label shown on the right of a folded sidebar entry, on hover and on keyboard focus. */
function SideTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 animate-fade-in rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 text-small font-medium text-fg shadow-[0_8px_24px_rgb(0_0_0/0.4)]"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function NavEntry({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const label = fr.shell.nav[item.id]
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-field border text-body font-medium transition-colors duration-150 ease-out-soft',
          collapsed ? 'w-10 justify-center' : 'px-3',
          isActive
            ? 'border-border bg-surface-2 text-fg'
            : 'border-transparent text-fg-secondary hover:bg-surface-2/60 hover:text-fg',
        )
      }
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
    </NavLink>
  )
  return <li>{collapsed ? <SideTooltip label={label}>{link}</SideTooltip> : link}</li>
}

/** Small titled block under the navigation (section 10.3), here in its empty state. */
function SideBlock({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h2
        id={id}
        className="m-0 flex items-center gap-2 text-caption font-medium tracking-[0.01em] text-fg-muted"
      >
        {icon}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  )
}

function TonightCard() {
  const id = useId()
  const t = fr.shell.side.tonight
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-nested bg-surface-2 p-4">
      <h2
        id={id}
        className="m-0 flex items-center gap-2 text-caption font-medium tracking-[0.01em] text-fg-muted"
      >
        <Wine size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>{t.title}</span>
      </h2>
      <p className="m-0 text-small leading-normal text-fg-secondary">{t.empty}</p>
      <Link
        to="/bar"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-small font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
      >
        <span>{t.action}</span>
        <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  )
}

function VersionCaption({ collapsed }: { collapsed: boolean }) {
  const version = useAppVersion()
  return (
    <p
      data-testid="app-version"
      className={cn('m-0 nums text-caption text-fg-muted', collapsed && 'text-center leading-tight')}
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
 * Foldable sidebar (section 10.1): brand, navigation, empty side blocks, version.
 * Folded, it keeps the icons only; the state is remembered on this computer.
 */
export function Sidebar({ className }: { className?: string }) {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const openOverlay = useOverlayStore((state) => state.open)
  const t = fr.shell
  const toggleLabel = collapsed ? t.sidebar.expand : t.sidebar.collapse

  // IconButton already shows its label as a native tooltip, folded or not.
  const shortcutsButton = (
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
  )
  const toggleButton = (
    <IconButton
      variant="ghost"
      size="sm"
      label={toggleLabel}
      icon={
        collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />
        )
      }
      onClick={toggle}
    />
  )

  return (
    <aside
      aria-label={t.sidebar.label}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border',
        collapsed ? 'w-[72px]' : 'w-[248px]',
        className,
      )}
    >
      <div className={cn('flex items-center gap-3 pt-6 pb-6', collapsed ? 'justify-center px-4' : 'px-6')}>
        <div className="logo-halo flex size-10 shrink-0 items-center justify-center rounded-full">
          <img src={logoUrl} alt="" width={36} height={36} className="size-9" />
        </div>
        <div className={cn('flex min-w-0 flex-col gap-0.5', collapsed && 'sr-only')}>
          <span className="text-[18px] leading-tight font-semibold tracking-[-0.01em] text-fg">
            {t.brand.name}
          </span>
          <span className="text-caption text-fg-muted">{t.brand.tagline}</span>
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6',
          collapsed && 'items-center',
          SCROLLBAR,
        )}
      >
        <nav aria-label={t.nav.label}>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {NAV_ITEMS.map((item) => (
              <NavEntry key={item.id} item={item} collapsed={collapsed} />
            ))}
          </ul>
        </nav>

        {collapsed ? null : (
          <>
            <div className="flex flex-col gap-4 px-2">
              <SideBlock
                icon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />}
                title={t.side.retest.title}
              >
                <p className="m-0 text-small leading-normal text-fg-secondary">{t.side.retest.empty}</p>
              </SideBlock>
              <SideBlock
                icon={<Milk size={14} strokeWidth={1.75} aria-hidden="true" />}
                title={t.side.preps.title}
              >
                <p className="m-0 text-small leading-normal text-fg-secondary">{t.side.preps.empty}</p>
              </SideBlock>
            </div>
            <TonightCard />
          </>
        )}
      </div>

      <div
        className={cn(
          'flex gap-2 border-t border-border py-3',
          collapsed ? 'flex-col items-center px-2' : 'items-center justify-between pr-4 pl-6',
        )}
      >
        <VersionCaption collapsed={collapsed} />
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          {shortcutsButton}
          {toggleButton}
        </div>
      </div>
    </aside>
  )
}
