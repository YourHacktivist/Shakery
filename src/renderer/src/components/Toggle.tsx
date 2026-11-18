import { Check } from 'lucide-react'
import { useId, type ButtonHTMLAttributes, type Ref } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.components.forms.toggle

type ToggleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'value' | 'children' | 'role' | 'type'
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Accessible name; shown after the switch unless hideLabel is set. */
  label: string
  hideLabel?: boolean
  /** Writes the state next to the switch (« Activé », « Désactivé » or the given words). */
  showState?: boolean
  stateLabels?: { on: string; off: string }
  ref?: Ref<HTMLButtonElement>
  /** Classes of the outer block (switch, label and state). */
  className?: string
}

/** On and off switch (role switch), e.g. to turn a line of the workshop off. */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  showState = false,
  stateLabels = t,
  id,
  disabled,
  className,
  ref,
  onClick,
  ...rest
}: ToggleProps) {
  const autoId = useId()
  const buttonId = id ?? autoId

  return (
    <div className={cn('inline-flex items-center gap-2.5', disabled && 'opacity-55', className)}>
      <button
        ref={ref}
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-150 ease-out-soft disabled:cursor-not-allowed',
          checked ? 'border-transparent bg-accent-gradient shadow-glow' : 'border-border-strong bg-surface-2',
        )}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) onCheckedChange(!checked)
        }}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-3.5 items-center justify-center rounded-full transition-transform duration-150 ease-out-soft',
            checked ? 'translate-x-4 bg-accent-ink text-accent' : 'translate-x-0 bg-fg-muted',
          )}
        >
          {checked ? <Check size={10} strokeWidth={3} /> : null}
        </span>
      </button>
      {hideLabel ? null : (
        <label
          htmlFor={buttonId}
          className={cn('text-body text-fg select-none', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </label>
      )}
      {showState ? (
        <span aria-hidden="true" className="text-small text-fg-muted">
          {checked ? stateLabels.on : stateLabels.off}
        </span>
      ) : null}
    </div>
  )
}
