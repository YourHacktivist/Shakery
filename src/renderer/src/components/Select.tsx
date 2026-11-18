import { ChevronDown } from 'lucide-react'
import type { ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { FieldLayout, fieldFrameClass, useFieldIds } from '@renderer/components/Input'
import { cn } from '@renderer/lib/cn'

export type SelectOption = {
  value: string
  label: string
}

export type SelectGroup = {
  label: string
  options: readonly SelectOption[]
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> & {
  label: string
  hideLabel?: boolean
  description?: ReactNode
  error?: ReactNode
  /** Flat choices, or groups (an optgroup each). */
  options: readonly (SelectOption | SelectGroup)[]
  /** First choice with an empty value, e.g. « Non précisé ». */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
  /** Classes of the outer block (label, field and messages). */
  className?: string
}

function isGroup(option: SelectOption | SelectGroup): option is SelectGroup {
  return 'options' in option
}

/** Native select in the frame of the text fields: keyboard and screen readers work as everywhere. */
export function Select({
  label,
  hideLabel = false,
  description,
  error,
  options,
  placeholder,
  id,
  disabled,
  className,
  ref,
  'aria-describedby': describedByProp,
  ...rest
}: SelectProps) {
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
      <div className={cn(fieldFrameClass({ invalid: Boolean(error), disabled }), 'relative')}>
        <select
          ref={ref}
          id={ids.inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className="h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-9 pl-3.5 text-body text-fg [color-scheme:dark] outline-none disabled:cursor-not-allowed"
          {...rest}
        >
          {placeholder === undefined ? null : (
            <option value="" className="bg-surface-2 text-fg-secondary">
              {placeholder}
            </option>
          )}
          {options.map((option) =>
            isGroup(option) ? (
              <optgroup key={option.label} label={option.label} className="bg-surface-2 text-fg-muted">
                {option.options.map((child) => (
                  <option key={child.value} value={child.value} className="bg-surface-2 text-fg">
                    {child.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={option.value} value={option.value} className="bg-surface-2 text-fg">
                {option.label}
              </option>
            ),
          )}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 text-fg-muted"
        />
      </div>
    </FieldLayout>
  )
}
