import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group, e.g. « Affichage des créations ». */
  label: string
  /** Two or three choices. */
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

const NEXT_KEYS: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/** Switch between two or three views (« En cours », « Favoris »). Radio group: arrows move and select. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const placedRef = useRef(false)
  const selectedIndex = options.findIndex((option) => option.value === value)

  // The thumb slides under the selected choice (transform only). Placed without
  // animation the first time, then follows the selection and the size of the group.
  useLayoutEffect(() => {
    const group = groupRef.current
    const thumb = thumbRef.current
    if (!group || !thumb) return
    const place = () => {
      const button = group.querySelectorAll<HTMLButtonElement>('[role="radio"]')[selectedIndex]
      if (!button || button.offsetWidth === 0) {
        thumb.style.opacity = '0'
        return
      }
      const first = !placedRef.current
      if (first) thumb.style.transition = 'none'
      thumb.style.opacity = '1'
      thumb.style.width = `${String(button.offsetWidth)}px`
      thumb.style.transform = `translateX(${String(button.offsetLeft)}px)`
      if (first) {
        thumb.getBoundingClientRect()
        thumb.style.transition = ''
        placedRef.current = true
      }
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(place)
    observer.observe(group)
    return () => {
      observer.disconnect()
    }
  }, [selectedIndex, options])

  function select(index: number) {
    const option = options[index]
    if (!option) return
    if (option.value !== value) onChange(option.value)
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || options.length === 0) return
    const from = selectedIndex === -1 ? 0 : selectedIndex
    const move = NEXT_KEYS[event.key]
    let target: number | undefined
    if (move !== undefined) target = (from + move + options.length) % options.length
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = options.length - 1
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative inline-flex gap-1 rounded-nested border border-border bg-surface-1 p-1',
        disabled && 'opacity-55',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      <span
        ref={thumbRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-[7px] border border-border-strong bg-surface-3 opacity-0 shadow-thumb transition-[transform,width,opacity] duration-200 ease-out-soft"
      />
      {options.map((option, index) => {
        const checked = option.value === value
        // Roving focus: only the selected choice (or the first one) is in the tab order.
        const focusable = checked || (selectedIndex === -1 && index === 0)
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={focusable ? 0 : -1}
            disabled={disabled}
            className={cn(
              'relative inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] px-3.5 py-2 text-small font-semibold whitespace-nowrap transition-colors duration-150 ease-out-soft select-none disabled:cursor-not-allowed',
              checked ? 'text-fg' : 'text-fg-muted hover:text-fg-secondary',
            )}
            onClick={() => {
              select(index)
            }}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
