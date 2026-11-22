import { Card } from '@renderer/components/Card'
import { PhotoField } from '@renderer/components/PhotoField'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useRecipePhoto, useRestorePhoto, useSetPhoto } from '@renderer/lib/queries'
import { photoUrl } from '@shared/domain/photos'

const t = fr.components.forms.photo

/** The photo of a recipe on its page (section 10.4): saved at once, « Annuler » puts the other back. */
export function RecipePhotoCard({ id, name }: { id: string; name: string }) {
  const photo = useRecipePhoto(id)
  const set = useSetPhoto()
  const restore = useRestorePhoto()

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
    <Card aria-label={t.title}>
      <h2 className="m-0 text-body font-semibold text-fg">{t.title}</h2>
      <PhotoField
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
    </Card>
  )
}
