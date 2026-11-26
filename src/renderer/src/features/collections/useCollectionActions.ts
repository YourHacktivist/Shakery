import { useState } from 'react'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { exportCollectionPdf, useDeleteCollection, useRestoreCollection } from '@renderer/lib/queries'

const t = fr.workshop.collections

/** PDF export and deletion of a collection, the same from its row and from its page. */
export function useCollectionActions() {
  const remove = useDeleteCollection()
  const restore = useRestoreCollection()
  const [exporting, setExporting] = useState<string | null>(null)

  async function exportPdf(id: string) {
    setExporting(id)
    try {
      if (await exportCollectionPdf(id)) toast.show({ message: t.exported })
    } catch (error) {
      notifyError(error)
    } finally {
      setExporting(null)
    }
  }

  /** To the trash, with « Annuler » for 8 seconds (section 10.1). */
  function removeCollection(
    collection: { id: string; name: string },
    handlers: { onDeleted?: () => void; onRestored?: (id: string) => void } = {},
  ) {
    const { id, name } = collection
    remove.mutate(
      { id },
      {
        onSuccess: () => {
          handlers.onDeleted?.()
          toast.undo(t.deleted(name), () => {
            restore.mutate(
              { id },
              {
                onSuccess: () => {
                  handlers.onRestored?.(id)
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

  return { exporting, exportPdf, removeCollection }
}
