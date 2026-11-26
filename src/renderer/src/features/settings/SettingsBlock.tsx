import type { ReactNode } from 'react'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { cn } from '@renderer/lib/cn'

/** Ids of the blocks of the settings, in the order of the page and of its table of contents. */
export const SETTINGS_BLOCKS = [
  'appearance',
  'backups',
  'transfer',
  'calculation',
  'print',
  'barcode',
  'updates',
  'about',
] as const

export type SettingsBlockId = (typeof SETTINGS_BLOCKS)[number]

/** Id of the element of a block, the target of its entry in the table of contents. */
export function blockElementId(block: SettingsBlockId): string {
  return `settings-${block}`
}

/**
 * A block of the settings (D-057): its title in copper small capitals with a hairline, one sentence
 * on what it is for, then its rows on a light ground without border. A region named by its title.
 */
export function SettingsBlock({
  block,
  title,
  description,
  children,
}: {
  block: SettingsBlockId
  title: string
  description?: string
  children: ReactNode
}) {
  const id = blockElementId(block)
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      data-settings-block={block}
      className="flex scroll-mt-2 flex-col outline-none"
    >
      <SectionTitle id={`${id}-title`} className="mb-2">
        {title}
      </SectionTitle>
      {description ? <p className="m-0 mb-3 text-small text-fg-secondary">{description}</p> : null}
      <div className="@container flex flex-col rounded-card bg-surface-1/72 px-5 pt-1 pb-1">{children}</div>
    </section>
  )
}

/**
 * Rows of a block under a title in grey small capitals, with an optional note before them. The
 * first row has no hairline above it (ControlRow).
 */
export function SettingsGroup({
  title,
  note,
  children,
}: {
  title?: string
  note?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col pt-4 [&+&]:pt-[22px]">
      {title ? (
        <SectionTitle as="h3" tone="muted" className="mb-0.5">
          {title}
        </SectionTitle>
      ) : null}
      {note ? <p className="m-0 mt-1.5 mb-1 text-small text-fg-muted">{note}</p> : null}
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

/**
 * Fields that share one grid of four columns (two in a narrow window), so that they line up from
 * one group to the next (D-057). A hairline separates them from a row above.
 */
export function SettingsFields({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5 pb-4 first:border-t-0 first:pt-2.5 @min-[36rem]:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
