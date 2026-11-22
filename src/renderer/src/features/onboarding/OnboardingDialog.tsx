import { FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import logoUrl from '@renderer/assets/logo-512.png'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { toast } from '@renderer/components/Toast'
import { useBackupDirectory } from '@renderer/features/settings/useBackupDirectory'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { revealTheme, type Theme } from '@renderer/lib/appearance'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'
import { useIngredients, useRecipes, useSetSetting, useSetting, useSettings } from '@renderer/lib/queries'

const t = fr.onboarding
const STEPS = ['display', 'base', 'backups'] as const

/**
 * First launch (section 10.15): display, what the notebook already holds, backups. Closed with
 * Escape, it comes back at the next launch; finished or skipped, never again.
 */
export function Onboarding() {
  const settings = useSettings()
  const [dismissed, setDismissed] = useState(false)
  if (!settings.data || settings.data['onboarding.done'] || dismissed) return null
  return (
    <Assistant
      onDismiss={() => {
        setDismissed(true)
      }}
    />
  )
}

function Assistant({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate()
  const change = useSetSetting()
  const [index, setIndex] = useState(0)
  const step = STEPS[index] ?? 'display'
  const last = index === STEPS.length - 1

  function finish() {
    change.mutate(
      { key: 'onboarding.done', value: true },
      {
        onSuccess: () => {
          // The home of a new notebook invites to note a first idea; the toast gives its shortcut.
          toast.show({ message: t.done })
          void navigate('/')
        },
        onError: notifyError,
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onDismiss}
      title={t.title}
      description={t.progress(index + 1, STEPS.length)}
      size="lg"
      footer={
        <>
          {last ? null : (
            <Button variant="ghost" className="mr-auto" disabled={change.isPending} onClick={finish}>
              {t.skip}
            </Button>
          )}
          {index > 0 ? (
            <Button
              variant="outline"
              onClick={() => {
                setIndex(index - 1)
              }}
            >
              {t.back}
            </Button>
          ) : null}
          <Button
            data-autofocus=""
            disabled={change.isPending}
            onClick={() => {
              if (last) finish()
              else setIndex(index + 1)
            }}
          >
            {last ? t.finish : t.next}
          </Button>
        </>
      }
    >
      <div className="flex min-h-[220px] items-center gap-6">
        <span
          key={step}
          className="logo-halo flex size-40 shrink-0 animate-turn-in items-center justify-center rounded-full"
        >
          <img src={logoUrl} alt="" className="size-32" />
        </span>
        <div key={`${step}-text`} className="flex min-w-0 flex-1 animate-rise flex-col items-start gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="m-0 text-heading font-semibold text-fg">{t.steps[step].title}</h3>
            <p className="m-0 text-body leading-relaxed text-fg-secondary">{t.steps[step].text}</p>
          </div>
          {step === 'display' ? <DisplayStep /> : step === 'base' ? <BaseStep /> : <BackupStep />}
        </div>
      </div>
      <div aria-hidden="true" className="mt-4 flex justify-center gap-1.5">
        {STEPS.map((id, position) => (
          <span
            key={id}
            className={cn(
              'h-1.5 w-7 rounded-full transition-colors duration-200',
              position <= index ? 'bg-accent' : 'bg-tint/14',
            )}
          />
        ))}
      </div>
    </Dialog>
  )
}

function DisplayStep() {
  const change = useSetSetting()
  const unit = useSetting('display.unit')
  const theme = useSetting('appearance.theme')
  const s = fr.settings.appearance
  return (
    <>
      <SegmentedControl<'ml' | 'cl' | 'oz'>
        label={s.unit}
        value={unit}
        onChange={(value) => {
          change.mutate({ key: 'display.unit', value }, { onError: notifyError })
        }}
        options={[
          { value: 'ml', label: s.units.ml },
          { value: 'cl', label: s.units.cl },
          { value: 'oz', label: s.units.oz },
        ]}
      />
      <SegmentedControl<Theme>
        label={s.theme}
        value={theme}
        onChange={(value) => {
          revealTheme(value, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
          change.mutate({ key: 'appearance.theme', value }, { onError: notifyError })
        }}
        options={[
          { value: 'dark', label: s.themes.dark },
          { value: 'light', label: s.themes.light },
        ]}
      />
    </>
  )
}

function BaseStep() {
  const recipes = useRecipes()
  const ingredients = useIngredients()
  if (!recipes.data || !ingredients.data) return null
  const counts = [
    { label: t.base.cocktails, value: recipes.data.filter((recipe) => recipe.kind === 'cocktail').length },
    { label: t.base.preps, value: recipes.data.filter((recipe) => recipe.kind === 'prep').length },
    { label: t.base.ingredients, value: ingredients.data.length },
  ]
  return (
    <dl className="m-0 flex gap-6">
      {counts.map((count) => (
        <div key={count.label} className="flex flex-col-reverse">
          <dt className="text-caption text-fg-muted">{count.label}</dt>
          <dd className="nums m-0 text-metric font-light text-copper">{formatNumber(count.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function BackupStep() {
  const folder = useBackupDirectory()
  return (
    <>
      {folder.directory ? (
        <p className="m-0 w-full rounded-nested border border-border bg-surface-2 px-3 py-2 text-small break-all text-fg">
          {folder.directory.directory}
        </p>
      ) : null}
      <Button
        variant="outline"
        icon={<FolderOpen size={16} aria-hidden="true" />}
        disabled={folder.busy}
        onClick={folder.choose}
      >
        {fr.settings.backups.choose}
      </Button>
    </>
  )
}
