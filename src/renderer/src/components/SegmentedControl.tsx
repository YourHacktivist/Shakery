import { useRef, type KeyboardEvent, type ReactNode } from 'react'
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
  const selectedIndex = options.findIndex((option) => option.value === value)

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
        'inline-flex gap-1 rounded-nested border border-border bg-surface-1 p-1',
        disabled && 'opacity-55',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
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
              'inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-small font-semibold whitespace-nowrap transition-colors duration-150 ease-out-soft select-none disabled:cursor-not-allowed',
              checked ? 'bg-surface-2 text-fg' : 'bg-transparent text-fg-muted hover:text-fg-secondary',
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
