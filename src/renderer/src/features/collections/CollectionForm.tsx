import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { FormattedTextarea } from '@renderer/components/FormattedTextarea'
import { Input } from '@renderer/components/Input'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { errorMessage } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useCreateCollection, useUpdateCollection } from '@renderer/lib/queries'
import { COLLECTION_KIND_VALUES, type CollectionSummary } from '@shared/domain/workshop'

const t = fr.workshop.collections

/** What the form dialog shows: a new collection (null) or the one being changed. */
export type CollectionFormState = { collection: CollectionSummary | null } | null

/** Name, type and description of a collection, new or changed (section 10.10). */
export function CollectionFormDialog({
  form,
  onClose,
  onSaved,
}: {
  form: CollectionFormState
  onClose: () => void
  onSaved: (collection: CollectionSummary) => void
}) {
  const editing = form?.collection ?? null
  return (
    <Dialog
      open={form !== null}
      onClose={onClose}
      title={editing ? t.form.editTitle(editing.name) : t.form.createTitle}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.form.cancel}
          </Button>
          <Button type="submit" form="collection-form">
            {t.form.save}
          </Button>
        </>
      }
    >
      {form ? <CollectionForm collection={editing} onSaved={onSaved} /> : null}
    </Dialog>
  )
}

function CollectionForm({
  collection,
  onSaved,
}: {
  collection: CollectionSummary | null
  onSaved: (collection: CollectionSummary) => void
}) {
  const create = useCreateCollection()
  const update = useUpdateCollection()
  const [name, setName] = useState(collection?.name ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [kind, setKind] = useState<CollectionSummary['kind']>(collection?.kind ?? 'menu')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      id="collection-form"
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim() === '') {
          setError(fr.recipes.form.required)
          return
        }
        const data = { name, description, kind }
        const handlers = {
          onSuccess: (saved: CollectionSummary) => {
            toast.show({ message: collection ? t.form.saved : t.form.created(saved.name) })
            onSaved(saved)
          },
          onError: (failure: unknown) => {
            setError(errorMessage(failure))
          },
        }
        if (collection) update.mutate({ id: collection.id, data }, handlers)
        else create.mutate(data, handlers)
      }}
    >
      <div className="grid grid-cols-[1fr_180px] gap-4">
        <Input
          label={t.form.name}
          value={name}
          maxLength={120}
          autoComplete="off"
          data-autofocus=""
          error={error ?? undefined}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <Select
          label={t.form.kind}
          value={kind}
          options={COLLECTION_KIND_VALUES.map((value) => ({ value, label: t.kinds[value] }))}
          onChange={(event) => {
            setKind(event.target.value as CollectionSummary['kind'])
          }}
        />
      </div>
      <FormattedTextarea
        label={t.form.description}
        rows={3}
        maxLength={2000}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
        }}
      />
    </form>
  )
}
