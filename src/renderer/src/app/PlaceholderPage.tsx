import { navItem, type ScreenId } from '@renderer/app/navigation'
import { EmptyState } from '@renderer/components/EmptyState'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

export type PlaceholderScreen = Exclude<ScreenId, 'home' | 'recipes' | 'bar' | 'settings'>

/**
 * Provisional screen: its title and an empty state saying what it will do and in which
 * phase it arrives (section 14). No data at all.
 */
export function PlaceholderPage({ screen, className }: { screen: PlaceholderScreen; className?: string }) {
  const text = fr.shell.screens[screen]
  const Icon = navItem(screen).icon
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{text.eyebrow}</span>
        <h1 className="m-0 text-title font-semibold tracking-[-0.02em] text-fg">{text.title}</h1>
      </div>
      <EmptyState
        icon={<Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
        title={text.emptyTitle}
        description={text.emptyText}
        className="min-h-[320px] p-10"
      />
    </div>
  )
}
