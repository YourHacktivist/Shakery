import { Check } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '@renderer/lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode
  /** Muted line under the label. */
  description?: ReactNode
  /** Label read by screen readers only (a check box in a table row, for instance). */
  hideLabel?: boolean
  ref?: Ref<HTMLInputElement>
  className?: string
}

/**
 * Check box drawn in the colours of the app: the native input keeps the keyboard, the form
 * and the screen readers; its look is a dark box that fills with copper, the mark scaling in.
 */
export function Checkbox({
  label,
  description,
  hideLabel = false,
  id,
  className,
  disabled,
  ref,
  ...rest
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descriptionId = description ? `${inputId}-description` : undefined
  return (
    <div className={cn('group/check flex items-start gap-2.5', disabled && 'opacity-55', className)}>
      <span className="relative mt-px flex size-4 shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-describedby={descriptionId}
          className={cn(
            'peer size-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-border-strong bg-surface-2',
            'transition-[background-color,border-color,box-shadow] duration-150 ease-out-soft',
            'group-hover/check:border-accent/55 checked:border-transparent checked:bg-accent-gradient checked:shadow-glow',
            'disabled:cursor-not-allowed',
          )}
          {...rest}
        />
        <Check
          aria-hidden="true"
          size={12}
          strokeWidth={3.25}
          className="pointer-events-none absolute inset-0 m-auto scale-50 text-accent-ink opacity-0 transition-[opacity,transform] duration-150 ease-out-soft peer-checked:scale-100 peer-checked:opacity-100"
        />
      </span>
      <div className={cn('flex min-w-0 flex-col gap-0.5', hideLabel && 'sr-only')}>
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
