import { ArrowLeft, ChefHat, FileDown, Pencil, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLink } from '@renderer/components/ArrowLink'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/EmptyState'
import { MoreMenu } from '@renderer/components/MoreMenu'
import { RichText } from '@renderer/components/RichText'
import { tabIds, UnderlineTabs } from '@renderer/components/UnderlineTabs'
import { CollectionFormDialog, type CollectionFormState } from '@renderer/features/collections/CollectionForm'
import { CollectionItems } from '@renderer/features/collections/CollectionItems'
import { collectionPath } from '@renderer/features/collections/paths'
import { ShareCollectionDialog } from '@renderer/features/collections/ShareCollectionDialog'
import { useCollectionActions } from '@renderer/features/collections/useCollectionActions'
import { PracticePanel } from '@renderer/features/practice/PracticePanel'
import { fr } from '@renderer/i18n/fr'
import { formatDate } from '@renderer/lib/format'
import { useCollection, useCollections } from '@renderer/lib/queries'

const t = fr.workshop.collections
const TAB_PREFIX = 'collection'

type Tab = 'recipes' | 'practice'

/**
 * A collection opened (section 10.10, D-057): its recipes on the tab « Fiches », the revision on
 * the tab « Réviser ». Préparer, the PDF and the sharing stay in the bar of the tabs.
 */
export function CollectionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'practice' ? 'practice' : 'recipes'
  const detail = useCollection(id)
  const collections = useCollections()
  const actions = useCollectionActions()
  const [form, setForm] = useState<CollectionFormState>(null)
  const [sharing, setSharing] = useState(false)
  const summary = collections.data?.find((collection) => collection.id === id)

  if (detail.isPending || collections.isPending) return null
  if (detail.isError || !summary) {
    return (
      <div className="mx-auto flex max-w-page flex-col">
        <EmptyState
          title={fr.errors.NOT_FOUND}
          className="min-h-[320px] p-8"
          action={<ArrowLink to="/collections">{t.title}</ArrowLink>}
        />
      </div>
    )
  }

  const collection = detail.data
  const items = collection.items
  const toPrepare = items.flatMap((item) => (item.recipeId ? [item.recipeId] : []))
  const firstToPrepare = toPrepare[0]
  const ids = tabIds(TAB_PREFIX, tab)
  const meta = [
    { label: t.columns.kind, value: t.kinds[collection.kind] },
    { label: t.columns.count, value: String(items.length) },
    { label: t.columns.updated, value: formatDate(collection.updatedAt) },
  ]

  return (
    <div className="mx-auto flex max-w-page flex-col">
      <header className="flex flex-col gap-3">
        <Link
          to="/collections"
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-small font-medium text-fg-secondary transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          {t.title}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
            <h1 className="m-0 text-title font-semibold tracking-tight break-words text-fg">
              {collection.name}
            </h1>
            {collection.description ? (
              <RichText text={collection.description} className="text-body text-fg-secondary" />
            ) : null}
          </div>
          <dl className="m-0 flex shrink-0">
            {meta.map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1 border-l border-border px-5 last:pr-0">
                <dt className="text-caption font-semibold tracking-[0.1em] text-fg-muted uppercase">
                  {entry.label}
                </dt>
                <dd className="nums m-0 text-lead whitespace-nowrap text-fg">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 border-b border-border">
        <UnderlineTabs<Tab>
          label={t.tabs.listLabel}
          idPrefix={TAB_PREFIX}
          value={tab}
          onChange={(next) => {
            setParams(next === 'practice' ? { tab: 'practice' } : {}, { replace: true })
          }}
          tabs={[
            { value: 'recipes', label: t.tabs.recipes, count: items.length },
            { value: 'practice', label: t.practice },
          ]}
        />
        <div className="flex items-center gap-1 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChefHat size={14} aria-hidden="true" />}
            disabled={firstToPrepare === undefined}
            onClick={() => {
              // The whole collection in its order: the arrows of the preparation mode follow it.
              if (firstToPrepare) void navigate(`/prepare/${firstToPrepare}?ids=${toPrepare.join(',')}`)
            }}
          >
            {t.prepare}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileDown size={14} aria-hidden="true" />}
            disabled={items.length === 0 || actions.exporting === id}
            onClick={() => void actions.exportPdf(id)}
          >
            {t.exportPdf}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Share2 size={14} aria-hidden="true" />}
            disabled={summary.recipeIds.length === 0}
            onClick={() => {
              setSharing(true)
            }}
          >
            {t.shareOpen}
          </Button>
          <MoreMenu
            label={t.more}
            items={[
              {
                id: 'edit',
                label: t.edit,
                icon: <Pencil size={14} aria-hidden="true" />,
                onSelect: () => {
                  setForm({ collection: summary })
                },
              },
              {
                id: 'delete',
                label: t.delete,
                icon: <Trash2 size={14} aria-hidden="true" />,
                danger: true,
                separated: true,
                onSelect: () => {
                  actions.removeCollection(collection, {
                    onDeleted: () => void navigate('/collections'),
                    onRestored: (restored) => void navigate(collectionPath(restored)),
                  })
                },
              },
            ]}
          />
        </div>
      </div>

      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="mt-7">
        {tab === 'practice' ? (
          <PracticePanel key={id} collectionId={id} itemCount={items.length} />
        ) : (
          <CollectionItems collection={collection} recipeIds={summary.recipeIds} />
        )}
      </div>

      <CollectionFormDialog
        form={form}
        onClose={() => {
          setForm(null)
        }}
        onSaved={() => {
          setForm(null)
        }}
      />
      <ShareCollectionDialog
        open={sharing}
        onClose={() => {
          setSharing(false)
        }}
        collectionId={id}
        name={collection.name}
        recipeIds={summary.recipeIds}
      />
    </div>
  )
}
