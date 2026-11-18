import { fr } from '@renderer/i18n/fr'
import { ImportCard } from './ImportCard'

/** Settings: import of a notebook for now; units, dilution and backups follow (section 14). */
export function SettingsPage() {
  const screen = fr.shell.screens.settings
  const t = fr.settings
  return (
    <div className="flex max-w-[880px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-medium tracking-[0.01em] text-fg-muted">{screen.eyebrow}</span>
        <h1 className="m-0 text-title font-semibold tracking-[-0.02em] text-fg">{screen.title}</h1>
      </div>
      <ImportCard />
      <section className="flex flex-col gap-1 rounded-card border border-dashed border-border p-4">
        <h2 className="m-0 text-body font-semibold text-fg">{t.rest.title}</h2>
        <p className="m-0 text-small text-fg-secondary">{t.rest.text}</p>
      </section>
    </div>
  )
}
