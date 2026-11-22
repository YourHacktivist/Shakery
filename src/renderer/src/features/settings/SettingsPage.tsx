import { fr } from '@renderer/i18n/fr'
import { AboutCard } from './AboutCard'
import { AppearanceCard } from './AppearanceCard'
import { BackupsCard } from './BackupsCard'
import { CalculationCard } from './CalculationCard'
import { ExportCard } from './ExportCard'
import { ImportCard } from './ImportCard'
import { MaintenanceCard } from './MaintenanceCard'
import { OffCard } from './OffCard'
import { PrintCard } from './PrintCard'

/** Settings (section 10.14): appearance, calculations, printing, data, network, about, risky zone. */
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
          <CalculationCard />
          <PrintCard />
          <OffCard />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AboutCard />
          <BackupsCard />
          <ExportCard />
          <ImportCard />
          <MaintenanceCard />
        </div>
      </div>
    </div>
  )
}
