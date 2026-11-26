import { useId } from 'react'
import { PhotoField } from '@renderer/components/PhotoField'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useRecipePhoto, useRestorePhoto, useSetPhoto } from '@renderer/lib/queries'
import { photoUrl } from '@shared/domain/photos'

const t = fr.components.forms.photo

/**
 * The photo of a recipe, at the foot of its side column (section 10.4, D-057): saved at once,
 * « Annuler » puts the other back.
 */
export function RecipePhoto({ id, name }: { id: string; name: string }) {
  const photo = useRecipePhoto(id)
  const set = useSetPhoto()
  const restore = useRestorePhoto()
  const titleId = useId()

  function save(content: string | null) {
    set.mutate(
      { owner: 'recipe', id, content },
      {
        onSuccess: ({ previous }) => {
          const message = content === null ? t.removed : t.saved
          if (previous === null) {
            toast.show({ message })
            return
          }
          toast.undo(message, () => {
            restore.mutate({ owner: 'recipe', id, path: previous }, { onError: notifyError })
          })
        },
        onError: notifyError,
      },
    )
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <SectionTitle id={titleId} tone="muted">
        {t.title}
      </SectionTitle>
      <PhotoField
        compact
        src={photoUrl(photo.data?.path)}
        alt={t.of(name)}
        disabled={photo.isPending || set.isPending}
        onPick={(picked) => {
          save(picked.content)
        }}
        onRemove={() => {
          save(null)
        }}
      />
    </section>
  )
}
