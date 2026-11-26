import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@renderer/lib/cn'

export type UnderlineTab<T extends string> = {
  value: T
  label: string
  /** A count shown after the label, in muted tabular figures (« Fiches 5 »). */
  count?: number
}

type UnderlineTabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. « Contenu de la collection ». */
  label: string
  tabs: readonly UnderlineTab<T>[]
  value: T
  onChange: (value: T) => void
  /** Prefix of the ids that tie each tab to its panel (see tabIds). */
  idPrefix: string
  className?: string
}

const STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 }

/** Ids of a tab and of its panel: the panel uses `panel` as id and `tab` in aria-labelledby. */
export function tabIds(idPrefix: string, value: string) {
  return { tab: `${idPrefix}-tab-${value}`, panel: `${idPrefix}-panel-${value}` }
}

/**
 * Tabs of a page, underlined by the copper hairline of the sidebar (D-057): the current one in
 * full text, the others in grey. Arrows, Home and End move between them and select.
 */
export function UnderlineTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  className,
}: UnderlineTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.value === value)
    const step = STEP[event.key]
    let next = -1
    if (step !== undefined) next = (current + step + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    const target = tabs[next]
    if (!target) return
    event.preventDefault()
    onChange(target.value)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn('flex items-stretch gap-6', className)}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value
        const ids = tabIds(idPrefix, tab.value)
        return (
          <button
            key={tab.value}
            id={ids.tab}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={ids.panel}
            tabIndex={selected ? 0 : -1}
            className={cn(
              'relative inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-sm text-body font-semibold whitespace-nowrap transition-colors duration-150 ease-out-soft',
              selected
                ? "text-fg after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent after:shadow-[0_0_10px_rgb(239_120_43/0.8)] after:content-['']"
                : 'text-fg-secondary hover:text-fg',
            )}
            onClick={() => {
              onChange(tab.value)
            }}
          >
            {tab.label}
            {tab.count === undefined ? null : (
              <span className="nums font-medium text-fg-muted">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
