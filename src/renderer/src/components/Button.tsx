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
    'border border-transparent bg-accent-gradient text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] hover:brightness-105 hover:shadow-glow disabled:bg-none disabled:bg-accent-disabled disabled:text-accent-ink/70 disabled:shadow-none disabled:brightness-100',
  outline:
    // Opaque: the engraving of the screen never runs through a label.
    'border border-border-strong bg-surface-1 text-fg hover:border-tint/22 hover:bg-surface-2 disabled:border-border disabled:text-fg-muted/60',
  ghost:
    'border border-transparent bg-transparent text-fg-secondary hover:bg-surface-2 hover:text-fg disabled:text-fg-muted/50',
  danger:
    'border border-status-danger/40 bg-surface-1 text-status-danger hover:bg-status-danger/10 disabled:opacity-50',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-8 gap-1.5 px-3 text-body',
  sm: 'h-7 gap-1 px-2.5 text-small',
}

const ICON_SIZES: Record<ButtonSize, string> = {
  md: 'size-8 p-0',
  sm: 'size-7 p-0',
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
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-field font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,filter,transform] duration-150 ease-out-soft select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
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
