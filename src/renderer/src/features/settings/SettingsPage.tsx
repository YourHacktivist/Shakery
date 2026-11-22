import { fr } from '@renderer/i18n/fr'
import { AboutCard } from './AboutCard'
import { AppearanceCard } from './AppearanceCard'
import { BackupsCard } from './BackupsCard'
import { ExportCard } from './ExportCard'
import { ImportCard } from './ImportCard'
import { OffCard } from './OffCard'

/** Settings (section 10.14): appearance, data of the notebook, network, about. */
export function SettingsPage() {
  const t = fr.settings
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="text-caption text-fg-muted">{t.subtitle}</span>
        <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
      </header>
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <AppearanceCard />
          <BackupsCard />
          <OffCard />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AboutCard />
          <ExportCard />
          <ImportCard />
        </div>
      </div>
    </div>
  )
}
