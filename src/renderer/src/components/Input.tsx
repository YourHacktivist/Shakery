import { CircleAlert, Search } from 'lucide-react'
import { useId, type InputHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react'
import { Kbd } from '@renderer/components/Kbd'
import { cn } from '@renderer/lib/cn'

/* Shared pieces of the text fields (Input, NumberWithUnit, DoseStepper, Combobox). */

type FieldIdsOptions = {
  id?: string
  description?: ReactNode
  error?: ReactNode
  /** aria-describedby passed by the caller, kept before the field's own messages. */
  describedBy?: string
}

/** Ids that tie a field to its label, description and error message. */
export function useFieldIds({ id, description, error, describedBy }: FieldIdsOptions) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const ids = [describedBy, descriptionId, errorId].filter((value) => value !== undefined)
  return {
    inputId,
    descriptionId,
    errorId,
    describedBy: ids.length > 0 ? ids.join(' ') : undefined,
  }
}

type FieldLayoutProps = {
  inputId: string
  label: string
  /** The label stays readable by screen readers but is not shown. */
  hideLabel?: boolean
  description?: ReactNode
  descriptionId?: string
  error?: ReactNode
  errorId?: string
  className?: string
  children: ReactNode
}

/** Label above, field, then description and error message (icon and words, never colour alone). */
export function FieldLayout({
  inputId,
  label,
  hideLabel = false,
  description,
  descriptionId,
  error,
  errorId,
  className,
  children,
}: FieldLayoutProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className={cn('text-small font-medium text-fg-secondary', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children}
      {description ? (
        <p id={descriptionId} className="m-0 text-caption text-fg-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="m-0 flex items-start gap-1.5 text-caption font-medium text-status-danger">
          <CircleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Frame of a text field: 44 px high, radius 10, strong border, accent ring while the field has focus. */
export function fieldFrameClass({
  invalid = false,
  disabled = false,
}: {
  invalid?: boolean
  disabled?: boolean
}) {
  return cn(
    'flex h-11 min-w-0 items-center rounded-field border bg-surface-1 transition-colors duration-150 ease-out-soft',
    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
    invalid ? 'border-status-danger' : 'border-border-strong',
    disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-surface-2',
  )
}

/** Inner input of a field frame: the frame draws the border and the focus ring. */
export const fieldInputClass =
  'h-full min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed'

/** A click on the frame padding, an icon or a unit focuses the input, as on a native field. */
export function focusFieldInput(event: MouseEvent<HTMLElement>) {
  if (event.target instanceof Element && event.target.closest('input, button, a')) return
  const input = event.currentTarget.querySelector('input')
  if (!input || input.disabled) return
  event.preventDefault()
  input.focus()
}

export type InputVariant = 'default' | 'search'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  /** Always required: visible above the field, or kept for screen readers with hideLabel. */
  label: string
  hideLabel?: boolean
  description?: ReactNode
  /** Error message; turns the field red and sets aria-invalid. */
  error?: ReactNode
  /** « search » adds the magnifier on the left (top bar of the home screen). */
  variant?: InputVariant
  /** Shortcut hint shown on the right, e.g. « Ctrl K ». Pair it with aria-keyshortcuts. */
  shortcut?: ReactNode
  ref?: Ref<HTMLInputElement>
  /** Classes of the outer block (label, field and messages). */
  className?: string
}

/** Text field of the design system, with label, description and error message. */
export function Input({
  label,
  hideLabel = false,
  description,
  error,
  variant = 'default',
  shortcut,
  id,
  type,
  disabled,
  className,
  ref,
  'aria-describedby': describedByProp,
  ...rest
}: InputProps) {
  const ids = useFieldIds({ id, description, error, describedBy: describedByProp })
  const invalid = Boolean(error)

  return (
    <FieldLayout
      inputId={ids.inputId}
      label={label}
      hideLabel={hideLabel}
      description={description}
      descriptionId={ids.descriptionId}
      error={error}
      errorId={ids.errorId}
      className={className}
    >
      <div
        className={cn(fieldFrameClass({ invalid, disabled }), 'gap-2.5 px-3.5')}
        onMouseDown={focusFieldInput}
      >
        {variant === 'search' ? (
          <Search size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-fg-muted" />
        ) : null}
        <input
          ref={ref}
          id={ids.inputId}
          type={type ?? (variant === 'search' ? 'search' : 'text')}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={ids.describedBy}
          className={cn(fieldInputClass, '[&::-webkit-search-cancel-button]:appearance-none')}
          {...rest}
        />
        {shortcut ? (
          <span aria-hidden="true" className="shrink-0">
            <Kbd>{shortcut}</Kbd>
          </span>
        ) : null}
      </div>
    </FieldLayout>
  )
}
