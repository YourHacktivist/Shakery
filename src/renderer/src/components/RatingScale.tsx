import { useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDelta } from '@renderer/lib/format'

export type RatingValue = -2 | -1 | 0 | 1 | 2

export const RATING_VALUES: readonly RatingValue[] = [-2, -1, 0, 1, 2]

const t = fr.components.display.rating

/** « −2 », « −1 », « 0 », « +1 », « +2 » with a true minus sign. */
function signed(value: RatingValue): string {
  return value === 0 ? '0' : formatDelta(value, 0)
}

type RatingScaleProps = {
  /** Criterion being rated, e.g. « Sucre »: the name of the radio group. */
  label: string
  /** Null until the criterion is rated. */
  value: RatingValue | null
  onChange: (value: RatingValue) => void
  disabled?: boolean
  /** Keeps the label for screen readers only, when the row already shows it. */
  hideLabel?: boolean
  className?: string
}

/**
 * Tasting scale from −2 to +2 (section 10.6): « trop peu », « juste », « trop ».
 * Keyboard as a radio group: Tab enters on the checked value, arrows move and check, Home and End jump.
 */
export function RatingScale({
  label,
  value,
  onChange,
  disabled = false,
  hideLabel = false,
  className,
}: RatingScaleProps) {
  const labelId = useId()
  const groupRef = useRef<HTMLDivElement>(null)
  const checkedIndex = value === null ? -1 : RATING_VALUES.indexOf(value)
  const tabbableIndex = checkedIndex === -1 ? 0 : checkedIndex

  function select(index: number) {
    const next = RATING_VALUES[index]
    if (next === undefined) return
    if (next !== value) onChange(next)
    const radios = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios?.[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = RATING_VALUES.length - 1
    let target: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        target = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        target = index === 0 ? last : index - 1
        break
      case 'Home':
        target = 0
        break
      case 'End':
        target = last
        break
      default:
        return
    }
    event.preventDefault()
    select(target)
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span id={labelId} className={hideLabel ? 'sr-only' : 'text-small font-medium text-fg-secondary'}>
        {label}
      </span>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        className="grid grid-cols-5 gap-1 rounded-field border border-border-strong bg-surface-1 p-1"
      >
        {RATING_VALUES.map((option, index) => {
          const checked = index === checkedIndex
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={t.option(signed(option), t.steps[index] ?? '')}
              tabIndex={index === tabbableIndex ? 0 : -1}
              disabled={disabled}
              onClick={() => {
                select(index)
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index)
              }}
              className={cn(
                'nums h-8 cursor-pointer rounded-[7px] text-small font-semibold transition-[color,background-color,box-shadow,transform] duration-150 ease-out-soft active:scale-95 disabled:cursor-not-allowed',
                checked
                  ? 'bg-accent-gradient text-accent-ink shadow-glow'
                  : 'text-fg-secondary hover:bg-surface-2 hover:text-fg disabled:text-fg-muted/60 disabled:hover:bg-transparent',
              )}
            >
              {signed(option)}
            </button>
          )
        })}
      </div>
      <div aria-hidden="true" className="grid grid-cols-3 text-caption text-fg-muted">
        <span>{t.low}</span>
        <span className="text-center">{t.middle}</span>
        <span className="text-right">{t.high}</span>
      </div>
    </div>
  )
}
