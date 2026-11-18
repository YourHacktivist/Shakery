import {
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import {
  FieldLayout,
  fieldFrameClass,
  fieldInputClass,
  focusFieldInput,
  useFieldIds,
} from '@renderer/components/Input'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'

const t = fr.components.forms.number

const DECIMAL = /^[-−]?(\d+([.,]\d*)?|[.,]\d+)$/
/** Start of a number being typed (« − », « , »): neither a value nor an error yet. */
const PARTIAL = /^[-−]?[.,]?$/

/**
 * Reads a number typed the French way: « 22,5 », « 22.5 », « 1 000 », « −3 ».
 * Returns null for an empty entry and undefined when the text is not a number.
 */
export function parseDecimal(text: string): number | null | undefined {
  const compact = text.replace(/\s+/g, '')
  if (compact === '') return null
  if (!DECIMAL.test(compact)) return undefined
  const value = Number(compact.replace('−', '-').replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

/** Drops floating point noise such as 0.30000000000000004. */
function cleanFloat(value: number): number {
  return Number(value.toFixed(6))
}

type NumberFieldOptions = {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step: number
  /** Fixed number of decimals shown; up to two by default. */
  decimals?: number
  unit?: string
}

type NumberFieldInputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'type'
  | 'inputMode'
  | 'role'
  | 'autoComplete'
  | 'value'
  | 'aria-valuenow'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-valuetext'
>

/**
 * State of a number field shared by NumberWithUnit and DoseStepper. While the field has focus the
 * typed text is kept as is; the parent receives a number (clamped to min and max) or null.
 */
export function useNumberField({ value, onChange, min, max, step, decimals, unit }: NumberFieldOptions) {
  const [draft, setDraft] = useState<string | null>(null)

  const display = (next: number | null) => (next === null ? '' : formatNumber(next, decimals))
  const clamp = (next: number) =>
    cleanFloat(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, next)))

  const parsed = draft === null ? value : parseDecimal(draft)
  const invalid = draft !== null && parsed === undefined && !PARTIAL.test(draft.replace(/\s+/g, ''))
  /** Last valid number: what the arrows and buttons start from. */
  const current = parsed === undefined ? value : parsed

  /** Moves by `count` steps, snapping to the step grid: 23 then up with a step of 2,5 gives 25. */
  function stepBy(count: number) {
    const ratio = (current ?? 0) / step
    const index = count > 0 ? Math.floor(ratio + 1e-9) + count : Math.ceil(ratio - 1e-9) + count
    const next = clamp(index * step)
    if (next !== value) onChange(next)
    if (draft !== null) setDraft(display(next))
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value
    setDraft(text)
    const next = parseDecimal(text)
    if (next === undefined) return
    const clamped = next === null ? null : clamp(next)
    if (clamped !== value) onChange(clamped)
  }

  function handleFocus() {
    setDraft(display(value))
  }

  function handleBlur() {
    // An entry that is not a number goes back to the last valid value.
    setDraft(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const steps: Partial<Record<string, number>> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
    const count = steps[event.key]
    if (count === undefined || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    stepBy(count)
  }

  const inputProps: NumberFieldInputProps = {
    type: 'text',
    inputMode: 'decimal',
    role: 'spinbutton',
    autoComplete: 'off',
    value: draft ?? display(value),
    'aria-valuenow': value ?? undefined,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': value === null ? undefined : t.valueText(display(value), unit),
  }

  return {
    inputProps,
    invalid,
    current,
    stepBy,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
  }
}

type NumberWithUnitProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step' | 'size' | 'inputMode' | 'role'
> & {
  label: string
  hideLabel?: boolean
  description?: ReactNode
  error?: ReactNode
  value: number | null
  /** Receives null when the field is emptied, never 0. */
  onChange: (value: number | null) => void
  /** Shown after the number, e.g. « ml » or « % vol ». */
  unit?: string
  min?: number
  max?: number
  /** Step of the up and down arrows (ten steps with Page up and Page down). */
  step?: number
  /** Fixed number of decimals shown; up to two by default. */
  decimals?: number
  ref?: Ref<HTMLInputElement>
  /** Classes of the outer block (label, field and messages). */
  className?: string
}

/** Number field that accepts a decimal comma, with its unit as a suffix. */
export function NumberWithUnit({
  label,
  hideLabel = false,
  description,
  error,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  decimals,
  id,
  disabled,
  className,
  ref,
  onFocus,
  onBlur,
  onKeyDown,
  'aria-describedby': describedByProp,
  ...rest
}: NumberWithUnitProps) {
  const field = useNumberField({ value, onChange, min, max, step, decimals, unit })
  const message = error ?? (field.invalid ? t.invalid : undefined)
  const ids = useFieldIds({ id, description, error: message, describedBy: describedByProp })

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
        className={cn(fieldFrameClass({ invalid: Boolean(message), disabled }), 'gap-1.5 px-3.5')}
        onMouseDown={focusFieldInput}
      >
        <input
          ref={ref}
          id={ids.inputId}
          disabled={disabled}
          aria-invalid={message ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(fieldInputClass, 'nums text-right')}
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
        {unit ? (
          <span aria-hidden="true" className="shrink-0 text-small text-fg-muted">
            {unit}
          </span>
        ) : null}
      </div>
    </FieldLayout>
  )
}
