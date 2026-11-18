import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import type { AllergenCode } from '@shared/domain/allergens'

const t = fr.components.display

/** Regulatory French label of an allergen code. */
export function allergenLabel(code: AllergenCode): string {
  return t.allergens[code]
}

type AllergenBadgeProps = {
  code: AllergenCode
  /** The allergen only comes from an optional line: dashed border and the word « optionnel ». */
  optional?: boolean
  className?: string
}

/** One of the 14 regulatory allergens, with its full French label. */
export function AllergenBadge({ code, optional = false, className }: AllergenBadgeProps) {
  const label = allergenLabel(code)
  return (
    <span
      data-allergen={code}
      title={label}
      className={cn(
        'inline-flex h-6 max-w-full min-w-0 shrink-0 items-center rounded-full border px-2.5 text-caption font-semibold',
        optional
          ? 'border-dashed border-border-strong bg-transparent text-fg-secondary'
          : 'border-border-strong bg-surface-2 text-fg',
        className,
      )}
    >
      <span className="truncate">
        {label}
        {optional ? <span className="font-medium text-fg-muted">{` ${t.allergenOptional}`}</span> : null}
      </span>
    </span>
  )
}
