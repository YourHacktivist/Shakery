import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AllergenBadge } from '@renderer/components/AllergenBadge'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { DoseStepper } from '@renderer/components/DoseStepper'
import { EmptyState } from '@renderer/components/EmptyState'
import { ExpiryPill } from '@renderer/components/ExpiryPill'
import { FilterPill } from '@renderer/components/FilterPill'
import { HeroCard } from '@renderer/components/HeroCard'
import { Input } from '@renderer/components/Input'
import { Kbd } from '@renderer/components/Kbd'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { RangeGauge } from '@renderer/components/RangeGauge'
import { RatingScale, type RatingValue } from '@renderer/components/RatingScale'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Sparkline } from '@renderer/components/Sparkline'
import { StatTile } from '@renderer/components/StatTile'
import { StatusBadge, VersionBadge } from '@renderer/components/StatusBadge'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { VersionDiff } from '@renderer/components/VersionDiff'
import { VirtualTable } from '@renderer/components/VirtualTable'
import { fr } from '@renderer/i18n/fr'

const t = fr.kit
const s = t.samples

const COLORS: ReadonlyArray<[string, string]> = [
  ['--color-bg-base', '#0A0807'],
  ['--color-surface-1', '#120D0B'],
  ['--color-surface-2', '#1A1310'],
  ['--color-border', 'rgb(255 235 220 / 0.07)'],
  ['--color-border-strong', 'rgb(255 235 220 / 0.14)'],
  ['--color-fg', '#F5EFEA'],
  ['--color-fg-secondary', '#B9ADA5'],
  ['--color-fg-muted', '#8E827A'],
  ['--color-accent', '#EF782B'],
  ['--color-accent-soft', '#F4B183'],
  ['--color-accent-deep', '#A13817'],
  ['--color-accent-ink', '#1A0B05'],
  ['--color-status-ok', '#3FBF8A'],
  ['--color-status-warning', '#F2C94C'],
  ['--color-status-danger', '#F05252'],
]

const TYPE_SCALE: ReadonlyArray<[string, string]> = [
  ['text-display font-light', '56 · 300'],
  ['text-metric font-light', '40 · 300'],
  ['text-title', '28 · 400'],
  ['text-heading font-medium', '20 · 500'],
  ['text-lead font-semibold', '16 · 600'],
  ['text-body', '14 · 400'],
  ['text-small font-medium', '13 · 500'],
  ['text-caption font-medium', '12 · 500'],
]

const ROWS = Array.from({ length: 400 }, (_, i) => ({
  id: `r${i}`,
  name: `${s.rows} ${i + 1}`,
  note: (i % 5) + 1,
}))

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="m-0 text-heading font-medium text-fg">{title}</h2>
      {children}
    </section>
  )
}

/** Visual validation page of section 11 (development only): every token and component, in every state. */
export function KitPage() {
  const [dose, setDose] = useState<number | null>(30)
  const [volume, setVolume] = useState<number | null>(700)
  const [on, setOn] = useState(true)
  const [view, setView] = useState<'current' | 'favorites'>('current')
  const [family, setFamily] = useState<'all' | 'sour' | 'spirit'>('all')
  const [rating, setRating] = useState<RatingValue | null>(0)
  const [ingredient, setIngredient] = useState<string | null>(null)
  const [dialog, setDialog] = useState(false)

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-title font-normal text-fg">{t.title}</h1>
        <p className="m-0 text-body text-fg-secondary">{t.subtitle}</p>
      </header>

      <Section title={t.sections.colors}>
        <div className="grid grid-cols-5 gap-4">
          {COLORS.map(([name, value]) => (
            <div key={name} className="flex flex-col gap-2">
              <div
                className="h-14 rounded-nested border border-border-strong"
                style={{ background: `var(${name})` }}
              />
              <code className="text-caption text-fg">{name}</code>
              <code className="text-caption text-fg-muted">{value}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.sections.type}>
        {TYPE_SCALE.map(([cls, spec]) => (
          <div key={spec} className="flex items-baseline justify-between border-b border-border pb-2">
            <span className={`${cls} text-fg`}>Negroni fumé 24,6</span>
            <span className="text-caption text-fg-muted">{spec}</span>
          </div>
        ))}
      </Section>

      <Section title={t.sections.radii}>
        <div className="flex items-end gap-6">
          {['rounded-field', 'rounded-nested', 'rounded-card', 'rounded-hero', 'rounded-full'].map((r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <div className={`size-16 border border-border-strong bg-surface-2 ${r}`} />
              <code className="text-caption text-fg-muted">{r}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.sections.buttons}>
        {[false, true].map((disabled) => (
          <div key={String(disabled)} className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-caption text-fg-muted">
              {disabled ? t.states.disabled : t.states.normal}
            </span>
            <Button disabled={disabled}>{s.save}</Button>
            <Button variant="outline" disabled={disabled}>
              {s.compare}
            </Button>
            <Button variant="ghost" disabled={disabled}>
              {s.cancel}
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} aria-hidden="true" />} disabled={disabled}>
              {s.remove}
            </Button>
            <IconButton label={s.add} icon={<Plus size={18} aria-hidden="true" />} disabled={disabled} />
            <Button size="sm" disabled={disabled}>
              {s.save} <Kbd tone="onAccent">Ctrl S</Kbd>
            </Button>
          </div>
        ))}
      </Section>

      <Section title={t.sections.fields}>
        <div className="grid grid-cols-3 gap-6">
          <Input label={s.name} placeholder={s.namePlaceholder} />
          <Input label={s.name} error={s.nameError} />
          <Input label={s.name} disabled placeholder={s.namePlaceholder} />
          <DoseStepper label={s.dose} unit="ml" value={dose} onChange={setDose} />
          <NumberWithUnit label={s.volume} unit="ml" step={10} value={volume} onChange={setVolume} />
          <Combobox
            label={s.ingredient}
            value={ingredient}
            onSelect={setIngredient}
            onCreate={() => undefined}
            options={[
              { id: 'gin', label: 'Gin London Dry', hint: 'Spiritueux' },
              { id: 'campari', label: 'Campari', hint: 'Bitter' },
              { id: 'vermouth', label: 'Vermouth rouge', hint: 'Vin aromatisé' },
            ]}
          />
          <Toggle label={s.lineOn} checked={on} onCheckedChange={setOn} showState />
        </div>
      </Section>

      <Section title={t.sections.choices}>
        <div className="flex flex-wrap items-center gap-4">
          <SegmentedControl
            label={s.view}
            value={view}
            onChange={setView}
            options={[
              { value: 'current', label: s.current },
              { value: 'favorites', label: s.favorites },
            ]}
          />
          <FilterPill
            label={s.family}
            value={family}
            onChange={setFamily}
            options={[
              { value: 'all', label: fr.components.forms.filterPill.all },
              { value: 'sour', label: 'Sour' },
              { value: 'spirit', label: 'Spirit-forward' },
            ]}
          />
        </div>
      </Section>

      <Section title={t.sections.badges}>
        <div className="flex flex-wrap items-center gap-2">
          {(['idea', 'draft', 'testing', 'final', 'archived'] as const).map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <VersionBadge version={4} />
          <ExpiryPill days={4} />
          <ExpiryPill days={1} />
          <ExpiryPill days={-1} />
          <ExpiryPill days={null} />
          <AllergenBadge code="eggs" />
          <AllergenBadge code="nuts" optional />
        </div>
      </Section>

      <Section title={t.sections.measures}>
        <div className="grid grid-cols-3 gap-4">
          <StatTile
            label="Degré"
            value={24.6}
            unit="% vol"
            delta={{ value: -1.2, reference: 'v3' }}
            gauge={
              <RangeGauge
                label="Degré"
                value={24.6}
                min={15}
                max={35}
                zone={{ from: 22, to: 27, count: 5 }}
                saved={{ value: 25.8, version: 'v3' }}
                unit="%"
              />
            }
          />
          <StatTile label="Sucre" value={10.4} unit="g / 100 ml" delta={{ value: 0.6 }} />
          <StatTile label="Acidité" value={null} unit="g / 100 ml" />
        </div>
      </Section>

      <Section title={t.sections.curves}>
        <div className="grid grid-cols-2 gap-4">
          <Card nested eyebrow={s.noteByVersion}>
            <Sparkline label={s.noteByVersion} values={[3.4, 3.6, 3.9, 4.2]} />
          </Card>
          <Card nested eyebrow={s.trendDown}>
            <Sparkline label={s.trendDown} values={[4.1, 3.9, 3.6, 3.2]} tone="danger" />
          </Card>
        </div>
      </Section>

      <Section title={t.sections.rating}>
        <RatingScale label={s.sweetness} value={rating} onChange={setRating} />
      </Section>

      <Section title={t.sections.diff}>
        <VersionDiff
          from="v3"
          to="v4"
          changes={[
            { kind: 'dose', ingredient: 'Campari', before: 30, after: 25, unit: 'ml' },
            { kind: 'added', ingredient: 'Bitter cacao', dose: { amount: 1, unit: 'trait' } },
            { kind: 'removed', ingredient: 'Zeste d’orange' },
            { kind: 'method', before: 'Shaker', after: 'Verre à mélange' },
          ]}
        />
      </Section>

      <Section title={t.sections.table}>
        <div className="h-64">
          <VirtualTable
            label={s.rows}
            rows={ROWS}
            getRowId={(row) => row.id}
            columns={[
              { id: 'name', header: s.rows, cell: (row) => row.name },
              { id: 'note', header: s.lastNote, numeric: true, width: '120px', cell: (row) => row.note },
            ]}
          />
        </div>
      </Section>

      <Section title={t.sections.overlays}>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setDialog(true)
            }}
          >
            {s.openDialog}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.undo(s.toastText, () => undefined)
            }}
          >
            {s.showToast}
          </Button>
        </div>
        <Dialog
          open={dialog}
          onClose={() => {
            setDialog(false)
          }}
          title={s.dialogTitle}
          description={s.dialogText}
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setDialog(false)
                }}
              >
                {s.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDialog(false)
                }}
              >
                {s.remove}
              </Button>
            </>
          }
        />
      </Section>

      <Section title={t.sections.empty}>
        <EmptyState
          title={s.emptyTitle}
          description={s.emptyText}
          action={<Button variant="outline">{s.noteIdea}</Button>}
        />
      </Section>

      <Section title={`${t.sections.mockup} (${t.demo})`}>
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_300px] gap-4">
          {[
            {
              name: 'Negroni fumé',
              family: 'Spirit-forward',
              status: 'testing' as const,
              v: 4,
              values: [3.2, 3.4, 3.6, 4.2],
            },
            {
              name: 'Sour rhubarbe & estragon',
              family: 'Sour',
              status: 'draft' as const,
              v: 2,
              values: [3, 3.4],
            },
            {
              name: 'Highball yuzu & sansho',
              family: 'Highball',
              status: 'testing' as const,
              v: 3,
              values: [3.7, 4.1, 3.9],
            },
          ].map((card) => (
            <Card key={card.name} className="gap-4">
              <div className="flex gap-2">
                <StatusBadge status={card.status} />
                <VersionBadge version={card.v} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lead font-semibold text-fg">{card.name}</span>
                <span className="text-small text-fg-muted">{card.family}</span>
              </div>
              <StatTile
                surface="plain"
                label={s.lastNote}
                value={card.values.at(-1) ?? null}
                unit="/5"
                delta={{
                  value: (card.values.at(-1) ?? 0) - (card.values.at(-2) ?? 0),
                  reference: `v${card.v - 1}`,
                }}
              />
              <Sparkline label={s.noteByVersion} values={card.values} />
            </Card>
          ))}
          <HeroCard title="Atelier" description={fr.home.hero.description} />
        </div>
      </Section>
    </div>
  )
}
