import { ArrowRight, FlaskConical, Info, Lightbulb, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { HeroCard, heroSecondaryActionClass } from '@renderer/components/HeroCard'
import { Kbd } from '@renderer/components/Kbd'
import { RangeGauge } from '@renderer/components/RangeGauge'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { StatTile } from '@renderer/components/StatTile'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

type View = 'current' | 'favorites'

const METRICS = ['abv', 'sugar', 'acid', 'ratio'] as const

/**
 * Home screen (section 10.3). The notebook holds no creation yet, so this is the empty home
 * of the mockup Accueil-vide: no invented data, every block says what to do. The filled home
 * is wired to real data in phase 9.
 */
export function HomePage() {
  const t = fr.home
  const navigate = useNavigate()
  const openOverlay = useOverlayStore((state) => state.open)
  const [view, setView] = useState<View>('current')

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.caption}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        <SegmentedControl<View>
          label={t.viewsLabel}
          value={view}
          onChange={setView}
          options={[
            { value: 'current', label: t.views.current },
            { value: 'favorites', label: t.views.favorites },
          ]}
        />
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_356px] gap-4">
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border-strong px-5 py-14 text-center">
          <div className="flex size-16 items-center justify-center rounded-nested border border-border-strong bg-surface-2 text-accent">
            <Lightbulb size={26} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h2 className="m-0 mt-2 text-heading font-normal text-fg">{t.empty.title}</h2>
          <p className="m-0 max-w-md text-body leading-relaxed text-fg-secondary">{t.empty.description}</p>
          <div className="mt-3 flex items-center gap-5">
            <Button
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => {
                openOverlay('quickIdea')
              }}
            >
              {t.empty.firstIdea}
              <Kbd tone="onAccent">Ctrl N</Kbd>
            </Button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-body font-semibold text-accent-soft hover:text-accent"
              onClick={() => void navigate('/recipes')}
            >
              {t.empty.classics}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <HeroCard
          title={t.hero.title}
          description={t.hero.description}
          actions={
            <>
              <Button
                className="w-full"
                icon={<FlaskConical size={16} aria-hidden="true" />}
                onClick={() => void navigate('/lab')}
              >
                {t.hero.openLab}
              </Button>
              <Button
                variant="outline"
                className={cn('w-full', heroSecondaryActionClass)}
                onClick={() => {
                  openOverlay('quickIdea')
                }}
              >
                {t.hero.noteIdea}
              </Button>
            </>
          }
        />
      </div>

      <Card className="gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-small text-fg-muted">{t.focus.eyebrow}</span>
          <p className="m-0 text-body text-fg">{t.focus.empty}</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {METRICS.map((metric) => (
            <StatTile
              key={metric}
              label={t.focus[metric]}
              value={null}
              unit={t.focus.units[metric]}
              gauge={<RangeGauge label={t.focus[metric]} value={null} />}
            />
          ))}
        </div>
        <p className="m-0 flex items-center gap-2 text-small text-fg-muted">
          <Info size={14} aria-hidden="true" />
          {t.focus.zoneNote}
        </p>
      </Card>
    </div>
  )
}
