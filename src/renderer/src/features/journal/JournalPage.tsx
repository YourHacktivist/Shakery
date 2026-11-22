import { Clock, MessageSquareQuote, NotebookText, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Checkbox } from '@renderer/components/Checkbox'
import { EmptyState } from '@renderer/components/EmptyState'
import { Select } from '@renderer/components/Select'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Stars } from '@renderer/components/StarRating'
import { VersionBadge } from '@renderer/components/StatusBadge'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDelta, formatRelative } from '@renderer/lib/format'
import {
  useCreateTasting,
  useDeleteTasting,
  useRestorePhoto,
  useSetNextStepDone,
  useTastings,
} from '@renderer/lib/queries'
import { TASTING_CRITERIA, type TastingNote } from '@shared/domain/journal'
import { RichText } from '@renderer/components/RichText'
import { photoUrl } from '@shared/domain/photos'

const t = fr.journal

type View = 'all' | 'toRetest'

/** Tasting journal (section 10.6): every note, newest first, filtered by recipe, rating or « à retester ». */
export function JournalPage() {
  const openTasting = useOverlayStore((state) => state.openTasting)
  const tastings = useTastings()
  const [recipeId, setRecipeId] = useState('')
  const [minOverall, setMinOverall] = useState(0)
  const [view, setView] = useState<View>('all')
  // A step checked from the « à retester » view stays on screen until the view changes.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set())

  const notes = useMemo(() => tastings.data ?? [], [tastings.data])
  // /journal?note=<id>, from the palette: the note comes into view whatever the filters.
  const { key, search } = useLocation()
  const wanted = new URLSearchParams(search).get('note')
  const [visit, setVisit] = useState(key)
  if (visit !== key) {
    setVisit(key)
    if (wanted) {
      setRecipeId('')
      setMinOverall(0)
      setView('all')
    }
  }
  const wantedRef = useRef<HTMLLIElement>(null)
  const loaded = tastings.data !== undefined
  useEffect(() => {
    if (loaded && wanted) wantedRef.current?.scrollIntoView({ block: 'center' })
  }, [key, loaded, wanted])
  const recipeOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const note of notes) names.set(note.recipeId, note.recipeName)
    const collator = new Intl.Collator('fr')
    return [...names]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => collator.compare(a.label, b.label))
  }, [notes])

  const shown = notes
    .filter((note) => recipeId === '' || note.recipeId === recipeId)
    .filter((note) => minOverall === 0 || (note.overall ?? 0) >= minOverall)
    .filter((note) => view === 'all' || (note.nextStep !== null && (!note.nextStepDone || kept.has(note.id))))
    .sort((a, b) => b.tastedAt - a.tastedAt)

  const addButton = (
    <Button
      icon={<Plus size={16} aria-hidden="true" />}
      onClick={() => {
        openTasting(recipeId === '' ? null : recipeId)
      }}
    >
      {t.add}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(notes.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {addButton}
      </header>

      {tastings.isPending ? null : notes.length === 0 ? (
        <EmptyState
          icon={<NotebookText size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={addButton}
        />
      ) : (
        <>
          <div role="group" aria-label={t.filters.label} className="flex flex-wrap items-end gap-3">
            <Select
              label={t.filters.recipe}
              className="w-[260px]"
              value={recipeId}
              placeholder={t.filters.allRecipes}
              options={recipeOptions}
              onChange={(event) => {
                setRecipeId(event.target.value)
              }}
            />
            <Select
              label={t.filters.minOverall}
              className="w-[160px]"
              value={String(minOverall)}
              options={[
                { value: '0', label: t.filters.anyOverall },
                ...[2, 3, 4, 5].map((value) => ({ value: String(value), label: `≥ ${t.overall(value)}` })),
              ]}
              onChange={(event) => {
                setMinOverall(Number(event.target.value))
              }}
            />
            <SegmentedControl
              label={t.filters.view}
              className="ml-auto"
              value={view}
              onChange={(next) => {
                setKept(new Set())
                setView(next)
              }}
              options={[
                { value: 'all', label: t.filters.all },
                { value: 'toRetest', label: t.filters.toRetest },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <p className="m-0 py-10 text-center text-body text-fg-secondary">{t.noMatch}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {shown.map((note, index) => (
                <li
                  key={note.id}
                  ref={note.id === wanted ? wantedRef : undefined}
                  aria-current={note.id === wanted ? 'true' : undefined}
                  className={cn('animate-rise', note.id === wanted && 'rounded-card ring-2 ring-accent')}
                  style={{ '--rise-index': Math.min(index, 8) } as CSSProperties}
                >
                  <TastingCard
                    note={note}
                    onDoneChange={(id) => {
                      setKept((previous) => new Set(previous).add(id))
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}

/** One tasting: recipe and version, rating, criteria away from « juste », comment, next step. */
export function TastingCard({
  note,
  showRecipe = true,
  onDoneChange,
}: {
  note: TastingNote
  showRecipe?: boolean
  onDoneChange?: (id: string) => void
}) {
  const setDone = useSetNextStepDone()
  // Shown at once, before the journal is read again; dropped when the write fails.
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const done = optimistic ?? note.nextStepDone
  const remove = useDeleteTasting()
  const recreate = useCreateTasting()
  const restorePhoto = useRestorePhoto()
  const photo = photoUrl(note.photoPath)
  const scored = TASTING_CRITERIA.filter((criterion) => (note.scores[criterion] ?? 0) !== 0)

  function deleteNote() {
    remove.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          // Undo writes the same note again (section 10.1, « Annuler » for 8 seconds).
          toast.undo(t.deleted, () => {
            recreate.mutate(
              {
                recipeId: note.recipeId,
                recipeVersion: note.recipeVersion,
                tastedAt: note.tastedAt,
                overall: note.overall,
                scores: note.scores,
                comment: note.comment,
                nextStep: note.nextStep,
                context: note.context,
              },
              {
                onSuccess: (again) => {
                  const { photoPath } = note
                  if (!photoPath) return
                  restorePhoto.mutate(
                    { owner: 'tasting', id: again.id, path: photoPath },
                    { onError: notifyError },
                  )
                },
                onError: notifyError,
              },
            )
          })
        },
        onError: notifyError,
      },
    )
  }

  return (
    <Card
      as="article"
      className="group/note gap-2.5 transition-colors duration-150 hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {showRecipe ? (
            <Link
              to={`/recipes/${note.recipeId}`}
              className="truncate text-lead font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
            >
              {note.recipeName}
            </Link>
          ) : null}
          <VersionBadge version={note.recipeVersion} />
          {note.overall === null ? null : <Stars value={note.overall} label={t.overallLabel(note.overall)} />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 text-caption text-fg-muted">
            <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
            {formatRelative(note.tastedAt)}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            label={t.delete}
            className="opacity-0 transition-opacity duration-150 group-hover/note:opacity-100 focus-visible:opacity-100"
            icon={<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
            onClick={deleteNote}
          />
        </div>
      </div>

      {scored.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {scored.map((criterion) => {
            const value = note.scores[criterion] ?? 0
            return (
              <li
                key={criterion}
                className={cn(
                  'nums rounded-full border px-2 py-0.5 text-caption font-semibold',
                  Math.abs(value) === 2
                    ? 'border-accent/35 bg-accent/12 text-accent-soft'
                    : 'border-border-strong bg-surface-2 text-fg-secondary',
                )}
              >
                {t.scoreChip(t.criteria[criterion], formatDelta(value, 0))}
              </li>
            )
          })}
        </ul>
      ) : null}

      {note.comment ? (
        <div className="m-0 flex gap-2 text-body leading-relaxed text-fg-secondary">
          <MessageSquareQuote
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-fg-muted"
          />
          <RichText text={note.comment} />
        </div>
      ) : null}

      {photo ? (
        <img
          src={photo}
          alt={fr.components.forms.photo.tastingOf(note.recipeName)}
          loading="lazy"
          decoding="async"
          className="max-h-56 max-w-full self-start rounded-nested border border-border object-contain"
        />
      ) : null}
      {note.nextStep ? (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-nested border px-3 py-2 transition-colors duration-200',
            done
              ? 'border-status-ok/25 bg-status-ok/6'
              : 'border-accent/25 bg-[linear-gradient(90deg,rgb(239_120_43/0.1),rgb(239_120_43/0.02))]',
          )}
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-caption font-medium text-fg-muted">{t.nextStep}</span>
            <span
              className={cn(
                'text-body text-fg transition-colors duration-200',
                done && 'text-fg-muted line-through decoration-fg-muted/60',
              )}
            >
              {note.nextStep}
            </span>
          </div>
          <Checkbox
            label={t.nextStepDone}
            aria-label={t.markDone(note.nextStep)}
            checked={done}
            onChange={(event) => {
              const next = event.target.checked
              setOptimistic(next)
              onDoneChange?.(note.id)
              setDone.mutate(
                { id: note.id, done: next },
                {
                  onSuccess: () => {
                    setOptimistic(null)
                  },
                  onError: (error) => {
                    setOptimistic(null)
                    notifyError(error)
                  },
                },
              )
            }}
          />
        </div>
      ) : null}

      {note.context ? <p className="m-0 text-caption text-fg-muted">{note.context}</p> : null}
    </Card>
  )
}
