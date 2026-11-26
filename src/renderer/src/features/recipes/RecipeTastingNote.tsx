import { ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { PhotoField } from '@renderer/components/PhotoField'
import { RichText } from '@renderer/components/RichText'
import { Stars } from '@renderer/components/StarRating'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate, formatDelta } from '@renderer/lib/format'
import {
  useCreateTasting,
  useDeleteTasting,
  useRestorePhoto,
  useSetNextStepDone,
  useSetPhoto,
} from '@renderer/lib/queries'
import { TASTING_CRITERIA, type TastingNote } from '@shared/domain/journal'
import { photoUrl } from '@shared/domain/photos'

const tj = fr.journal
const tp = fr.components.forms.photo
const td = fr.recipes.detail

/**
 * A tasting in the side column of a recipe (D-057): stars, date and version on one line, the
 * comment as running text, then the next step under a hairline with its « Testée » box. The
 * journal keeps its own card; this one has none.
 */
export function RecipeTastingNote({ note }: { note: TastingNote }) {
  const setDone = useSetNextStepDone()
  // Shown at once, before the notes are read again; dropped when the write fails.
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const done = optimistic ?? note.nextStepDone
  const remove = useDeleteTasting()
  const recreate = useCreateTasting()
  const restorePhoto = useRestorePhoto()
  const setPhoto = useSetPhoto()
  const photo = photoUrl(note.photoPath)
  const [adding, setAdding] = useState(false)
  const scored = TASTING_CRITERIA.filter((criterion) => (note.scores[criterion] ?? 0) !== 0)

  /** Saved at once, as on a recipe; « Annuler » puts the other one back. */
  function savePhoto(content: string | null) {
    setPhoto.mutate(
      { owner: 'tasting', id: note.id, content },
      {
        onSuccess: ({ previous }) => {
          setAdding(false)
          const message = content === null ? tp.removed : tp.saved
          if (previous === null) {
            toast.show({ message })
            return
          }
          toast.undo(message, () => {
            restorePhoto.mutate({ owner: 'tasting', id: note.id, path: previous }, { onError: notifyError })
          })
        },
        onError: notifyError,
      },
    )
  }

  function deleteNote() {
    remove.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          // « Annuler » writes the same note again, its photo included.
          toast.undo(tj.deleted, () => {
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
    <article className="flex flex-col gap-1.5">
      <div className="flex h-7 items-center gap-2.5">
        {note.overall === null ? null : <Stars value={note.overall} label={tj.overallLabel(note.overall)} />}
        <span className="nums min-w-0 truncate text-caption text-fg-muted">
          {td.tastingMeta(formatDate(note.tastedAt), tj.version(note.recipeVersion))}
        </span>
        <span className="ml-auto flex shrink-0">
          {photo ? null : (
            <IconButton
              variant="ghost"
              size="sm"
              label={tp.add}
              aria-pressed={adding}
              icon={<ImagePlus size={14} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => {
                setAdding(!adding)
              }}
            />
          )}
          <IconButton
            variant="ghost"
            size="sm"
            label={tj.delete}
            disabled={remove.isPending}
            icon={<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
            onClick={deleteNote}
          />
        </span>
      </div>

      {note.comment ? (
        <RichText text={note.comment} className="text-body leading-relaxed text-fg-secondary" />
      ) : null}

      {scored.length > 0 ? (
        <p className="nums m-0 text-caption text-fg-muted">
          {scored
            .map((criterion) =>
              tj.scoreChip(tj.criteria[criterion], formatDelta(note.scores[criterion] ?? 0, 0)),
            )
            .join(', ')}
        </p>
      ) : null}

      {photo || adding ? (
        <PhotoField
          compact
          src={photo}
          alt={tp.tastingOf(note.recipeName)}
          disabled={setPhoto.isPending}
          onPick={(picked) => {
            savePhoto(picked.content)
          }}
          onRemove={() => {
            savePhoto(null)
          }}
        />
      ) : null}

      {note.nextStep ? (
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-border pt-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-fg-muted">{tj.nextStep}</span>
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
            label={tj.nextStepDone}
            aria-label={tj.markDone(note.nextStep)}
            checked={done}
            onChange={(event) => {
              const next = event.target.checked
              setOptimistic(next)
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
    </article>
  )
}
