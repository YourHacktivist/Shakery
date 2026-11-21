import {
  ArrowDown,
  ArrowUp,
  FileDown,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  ScrollText,
  Share2,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { Select } from '@renderer/components/Select'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Textarea } from '@renderer/components/Textarea'
import { toast } from '@renderer/components/Toast'
import { ShareCollectionDialog } from '@renderer/features/collections/ShareCollectionDialog'
import { errorMessage, notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import {
  exportCollectionPdf,
  useAddToCollection,
  useCollection,
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useRecipes,
  useRemoveCollectionItem,
  useReorderCollection,
  useRestoreCollection,
  useUpdateCollection,
  useUpdateCollectionItem,
} from '@renderer/lib/queries'
import {
  COLLECTION_KIND_VALUES,
  type CollectionDetail,
  type CollectionItem,
  type CollectionSummary,
} from '@shared/domain/workshop'

const t = fr.workshop.collections

/** Collections (section 10.10): free order, a note and a price per recipe, PDF and revision. */
export function CollectionsPage() {
  const collections = useCollections()
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState<{ collection: CollectionSummary | null } | null>(null)
  const list = collections.data ?? []
  const selectedId = params.get('collection') ?? list[0]?.id ?? null

  function select(id: string | null) {
    setParams(id === null ? {} : { collection: id }, { replace: true })
  }

  const addButton = (
    <Button
      icon={<Plus size={16} aria-hidden="true" />}
      onClick={() => {
        setForm({ collection: null })
      }}
    >
      {t.add}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(list.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {addButton}
      </header>

      {collections.isPending ? null : list.length === 0 ? (
        <EmptyState
          icon={<Layers size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={addButton}
        />
      ) : (
        <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-4">
          <Card className="sticky top-0 gap-1 p-2">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {list.map((collection, index) => (
                <li
                  key={collection.id}
                  className="animate-rise"
                  style={{ '--rise-index': Math.min(index, 8) } as CSSProperties}
                >
                  <button
                    type="button"
                    aria-current={collection.id === selectedId ? 'true' : undefined}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-0.5 rounded-nested border px-3 py-2 text-left transition-[background-color,border-color] duration-150',
                      collection.id === selectedId
                        ? 'border-accent/30 bg-[linear-gradient(90deg,rgb(239_120_43/0.13),rgb(239_120_43/0.03))]'
                        : 'border-transparent hover:bg-[rgb(255_235_220/0.04)]',
                    )}
                    onClick={() => {
                      select(collection.id)
                    }}
                  >
                    <span className="truncate text-body font-semibold text-fg">{collection.name}</span>
                    <span className="text-caption text-fg-muted">
                      {`${t.kinds[collection.kind]} · ${t.items(collection.recipeIds.length, collection.sheetCount)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {selectedId ? (
            <CollectionPanel
              key={selectedId}
              id={selectedId}
              onEdit={(collection) => {
                setForm({ collection })
              }}
              onDeleted={() => {
                select(null)
              }}
              onRestored={select}
            />
          ) : (
            <EmptyState title={t.pick} className="min-h-[320px] p-8" />
          )}
        </div>
      )}

      <CollectionFormDialog
        form={form}
        onClose={() => {
          setForm(null)
        }}
        onSaved={(id) => {
          setForm(null)
          select(id)
        }}
      />
    </div>
  )
}

function CollectionPanel({
  id,
  onEdit,
  onDeleted,
  onRestored,
}: {
  id: string
  onEdit: (collection: CollectionSummary) => void
  onDeleted: () => void
  onRestored: (id: string) => void
}) {
  const navigate = useNavigate()
  const detail = useCollection(id)
  const collections = useCollections()
  const recipes = useRecipes()
  const add = useAddToCollection()
  const remove = useDeleteCollection()
  const restore = useRestoreCollection()
  const reorder = useReorderCollection()
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const summary = collections.data?.find((collection) => collection.id === id)

  const candidates = useMemo(() => {
    const present = new Set(summary?.recipeIds ?? [])
    return (recipes.data ?? [])
      .filter((recipe) => !present.has(recipe.id))
      .map((recipe) => ({
        id: recipe.id,
        label: recipe.name,
        hint: fr.components.display.status[recipe.status],
      }))
  }, [recipes.data, summary?.recipeIds])

  if (detail.isPending || !summary) return null
  if (detail.isError) return <EmptyState title={fr.errors.NOT_FOUND} className="min-h-[320px] p-8" />
  const collection: CollectionDetail = detail.data
  const items = collection.items

  function move(index: number, step: -1 | 1) {
    const order = items.map((item) => item.id)
    const target = index + step
    const a = order[index]
    const b = order[target]
    if (a === undefined || b === undefined) return
    order[index] = b
    order[target] = a
    reorder.mutate({ id, itemIds: order }, { onError: notifyError })
  }

  async function exportPdf() {
    setExporting(true)
    try {
      if (await exportCollectionPdf(id)) toast.show({ message: t.exported })
    } catch (error) {
      notifyError(error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex animate-fade-in flex-col gap-4">
      <ShareCollectionDialog
        open={sharing}
        onClose={() => {
          setSharing(false)
        }}
        collectionId={id}
        name={collection.name}
        recipeIds={summary.recipeIds}
      />
      <Card className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-caption font-medium text-accent-soft">{t.kinds[collection.kind]}</span>
            <h2 className="m-0 truncate text-title font-semibold tracking-tight text-fg">
              {collection.name}
            </h2>
            {collection.description ? (
              <p className="m-0 text-body whitespace-pre-line text-fg-secondary">{collection.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              icon={<GraduationCap size={14} aria-hidden="true" />}
              size="sm"
              disabled={items.length === 0}
              onClick={() => void navigate(`/practice?collection=${id}`)}
            >
              {t.practice}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileDown size={14} aria-hidden="true" />}
              disabled={items.length === 0 || exporting}
              onClick={() => void exportPdf()}
            >
              {t.exportPdf}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Share2 size={14} aria-hidden="true" />}
              disabled={summary.recipeIds.length === 0}
              onClick={() => {
                setSharing(true)
              }}
            >
              {t.shareOpen}
            </Button>
            <IconButton
              variant="ghost"
              size="sm"
              label={t.edit}
              icon={<Pencil size={14} aria-hidden="true" />}
              onClick={() => {
                onEdit(summary)
              }}
            />
            <IconButton
              variant="danger"
              size="sm"
              label={t.delete}
              icon={<Trash2 size={14} aria-hidden="true" />}
              onClick={() => {
                remove.mutate(
                  { id },
                  {
                    onSuccess: () => {
                      onDeleted()
                      toast.undo(t.deleted(collection.name), () => {
                        restore.mutate(
                          { id },
                          {
                            onSuccess: () => {
                              onRestored(id)
                            },
                            onError: notifyError,
                          },
                        )
                      })
                    },
                    onError: notifyError,
                  },
                )
              }}
            />
          </div>
        </div>
        <Combobox
          label={t.addRecipes}
          hideLabel
          options={candidates}
          value={null}
          placeholder={t.addPlaceholder}
          onSelect={(recipeId) => {
            const name = candidates.find((candidate) => candidate.id === recipeId)?.label ?? ''
            add.mutate(
              { id, recipeIds: [recipeId] },
              { onSuccess: () => toast.show({ message: t.added(name) }), onError: notifyError },
            )
          }}
        />
      </Card>

      {items.length === 0 ? (
        <EmptyState title={t.itemsEmpty} className="min-h-[200px] p-8" />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="animate-rise"
              style={{ '--rise-index': Math.min(index, 10) } as CSSProperties}
            >
              <ItemRow
                item={item}
                index={index}
                last={index === items.length - 1}
                onMove={(step) => {
                  move(index, step)
                }}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ItemRow({
  item,
  index,
  last,
  onMove,
}: {
  item: CollectionItem
  index: number
  last: boolean
  onMove: (step: -1 | 1) => void
}) {
  const update = useUpdateCollectionItem()
  const remove = useRemoveCollectionItem()
  const [note, setNote] = useState(item.note ?? '')
  const [price, setPrice] = useState<number | null>(
    item.salePriceCents === null ? null : item.salePriceCents / 100,
  )

  function save(next: { note?: string; price?: number | null }) {
    const nextNote = next.note ?? note
    const nextPrice = next.price === undefined ? price : next.price
    const cents = nextPrice === null ? null : Math.round(nextPrice * 100)
    if ((item.note ?? '') === nextNote.trim() && item.salePriceCents === cents) return
    update.mutate({ id: item.id, note: nextNote, salePriceCents: cents }, { onError: notifyError })
  }

  return (
    <Card className="flex-row items-center gap-3 py-3 transition-colors duration-150 hover:border-border-strong">
      <span className="nums flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-small font-semibold text-fg-secondary">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {item.recipeId ? (
            <Link
              to={`/recipes/${item.recipeId}`}
              className="truncate text-body font-semibold text-fg transition-colors hover:text-accent-soft"
            >
              {item.title}
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 truncate text-body font-semibold text-fg">
              <ScrollText size={14} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
              {item.title}
            </span>
          )}
          {item.status ? (
            <StatusBadge status={item.status} />
          ) : (
            <span className="text-caption text-fg-muted">{t.sheet}</span>
          )}
        </div>
        <Input
          label={t.note}
          hideLabel
          placeholder={t.notePlaceholder}
          value={note}
          maxLength={1000}
          autoComplete="off"
          onChange={(event) => {
            setNote(event.target.value)
          }}
          onBlur={() => {
            save({ note })
          }}
        />
      </div>
      {item.recipeId ? (
        <NumberWithUnit
          label={t.price}
          className="w-[130px]"
          value={price}
          unit="€"
          min={0}
          max={100_000}
          step={0.5}
          decimals={2}
          onChange={(value) => {
            setPrice(value)
          }}
          onBlur={() => {
            save({ price })
          }}
        />
      ) : null}
      <div className="flex shrink-0 flex-col">
        <IconButton
          variant="ghost"
          size="sm"
          label={t.moveUp(item.title)}
          disabled={index === 0}
          icon={<ArrowUp size={14} aria-hidden="true" />}
          onClick={() => {
            onMove(-1)
          }}
        />
        <IconButton
          variant="ghost"
          size="sm"
          label={t.moveDown(item.title)}
          disabled={last}
          icon={<ArrowDown size={14} aria-hidden="true" />}
          onClick={() => {
            onMove(1)
          }}
        />
      </div>
      <IconButton
        variant="ghost"
        size="sm"
        label={t.remove(item.title)}
        icon={<Trash2 size={14} aria-hidden="true" />}
        onClick={() => {
          remove.mutate(
            { id: item.id },
            { onSuccess: () => toast.show({ message: t.removed(item.title) }), onError: notifyError },
          )
        }}
      />
    </Card>
  )
}

function CollectionFormDialog({
  form,
  onClose,
  onSaved,
}: {
  form: { collection: CollectionSummary | null } | null
  onClose: () => void
  onSaved: (id: string) => void
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
  onSaved: (id: string) => void
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
            onSaved(saved.id)
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
      <Textarea
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
