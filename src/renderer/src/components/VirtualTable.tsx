import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Range } from '@tanstack/react-virtual'
import { useCallback, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { EmptyState } from '@renderer/components/EmptyState'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.components.display.table

export type VirtualTableColumn<Row> = {
  id: string
  header: string
  /** CSS grid track, e.g. « 2fr » or « 96px »; « minmax(0, 1fr) » by default. */
  width?: string
  /** Numeric column: tabular figures, aligned right. */
  numeric?: boolean
  cell: (row: Row) => ReactNode
}

type VirtualTableProps<Row> = {
  rows: readonly Row[]
  columns: readonly VirtualTableColumn<Row>[]
  getRowId: (row: Row) => string
  /** Accessible name of the list. */
  label: string
  /** Fixed row height in pixels. */
  rowHeight?: number
  /** Active row, when the parent controls it. */
  activeId?: string | null
  onActiveChange?: (id: string, row: Row) => void
  /** Enter or double click on a row. */
  onOpen?: (row: Row) => void
  /** Shown instead of the list when there is no row (an EmptyState by default). */
  empty?: ReactNode
  overscan?: number
  /** The table needs a bounded height (a class such as h-96 or a flex parent). */
  className?: string
}

/**
 * Virtualised list with configurable columns and fixed-height rows, exposed as a listbox:
 * Tab focuses it, Up and Down move the active row, Home, End, Page Up and Page Down jump,
 * Enter opens the row.
 */
export function VirtualTable<Row>({
  rows,
  columns,
  getRowId,
  label,
  rowHeight = 40,
  activeId,
  onActiveChange,
  onOpen,
  empty,
  overscan = 8,
  className,
}: VirtualTableProps<Row>) {
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const scrollRef = useRef<HTMLDivElement>(null)
  const pointerDown = useRef(false)
  const [innerActive, setInnerActive] = useState<string | null>(null)
  const currentId = activeId === undefined ? innerActive : activeId
  const activeIndex = currentId === null ? -1 : rows.findIndex((row) => getRowId(row) === currentId)

  // The active row stays rendered even when scrolled away, so aria-activedescendant always resolves.
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex < 0 || indexes.includes(activeIndex)) return indexes
      return [...indexes, activeIndex].sort((a, b) => a - b)
    },
    [activeIndex],
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler in this build
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
    rangeExtractor,
    useFlushSync: false,
  })

  const template = columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ')
  const optionId = (index: number) => `${baseId}-row-${index}`

  function activate(index: number) {
    const clamped = Math.min(Math.max(index, 0), rows.length - 1)
    const row = rows[clamped]
    if (row === undefined) return
    const id = getRowId(row)
    setInnerActive(id)
    if (id !== currentId) onActiveChange?.(id, row)
    // Fixed row height: bring the row into view without waiting for a measure.
    const element = scrollRef.current
    if (!element) return
    const top = clamped * rowHeight
    const bottom = top + rowHeight
    if (top < element.scrollTop) element.scrollTop = top
    else if (bottom > element.scrollTop + element.clientHeight)
      element.scrollTop = bottom - element.clientHeight
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const page = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? rowHeight) / rowHeight) - 1)
    switch (event.key) {
      case 'ArrowDown':
        activate(activeIndex < 0 ? 0 : activeIndex + 1)
        break
      case 'ArrowUp':
        activate(activeIndex < 0 ? 0 : activeIndex - 1)
        break
      case 'Home':
        activate(0)
        break
      case 'End':
        activate(rows.length - 1)
        break
      case 'PageDown':
        activate(activeIndex + page)
        break
      case 'PageUp':
        activate(activeIndex - page)
        break
      case 'Enter': {
        const row = rows[activeIndex]
        if (row === undefined) return
        onOpen?.(row)
        break
      }
      default:
        return
    }
    event.preventDefault()
  }

  if (rows.length === 0) {
    return (
      <div className={cn('flex min-h-0 flex-col', className)}>
        {empty ?? <EmptyState title={t.emptyTitle} description={t.emptyDescription} className="flex-1" />}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      {/* Visual header; screen readers get the column names inside each row. */}
      <div
        aria-hidden="true"
        className="grid h-8 shrink-0 items-center gap-4 border-b border-border px-4 text-caption font-medium tracking-[0.01em] text-fg-muted"
        style={{ gridTemplateColumns: template }}
      >
        {columns.map((column) => (
          <span key={column.id} className={cn('truncate', column.numeric && 'text-right')}>
            {column.header}
          </span>
        ))}
      </div>
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={() => {
          pointerDown.current = true
        }}
        onFocus={(event) => {
          // Keyboard focus lands on the first row; a click picks its own row instead.
          if (event.target === event.currentTarget && !pointerDown.current && activeIndex < 0) activate(0)
          pointerDown.current = false
        }}
        onBlur={() => {
          pointerDown.current = false
        }}
        className="relative min-h-0 flex-1 overflow-y-auto outline-offset-[-2px] select-none"
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]
            if (row === undefined) return null
            const active = item.index === activeIndex
            return (
              <div
                key={getRowId(row)}
                id={optionId(item.index)}
                role="option"
                aria-selected={active}
                aria-posinset={item.index + 1}
                aria-setsize={rows.length}
                onClick={() => {
                  activate(item.index)
                }}
                onDoubleClick={() => onOpen?.(row)}
                className={cn(
                  'absolute top-0 left-0 grid w-full cursor-pointer items-center gap-4 border-b border-border px-4 text-body',
                  active
                    ? 'bg-surface-2 text-fg shadow-[inset_2px_0_0_var(--color-accent)]'
                    : 'text-fg-secondary hover:bg-surface-2/60',
                )}
                style={{
                  height: rowHeight,
                  transform: `translateY(${item.start}px)`,
                  gridTemplateColumns: template,
                }}
              >
                {columns.map((column, columnIndex) => (
                  <div
                    key={column.id}
                    className={cn('min-w-0 truncate', column.numeric && 'nums text-right')}
                  >
                    {columnIndex > 0 ? <span className="sr-only">{t.cellPrefix(column.header)}</span> : null}
                    {column.cell(row)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
