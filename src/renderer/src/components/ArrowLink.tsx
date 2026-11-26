import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@renderer/lib/cn'

type ArrowLinkProps = Omit<LinkProps, 'children'> & { children: ReactNode }

/**
 * Copper text link to another screen, with an arrow that moves on hover (D-057). It goes after
 * a section title or under a block, where a button would add one more control to read.
 */
export function ArrowLink({ children, className, ...rest }: ArrowLinkProps) {
  return (
    <Link
      className={cn(
        'group/link inline-flex shrink-0 items-center gap-1.5 rounded-sm text-small font-semibold whitespace-nowrap text-accent-soft transition-colors duration-150 hover:text-accent',
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      <ArrowRight
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0 transition-transform duration-200 ease-out-soft group-hover/link:translate-x-0.5"
      />
    </Link>
  )
}
