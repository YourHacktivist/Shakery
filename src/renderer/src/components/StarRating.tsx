import { Star } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@renderer/lib/cn'

const STARS = [1, 2, 3, 4, 5] as const

type StarRatingProps = {
  label: string
  /** Null until rated. */
  value: number | null
  onChange: (value: number | null) => void
  /** Accessible name of one star, e.g. « 3 sur 5 ». */
  optionLabel: (value: number) => string
  hideLabel?: boolean
  className?: string
}

/**
 * Overall rating from 1 to 5 (section 10.6). Radio group: arrows move and check, a click on
 * the checked star clears it. The stars fill with copper up to the pointer, then scale in.
 */
export function StarRating({
  label,
  value,
  onChange,
  optionLabel,
  hideLabel = false,
  className,
}: StarRatingProps) {
  const labelId = useId()
  const groupRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  const tabbable = value ?? 1

  function select(next: number) {
    onChange(next)
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, star: number) {
    let target: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = star === 5 ? 1 : star + 1
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        target = star === 1 ? 5 : star - 1
        break
      case 'Home':
        target = 1
        break
      case 'End':
        target = 5
        break
      default:
        return
    }
    event.preventDefault()
    select(target)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span id={labelId} className={hideLabel ? 'sr-only' : 'text-small font-medium text-fg-secondary'}>
        {label}
      </span>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex items-center gap-1"
        onPointerLeave={() => {
          setHover(null)
        }}
      >
        {STARS.map((star) => {
          const lit = star <= shown
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={optionLabel(star)}
              tabIndex={star === tabbable ? 0 : -1}
              className="group/star flex size-8 cursor-pointer items-center justify-center rounded-field transition-colors duration-150 hover:bg-tint/5"
              onPointerEnter={() => {
                setHover(star)
              }}
              onClick={() => {
                if (value === star) onChange(null)
                else select(star)
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, star)
              }}
            >
              <Star
                size={20}
                strokeWidth={1.6}
                aria-hidden="true"
                className={cn(
                  'transition-[transform,color,fill] duration-200 ease-out-soft',
                  lit
                    ? 'scale-110 fill-accent text-accent drop-shadow-[0_0_6px_rgb(239_120_43/0.55)]'
                    : 'scale-100 fill-transparent text-fg-muted group-hover/star:text-fg-secondary',
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Read-only stars, for a list: « ★★★☆☆ », read « 3 sur 5 ». */
export function Stars({ value, label, size = 13 }: { value: number; label: string; size?: number }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {STARS.map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.6}
          aria-hidden="true"
          className={star <= value ? 'fill-accent text-accent' : 'fill-transparent text-fg-muted/60'}
        />
      ))}
    </span>
  )
}
