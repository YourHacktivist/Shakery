import type { ReactNode } from 'react'
import { Card } from '@renderer/components/Card'

/** A block of the settings: small label, title, what it is for, then the controls. */
export function SettingCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card aria-label={title} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{eyebrow}</span>
        <h2 className="m-0 text-body font-semibold text-fg">{title}</h2>
        {description ? <p className="m-0 text-small text-fg-secondary">{description}</p> : null}
      </div>
      {children}
    </Card>
  )
}

/** A label on the left, its control on the right. */
export function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span aria-hidden="true" className="text-body text-fg">
        {label}
      </span>
      {children}
    </div>
  )
}
