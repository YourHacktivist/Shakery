import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '@renderer/lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode
  /** Muted line under the label. */
  description?: ReactNode
  ref?: Ref<HTMLInputElement>
  className?: string
}

/** Native checkbox with its label, in the accent colour. */
export function Checkbox({ label, description, id, className, disabled, ref, ...rest }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descriptionId = description ? `${inputId}-description` : undefined
  return (
    <div className={cn('flex items-start gap-2.5', disabled && 'opacity-55', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        aria-describedby={descriptionId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed"
        {...rest}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <label
          htmlFor={inputId}
          className={cn('text-small text-fg select-none', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-caption text-fg-muted">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  )
}
