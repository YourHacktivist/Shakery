import { ArrowDown, ArrowUp, ScrollText, Trash2 } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { IconButton } from '@renderer/components/Button'
import { Combobox } from '@renderer/components/Combobox'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import {
  useAddToCollection,
  useRecipes,
  useRemoveCollectionItem,
  useReorderCollection,
  useRestoreCollectionItem,
  useUpdateCollectionItem,
} from '@renderer/lib/queries'
import type { CollectionDetail, CollectionItem } from '@shared/domain/workshop'

const t = fr.workshop.collections

/**
 * Tab « Fiches » of a collection (section 10.10): recipes added by name, in a free order, each
 * with a note and a sale price. Rows separated by hairlines, the order in discreet figures (D-053).
 */
export function CollectionItems({
  collection,
  recipeIds,
}: {
  collection: CollectionDetail
  recipeIds: readonly string[]
}) {
  const recipes = useRecipes()
  const add = useAddToCollection()
  const reorder = useReorderCollection()
  const items = collection.items

  const candidates = useMemo(() => {
    const present = new Set(recipeIds)
    return (recipes.data ?? [])
      .filter((recipe) => !present.has(recipe.id))
      .map((recipe) => ({
        id: recipe.id,
        label: recipe.name,
        hint: fr.components.display.status[recipe.status],
      }))
  }, [recipes.data, recipeIds])

  function move(index: number, step: -1 | 1) {
    const order = items.map((item) => item.id)
    const target = index + step
    const a = order[index]
    const b = order[target]
    if (a === undefined || b === undefined) return
    order[index] = b
    order[target] = a
    reorder.mutate({ id: collection.id, itemIds: order }, { onError: notifyError })
  }

  return (
    <div className="flex flex-col gap-4">
      <Combobox
        label={t.addRecipes}
        hideLabel
        className="w-full max-w-md"
        options={candidates}
        value={null}
        placeholder={t.addPlaceholder}
        onSelect={(recipeId) => {
          const name = candidates.find((candidate) => candidate.id === recipeId)?.label ?? ''
          add.mutate(
            { id: collection.id, recipeIds: [recipeId] },
            { onSuccess: () => toast.show({ message: t.added(name) }), onError: notifyError },
          )
        }}
      />

      {items.length === 0 ? (
        <EmptyState title={t.itemsEmpty} className="min-h-[200px] p-8" />
      ) : (
        <ol className="m-0 list-none border-t border-border p-0">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="animate-rise border-b border-border"
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
  const restore = useRestoreCollectionItem()
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
      <span className="nums w-6 shrink-0 text-right text-body font-semibold text-fg-muted">{index + 1}</span>
      <div className="flex min-w-0 flex-1 basis-48 items-center gap-2">
        {item.recipeId ? (
          <Link
            to={`/recipes/${item.recipeId}`}
            className="truncate rounded-sm text-body font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
          >
            {item.title}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-body font-semibold text-fg">
            <ScrollText size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-accent" />
            {item.title}
          </span>
        )}
        {item.status ? (
          <StatusBadge status={item.status} />
        ) : (
          <span className="shrink-0 text-caption text-fg-muted">{t.sheet}</span>
        )}
      </div>
      <Input
        label={t.note}
        hideLabel
        className="min-w-0 flex-1 basis-56"
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
      {item.recipeId ? (
        <NumberWithUnit
          label={t.price}
          hideLabel
          placeholder={t.price}
          className="w-[130px] shrink-0"
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
      ) : (
        <span aria-hidden="true" className="w-[130px] shrink-0" />
      )}
      <div className="flex shrink-0 items-center gap-1">
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
        <IconButton
          variant="ghost"
          size="sm"
          label={t.remove(item.title)}
          icon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => {
            remove.mutate(
              { id: item.id },
              {
                onSuccess: () => {
                  // Every deletion offers « Annuler » for 8 seconds (section 10.1).
                  toast.undo(t.removed(item.title), () => {
                    restore.mutate({ id: item.id }, { onError: notifyError })
                  })
                },
                onError: notifyError,
              },
            )
          }}
        />
      </div>
    </div>
  )
}
