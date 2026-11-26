import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { IconButton } from '@renderer/components/Button'
import { cn } from '@renderer/lib/cn'

export type MoreMenuItem = {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
  disabled?: boolean
  /** A destructive action, in red. */
  danger?: boolean
  /** A hairline above the item, to set it apart (a deletion after the rest). */
  separated?: boolean
}

type MoreMenuProps = {
  /** Accessible name and tooltip of the button, e.g. « Autres actions pour « Carte d'hiver » ». */
  label: string
  items: readonly MoreMenuItem[]
  size?: 'sm' | 'md'
  align?: 'start' | 'end'
  className?: string
}

/**
 * The actions that come back less often, behind a discreet « ⋯ » button (D-057): a row or a page
 * keeps only its frequent actions in sight. Not modal, as FilterPill: a modal menu injects a style
 * that the CSP refuses.
 */
export function MoreMenu({ label, items, size = 'sm', align = 'end', className }: MoreMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <IconButton
          variant="ghost"
          size={size}
          label={label}
          className={className}
          icon={<MoreHorizontal size={16} aria-hidden="true" />}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[200px] animate-pop-in rounded-nested border border-border-strong bg-surface-2 p-1 shadow-float"
        >
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separated ? <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" /> : null}
              <DropdownMenu.Item
                disabled={item.disabled}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-body outline-none data-[disabled]:cursor-default data-[disabled]:text-fg-muted',
                  item.danger
                    ? 'text-status-danger data-[highlighted]:bg-status-danger/12'
                    : 'text-fg data-[highlighted]:bg-accent/14',
                )}
                onSelect={item.onSelect}
              >
                {item.icon ? (
                  <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
                ) : null}
                <span className="truncate">{item.label}</span>
              </DropdownMenu.Item>
            </Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
