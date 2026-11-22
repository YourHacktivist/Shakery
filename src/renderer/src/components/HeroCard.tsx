import { useId } from 'react'
import type { ReactNode } from 'react'
import logoUrl from '@renderer/assets/logo-160.png'
import { cn } from '@renderer/lib/cn'

/**
 * Classes for an outline Button placed in the hero: lighter border and a dark veil so it
 * stays readable on the copper gradient, as in the mockups. Marked important because cn()
 * does not merge conflicting utilities.
 */
export const heroSecondaryActionClass = 'border-tint/24! bg-bg-base/35! hover:bg-bg-base/55!'

type HeroCardProps = {
  title: string
  /** Short copper label above the title. */
  eyebrow?: string
  description?: ReactNode
  /** Buttons stacked at the bottom, full width: a solid Button then an outline one. */
  actions?: ReactNode
  showLogo?: boolean
  headingLevel?: 2 | 3
  /** Extra content between the description and the actions. */
  children?: ReactNode
  className?: string
}

/**
 * The only gradient surface of a screen (section 11): copper gradient, logo on its halo,
 * title, text and the main actions. One per screen.
 */
export function HeroCard({
  title,
  eyebrow,
  description,
  actions,
  showLogo = true,
  headingLevel = 2,
  children,
  className,
}: HeroCardProps) {
  const titleId = useId()
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-hero border border-accent/35 bg-hero p-7 text-fg',
        className,
      )}
    >
      {showLogo ? (
        // The logo body is almost black: it always sits on its copper halo. Decorative here.
        <div className="logo-halo flex size-[88px] shrink-0 items-center justify-center rounded-full">
          <img src={logoUrl} alt="" width={88} height={88} draggable={false} className="size-[88px]" />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <span className="text-caption font-semibold tracking-[0.01em] text-accent-soft">{eyebrow}</span>
        ) : null}
        <Heading id={titleId} className="m-0 text-title leading-tight font-medium tracking-[-0.01em]">
          {title}
        </Heading>
      </div>
      {description ? <p className="m-0 text-body leading-[1.55] text-[#E8D9CF]">{description}</p> : null}
      {children}
      {actions ? <div className="mt-auto flex flex-col gap-2.5 *:w-full">{actions}</div> : null}
    </section>
  )
}
