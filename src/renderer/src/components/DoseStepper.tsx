import { Minus, Plus } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { IconButton } from '@renderer/components/Button'
import { FieldLayout, fieldFrameClass, focusFieldInput, useFieldIds } from '@renderer/components/Input'
import { useNumberField } from '@renderer/components/NumberWithUnit'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'

const t = fr.components.forms

/** Wheel distance for one step: a mouse notch is about 100, a touchpad sends many small deltas. */
const WHEEL_STEP = 50
/** Pixels counted for one line when the wheel reports lines instead of pixels. */
const WHEEL_LINE = 40

type DoseStepperProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step' | 'size' | 'inputMode' | 'role'
> & {
  /** Accessible name, e.g. « Dose de Campari ». Hide it when the row already shows the ingredient. */
  label: string
  hideLabel?: boolean
  description?: ReactNode
  error?: ReactNode
  /** Dose in the displayed unit; null when the line has no dose yet. Never negative. */
  value: number | null
  onChange: (value: number | null) => void
  unit: string
  /** Step of the buttons, arrows and wheel (setting of the workshop, 2,5 by default). */
  step?: number
  max?: number
  /** Fixed number of decimals shown, one by default so that doses line up. */
  decimals?: number
  ref?: Ref<HTMLInputElement>
  /** Classes of the outer block (label, stepper and messages). */
  className?: string
}

function keepFocus(event: MouseEvent<HTMLButtonElement>) {
  // The input keeps the focus, so a click does not end the current entry.
  event.preventDefault()
}

/** Dose setting of the workshop: minus and plus buttons, arrows, wheel while focused, direct entry. */
export function DoseStepper({
  label,
  hideLabel = false,
  description,
  error,
  value,
  onChange,
  unit,
  step = 2.5,
  max,
  decimals = 1,
  id,
  disabled = false,
  className,
  ref,
  onFocus,
  onBlur,
  onKeyDown,
  'aria-describedby': describedByProp,
  ...rest
}: DoseStepperProps) {
  const field = useNumberField({ value, onChange, min: 0, max, step, decimals, unit })
  const message = error ?? (field.invalid ? t.number.invalid : undefined)
  const ids = useFieldIds({ id, description, error: message, describedBy: describedByProp })
  const frameRef = useRef<HTMLDivElement>(null)
  const wheelDistance = useRef(0)

  // The native wheel listener reads the latest step function through a ref, updated after
  // every commit: several wheel events can arrive before React re-renders.
  const stepRef = useRef(field.stepBy)
  useLayoutEffect(() => {
    stepRef.current = field.stepBy
  })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    // React wheel listeners are passive: a native one is needed to keep the page from scrolling.
    const listener = (event: WheelEvent) => {
      const input = frame.querySelector('input')
      if (disabled || !input || document.activeElement !== input) return
      event.preventDefault()
      wheelDistance.current += event.deltaMode === 0 ? event.deltaY : event.deltaY * WHEEL_LINE
      if (Math.abs(wheelDistance.current) < WHEEL_STEP) return
      stepRef.current(wheelDistance.current < 0 ? 1 : -1)
      wheelDistance.current = 0
    }
    frame.addEventListener('wheel', listener, { passive: false })
    return () => {
      frame.removeEventListener('wheel', listener)
    }
  }, [disabled])

  const stepText = formatNumber(step)
  const atMin = field.current === null || field.current <= 0
  const atMax = max !== undefined && field.current !== null && field.current >= max

  return (
    <FieldLayout
      inputId={ids.inputId}
      label={label}
      hideLabel={hideLabel}
      description={description}
      descriptionId={ids.descriptionId}
      error={message}
      errorId={ids.errorId}
      className={className}
    >
      <div
        ref={frameRef}
        className={cn(fieldFrameClass({ invalid: Boolean(message), disabled }), 'w-44 gap-0.5 px-[3px]')}
        onMouseDown={focusFieldInput}
      >
        <IconButton
          variant="ghost"
          size="sm"
          label={t.doseStepper.decrease(stepText, unit)}
          icon={<Minus size={16} aria-hidden="true" />}
          tabIndex={-1}
          disabled={disabled || atMin}
          onMouseDown={keepFocus}
          onClick={() => {
            field.stepBy(-1)
          }}
        />
        <input
          ref={ref}
          id={ids.inputId}
          disabled={disabled}
          aria-invalid={message ? true : undefined}
          aria-describedby={ids.describedBy}
          className="nums h-full min-w-0 flex-1 bg-transparent text-right text-body text-fg outline-none disabled:cursor-not-allowed"
          {...rest}
          {...field.inputProps}
          onChange={field.handleChange}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            field.handleFocus()
            onFocus?.(event)
          }}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            field.handleBlur()
            onBlur?.(event)
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            onKeyDown?.(event)
            if (!event.defaultPrevented) field.handleKeyDown(event)
          }}
        />
        <span aria-hidden="true" className="shrink-0 pr-1 text-small text-fg-muted">
          {unit}
        </span>
        <IconButton
          variant="ghost"
          size="sm"
          label={t.doseStepper.increase(stepText, unit)}
          icon={<Plus size={16} aria-hidden="true" />}
          tabIndex={-1}
          disabled={disabled || atMax}
          onMouseDown={keepFocus}
          onClick={() => {
            field.stepBy(1)
          }}
        />
      </div>
    </FieldLayout>
  )
}
