import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'

const t = fr.workshop.collections.share

/** A collection and its recipes in a .shakery file for a colleague (section 12.4). */
export function ShareCollectionDialog({
  open,
  onClose,
  collectionId,
  name,
  recipeIds,
}: {
  open: boolean
  onClose: () => void
  collectionId: string
  name: string
  recipeIds: readonly string[]
}) {
  const [includePrivate, setIncludePrivate] = useState(false)
  const [busy, setBusy] = useState(false)

  async function share() {
    setBusy(true)
    try {
      const result = await unwrap(
        window.shakery.export.notebook({
          kind: 'partial',
          recipeIds: [...recipeIds],
          includePrivate,
          collectionId,
          label: name,
        }),
      )
      if (result.saved) {
        toast.show({ message: t.done })
        onClose()
      }
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title(name)}
      description={t.description}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            icon={<FileDown size={16} aria-hidden="true" />}
            disabled={busy}
            onClick={() => void share()}
          >
            {t.export}
          </Button>
        </>
      }
    >
      <Checkbox
        label={fr.recipes.share.includePrivate}
        checked={includePrivate}
        onChange={(event) => {
          setIncludePrivate(event.target.checked)
        }}
      />
    </Dialog>
  )
}
