import * as Tooltip from '@radix-ui/react-tooltip'
import { ArrowRight, Keyboard, Milk, PanelLeftClose, PanelLeftOpen, RotateCcw, Wine } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { NAV_ITEMS, type NavItem } from '@renderer/app/navigation'
import { useOverlayStore, useSidebarStore } from '@renderer/app/stores'
import { useAppVersion } from '@renderer/app/useAppVersion'
import logoUrl from '@renderer/assets/logo-160.png'
import { IconButton } from '@renderer/components/Button'
import { DEFAULT_EXPIRY_WARNING_DAYS, ExpiryPill } from '@renderer/components/ExpiryPill'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { daysLeftFromNow } from '@renderer/lib/format'
import { useTonight } from '@renderer/features/shared/tonight'
import { usePreps, useTastings } from '@renderer/lib/queries'

const SCROLLBAR = '[scrollbar-color:var(--color-border-strong)_transparent] [scrollbar-width:thin]'

/** Height of a navigation entry plus the gap between two of them, for the sliding indicator. */
const ENTRY_PITCH = 34

/** Text that fades out while the sidebar folds; the width animation does the rest. */
const FADE = 'transition-opacity duration-200 ease-out-soft'

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

function NavEntry({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const label = fr.shell.nav[item.id]
  const Icon = item.icon
  return (
    <li>
      <SideTooltip label={label} enabled={collapsed}>
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'group/nav relative z-10 flex h-8 items-center gap-2.5 overflow-hidden rounded-field px-2 text-body font-medium whitespace-nowrap transition-colors duration-150 ease-out-soft',
              isActive ? 'text-fg' : 'text-fg-secondary hover:bg-[rgb(255_235_220/0.04)] hover:text-fg',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                  'shrink-0 transition-[color,transform] duration-200 ease-out-soft',
                  isActive ? 'text-accent' : 'group-hover/nav:translate-x-px',
                )}
              />
              <span className={cn('truncate', FADE, collapsed && 'opacity-0')}>{label}</span>
            </>
          )}
        </NavLink>
      </SideTooltip>
    </li>
  )
}

/** Index of the navigation entry of the current screen, or -1 (preparation mode, kit). */
function activeIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}

/** Copper pill under the active entry: it slides from one entry to the next (transform only). */
function ActiveIndicator({ index }: { index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 left-0 h-8 w-full rounded-field border border-accent/20 bg-[linear-gradient(90deg,rgb(239_120_43/0.16),rgb(239_120_43/0.03))] transition-[transform,opacity] duration-250 ease-out-soft',
        "before:absolute before:top-2 before:-left-px before:h-4 before:w-[3px] before:rounded-full before:bg-accent before:shadow-[0_0_10px_rgb(239_120_43/0.8)] before:content-['']",
        index < 0 && 'opacity-0',
      )}
      style={{ transform: `translateY(${String(Math.max(index, 0) * ENTRY_PITCH)}px)` }}
    />
  )
}

/** Small titled block under the navigation (section 10.3). */
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

/** Next steps still to test, from the tasting journal (section 10.3). */
function RetestBlock() {
  const t = fr.shell.side.retest
  const tastings = useTastings({ toRetest: true })
  const steps = (tastings.data ?? []).filter((note) => note.nextStep !== null).slice(0, 3)
  return (
    <SideBlock icon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />} title={t.title}>
      {steps.length === 0 ? (
        <p className="m-0 text-small leading-normal text-fg-secondary">{t.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {steps.map((note) => (
            <li key={note.id}>
              <Link
                to={`/recipes/${note.recipeId}`}
                className="flex flex-col rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-[rgb(255_235_220/0.04)]"
              >
                <span className="truncate text-small font-medium text-fg">{note.recipeName}</span>
                <span className="line-clamp-2 text-caption leading-snug text-fg-secondary">
                  {note.nextStep}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/journal"
              className="inline-flex items-center gap-1.5 rounded-sm px-1.5 text-caption font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
            >
              <span>{fr.journal.side.open}</span>
              <ArrowRight size={12} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </li>
        </ul>
      )}
    </SideBlock>
  )
}

/** Batches in use that expire soon or have expired (section 10.3). */
function PrepsBlock() {
  const t = fr.shell.side.preps
  const preps = usePreps()
  const watched = (preps.data ?? [])
    .flatMap((prep) =>
      prep.batches
        .filter((batch) => batch.status === 'active')
        .map((batch) => ({ prep, batch, days: daysLeftFromNow(batch.bestBefore) })),
    )
    .filter((entry) => entry.days !== null && entry.days <= DEFAULT_EXPIRY_WARNING_DAYS)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
  return (
    <SideBlock icon={<Milk size={14} strokeWidth={1.75} aria-hidden="true" />} title={t.title}>
      {watched.length === 0 ? (
        <p className="m-0 text-small leading-normal text-fg-secondary">{t.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {watched.slice(0, 3).map(({ prep, batch, days }) => (
            <li key={batch.id}>
              <Link
                to="/preps"
                className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-[rgb(255_235_220/0.04)]"
              >
                <span className="truncate text-small font-medium text-fg">{prep.name}</span>
                <ExpiryPill days={days} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SideBlock>
  )
}

function TonightCard() {
  const id = useId()
  const t = fr.shell.side.tonight
  const tonight = useTonight()
  const best = tonight.unlockers[0]
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-1.5 rounded-nested border border-border bg-[linear-gradient(160deg,rgb(161_56_23/0.22),rgb(26_19_16/0.9)_60%)] p-3"
    >
      <h2
        id={id}
        className="m-0 flex items-center gap-2 text-caption font-medium tracking-[0.01em] text-fg-muted"
      >
        <Wine size={14} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
        <span>{t.title}</span>
      </h2>
      {tonight.ready && (tonight.makeable > 0 || tonight.unlockers.length > 0) ? (
        <>
          <p className="m-0 text-small leading-normal text-fg">
            <span className="nums text-heading font-semibold text-copper">{tonight.makeable}</span>{' '}
            <span className="text-fg-secondary">
              {fr.workshop.bar.makeable(tonight.makeable).replace(/^\d+ /, '')}
            </span>
          </p>
          {best ? (
            <p className="m-0 text-caption leading-snug text-fg-muted">
              {fr.workshop.bar.unlock(best.name, best.recipes.length)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="m-0 text-small leading-normal text-fg-secondary">{t.empty}</p>
      )}
      <Link
        to="/bar"
        className="group/link inline-flex items-center gap-1.5 self-start rounded-sm text-small font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
      >
        <span>{t.action}</span>
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          className="transition-transform duration-200 ease-out-soft group-hover/link:translate-x-0.5"
        />
      </Link>
    </section>
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
 * Foldable sidebar (section 10.1): brand, navigation, side blocks, version. Folded, it
 * keeps the icons only; the state is remembered on this computer and Ctrl+B switches it.
 * The width is the only animated layout property of the interface (D-032).
 */
export function Sidebar({ className }: { className?: string }) {
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const openOverlay = useOverlayStore((state) => state.open)
  const { pathname } = useLocation()
  const t = fr.shell
  const toggleLabel = collapsed ? t.sidebar.expand : t.sidebar.collapse

  return (
    <aside
      aria-label={t.sidebar.label}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-[linear-gradient(180deg,rgb(255_235_220/0.02),rgb(255_235_220/0)_40%)] transition-[width] duration-250 ease-out-soft',
        collapsed ? 'w-[56px]' : 'w-[220px]',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-3 pt-4 pb-4 whitespace-nowrap">
        <span className="logo-halo flex size-8 shrink-0 items-center justify-center rounded-full">
          <img src={logoUrl} alt="" width={28} height={28} className="size-7" />
        </span>
        <span className={cn('flex min-w-0 flex-col gap-0.5', FADE, collapsed && 'opacity-0')}>
          <span className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-fg">
            {t.brand.name}
          </span>
          <span className="text-caption text-fg-muted">{t.brand.tagline}</span>
        </span>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-3 pb-4',
          SCROLLBAR,
        )}
      >
        <Tooltip.Provider delayDuration={250}>
          <nav aria-label={t.nav.label}>
            <ul className="relative m-0 flex list-none flex-col gap-0.5 p-0">
              <ActiveIndicator index={activeIndex(pathname)} />
              {NAV_ITEMS.map((item) => (
                <NavEntry key={item.id} item={item} collapsed={collapsed} />
              ))}
            </ul>
          </nav>
        </Tooltip.Provider>

        <div
          inert={collapsed}
          aria-hidden={collapsed || undefined}
          className={cn('flex w-[196px] flex-col gap-4', FADE, collapsed && 'opacity-0')}
        >
          <div className="flex flex-col gap-3 px-1">
            <RetestBlock />
            <PrepsBlock />
          </div>
          <TonightCard />
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border px-3.5 py-2">
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
          aria-keyshortcuts="Control+B"
          icon={
            collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />
            )
          }
          onClick={toggle}
        />
      </div>
    </aside>
  )
}
