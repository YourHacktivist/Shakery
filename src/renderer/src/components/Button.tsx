import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@renderer/lib/cn'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Icon shown before the label (a lucide icon element). */
  icon?: ReactNode
  /** Square button without padding, for an icon alone (use IconButton). */
  iconOnly?: boolean
  ref?: Ref<HTMLButtonElement>
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Text on the accent is dark: white on #EF782B fails WCAG (section 11).
  solid:
    'border border-transparent bg-accent-soft text-accent-ink hover:bg-[#F7C29C] disabled:bg-[#6B4A39] disabled:text-accent-ink/70',
  outline:
    'border border-border-strong bg-transparent text-fg hover:bg-surface-2 disabled:border-border disabled:text-fg-muted/60',
  ghost:
    'border border-transparent bg-transparent text-fg-secondary hover:bg-surface-2 hover:text-fg disabled:text-fg-muted/50',
  danger:
    'border border-status-danger/40 bg-transparent text-status-danger hover:bg-status-danger/10 disabled:opacity-50',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-11 gap-2 px-[18px] text-body',
  sm: 'h-9 gap-1.5 px-3.5 text-small',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  md: 'size-11 p-0',
  sm: 'size-9 p-0',
}

/** Button of the design system: solid (main action), outline, ghost (discreet), danger. */
export function Button({
  variant = 'solid',
  size = 'md',
  icon,
  iconOnly = false,
  className,
  children,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-field font-semibold whitespace-nowrap transition-colors duration-150 ease-out-soft select-none disabled:cursor-not-allowed',
        VARIANTS[variant],
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'variant'> & {
  /** Accessible name, read by screen readers and shown as a tooltip. */
  label: string
  icon: ReactNode
  variant?: Exclude<ButtonVariant, 'solid'>
}

/** Square button holding only an icon; always has an accessible name. */
export function IconButton({
  label,
  icon,
  variant = 'outline',
  size = 'md',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      iconOnly
      className={className}
      {...rest}
    >
      {icon}
    </Button>
  )
}
