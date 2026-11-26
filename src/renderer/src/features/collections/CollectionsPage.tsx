import { FileDown, GraduationCap, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/EmptyState'
import { MoreMenu } from '@renderer/components/MoreMenu'
import { InlineText } from '@renderer/components/RichText'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { CollectionFormDialog, type CollectionFormState } from '@renderer/features/collections/CollectionForm'
import { collectionPath } from '@renderer/features/collections/paths'
import { ShareCollectionDialog } from '@renderer/features/collections/ShareCollectionDialog'
import { useCollectionActions } from '@renderer/features/collections/useCollectionActions'
import { SessionScore } from '@renderer/features/practice/SessionScore'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate } from '@renderer/lib/format'
import { useCollections, usePracticeHistory } from '@renderer/lib/queries'
import type { CollectionSummary, PracticeSession } from '@shared/domain/workshop'

const t = fr.workshop.collections
/** Sessions shown in the calm column: the latest ones, the full history is in each collection. */
const RECENT = 5

/** First line of a description, without its list mark: the row shows a short summary. */
function firstLine(description: string | null): string | null {
  const line = description
    ?.split('\n')
    .map((text) => text.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .find((text) => text !== '')
  return line ?? null
}

/**
 * Collections (section 10.10, D-057): one row per collection with its frequent actions, the rest
 * behind « Autres actions ». The items, their note and their price are on the page of each one.
 */
export function CollectionsPage() {
  const navigate = useNavigate()
  const collections = useCollections()
  const history = usePracticeHistory()
  const actions = useCollectionActions()
  const [form, setForm] = useState<CollectionFormState>(null)
  const [sharing, setSharing] = useState<CollectionSummary | null>(null)
  const list = collections.data ?? []
  const sessions = (history.data ?? [])
    .filter((session) => session.collectionId !== null && session.mode !== 'calc')
    .slice(0, RECENT)

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
    <div className="mx-auto flex max-w-page flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(list.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {list.length > 0 ? addButton : null}
      </header>

      {collections.isPending ? null : list.length === 0 ? (
        <EmptyState
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={addButton}
        />
      ) : (
        <div className="@container">
          <div
            className={cn(
              'grid items-start gap-x-14 gap-y-10',
              sessions.length > 0 && '@min-[68rem]:grid-cols-[minmax(0,1fr)_272px]',
            )}
          >
            <section aria-label={t.listLabel} className="flex min-w-0 flex-col gap-4">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col />
                  <col className="w-[104px]" />
                  <col className="w-[72px]" />
                  <col className="w-[124px]" />
                  <col className="w-[252px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-caption font-semibold tracking-[0.1em] text-fg-muted uppercase">
                    <th scope="col" className="pr-6 pb-3 font-semibold">
                      {t.columns.name}
                    </th>
                    <th scope="col" className="pr-6 pb-3 font-semibold">
                      {t.columns.kind}
                    </th>
                    <th scope="col" className="pr-6 pb-3 text-right font-semibold">
                      {t.columns.count}
                    </th>
                    <th scope="col" className="pr-6 pb-3 font-semibold">
                      {t.columns.updated}
                    </th>
                    <td className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((collection, index) => (
                    <CollectionRow
                      key={collection.id}
                      collection={collection}
                      index={index}
                      exporting={actions.exporting === collection.id}
                      onPractice={() => void navigate(collectionPath(collection.id, 'practice'))}
                      onExport={() => void actions.exportPdf(collection.id)}
                      onShare={() => {
                        setSharing(collection)
                      }}
                      onEdit={() => {
                        setForm({ collection })
                      }}
                      onDelete={() => {
                        actions.removeCollection(collection)
                      }}
                    />
                  ))}
                </tbody>
              </table>
              <p className="m-0 text-small text-fg-muted">{t.listHint}</p>
            </section>
            {sessions.length > 0 ? <RecentSessions sessions={sessions} /> : null}
          </div>
        </div>
      )}

      <CollectionFormDialog
        form={form}
        onClose={() => {
          setForm(null)
        }}
        onSaved={(saved) => {
          const created = form?.collection === null
          setForm(null)
          if (created) void navigate(collectionPath(saved.id))
        }}
      />
      <ShareCollectionDialog
        open={sharing !== null}
        onClose={() => {
          setSharing(null)
        }}
        collectionId={sharing?.id ?? ''}
        name={sharing?.name ?? ''}
        recipeIds={sharing?.recipeIds ?? []}
      />
    </div>
  )
}

function CollectionRow({
  collection,
  index,
  exporting,
  onPractice,
  onExport,
  onShare,
  onEdit,
  onDelete,
}: {
  collection: CollectionSummary
  index: number
  exporting: boolean
  onPractice: () => void
  onExport: () => void
  onShare: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const count = collection.recipeIds.length + collection.sheetCount
  const summary = firstLine(collection.description)
  return (
    <tr
      className="animate-rise border-b border-border"
      style={{ '--rise-index': Math.min(index, 8) } as CSSProperties}
    >
      <td className="py-3 pr-6 align-middle">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={collectionPath(collection.id)}
            className="w-fit max-w-full truncate rounded-sm text-lead font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
          >
            {collection.name}
          </Link>
          {summary ? (
            <span className="line-clamp-2 text-small break-words text-fg-secondary">
              <InlineText text={summary} />
            </span>
          ) : null}
        </div>
      </td>
      <td className="py-3 pr-6 align-middle text-body text-fg-secondary">{t.kinds[collection.kind]}</td>
      <td className="nums py-3 pr-6 text-right align-middle text-heading font-semibold text-accent-soft">
        {count}
      </td>
      <td className="nums py-3 pr-6 align-middle text-small whitespace-nowrap text-fg-secondary">
        {formatDate(collection.updatedAt)}
      </td>
      <td className="py-3 align-middle">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t.practiceOf(collection.name)}
            icon={<GraduationCap size={14} aria-hidden="true" />}
            disabled={count === 0}
            onClick={onPractice}
          >
            {t.practice}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t.exportPdfOf(collection.name)}
            icon={<FileDown size={14} aria-hidden="true" />}
            disabled={count === 0 || exporting}
            onClick={onExport}
          >
            {t.exportPdf}
          </Button>
          <MoreMenu
            label={t.moreOf(collection.name)}
            items={[
              {
                id: 'share',
                label: t.shareOpen,
                icon: <Share2 size={14} aria-hidden="true" />,
                disabled: collection.recipeIds.length === 0,
                onSelect: onShare,
              },
              { id: 'edit', label: t.edit, icon: <Pencil size={14} aria-hidden="true" />, onSelect: onEdit },
              {
                id: 'delete',
                label: t.delete,
                icon: <Trash2 size={14} aria-hidden="true" />,
                danger: true,
                separated: true,
                onSelect: onDelete,
              },
            ]}
          />
        </div>
      </td>
    </tr>
  )
}

/** The calm column (D-057): the last sessions over every collection, with their score. */
function RecentSessions({ sessions }: { sessions: readonly PracticeSession[] }) {
  return (
    <section aria-labelledby="collections-recent-title" className="flex min-w-0 flex-col">
      <SectionTitle id="collections-recent-title" tone="muted" className="pb-1">
        {t.recent}
      </SectionTitle>
      <ol className="m-0 list-none p-0">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-2.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              {session.collectionId ? (
                <Link
                  to={collectionPath(session.collectionId, 'practice')}
                  className="w-fit max-w-full truncate rounded-sm text-body font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
                >
                  {session.collectionName ?? t.title}
                </Link>
              ) : null}
              <span className="nums text-small text-fg-muted">
                {t.sessionMeta(
                  session.mode === 'flashcards'
                    ? fr.workshop.practice.modes.flashcards
                    : fr.workshop.practice.modes.quiz,
                  formatDate(session.finishedAt),
                )}
              </span>
            </div>
            <SessionScore score={session.score} total={session.total} />
          </li>
        ))}
      </ol>
    </section>
  )
}
