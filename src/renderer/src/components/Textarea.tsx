import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react'
import { FieldLayout, useFieldIds } from '@renderer/components/Input'
import { cn } from '@renderer/lib/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hideLabel?: boolean
  description?: ReactNode
  error?: ReactNode
  ref?: Ref<HTMLTextAreaElement>
  /** Classes of the outer block (label, field and messages). */
  className?: string
}

/** Multi-line text field, same frame and messages as Input. */
export function Textarea({
  label,
  hideLabel = false,
  description,
  error,
  id,
  disabled,
  rows = 4,
  className,
  ref,
  'aria-describedby': describedByProp,
  ...rest
}: TextareaProps) {
  const ids = useFieldIds({ id, description, error, describedBy: describedByProp })
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
      <textarea
        ref={ref}
        id={ids.inputId}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(
          'min-w-0 resize-y rounded-field border bg-surface-1 px-3.5 py-2.5 text-body leading-relaxed text-fg transition-colors duration-150 ease-out-soft outline-none placeholder:text-fg-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55',
          error ? 'border-status-danger' : 'border-border-strong',
        )}
        {...rest}
      />
    </FieldLayout>
  )
}
