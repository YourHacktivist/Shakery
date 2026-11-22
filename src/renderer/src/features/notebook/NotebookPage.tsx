import {
  BookOpen,
  Check,
  Lightbulb,
  Link2,
  Pin,
  PinOff,
  Plus,
  StickyNote,
  Trash2,
  Wine,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { normalizeName } from '@core/normalize'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { Textarea } from '@renderer/components/Textarea'
import { toast } from '@renderer/components/Toast'
import { emptyRecipe } from '@renderer/features/recipes/model'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatRelative } from '@renderer/lib/format'
import {
  useCreateEntry,
  useCreateRecipe,
  useDeleteEntry,
  useNotebook,
  useSearch,
  useUpdateEntry,
} from '@renderer/lib/queries'
import type { NotebookEntry, NotebookInput } from '@shared/domain/journal'

const t = fr.journal.notebook

/** Delay after the last keystroke before a note is saved on its own. */
const AUTOSAVE_MS = 600

type Draft = {
  title: string
  body: string
  tags: string
  isPinned: boolean
  links: NotebookEntry['links']
}

function toDraft(entry: NotebookEntry): Draft {
  return {
    title: entry.title,
    body: entry.body,
    tags: entry.tags.join(', '),
    isPinned: entry.isPinned,
    links: entry.links,
  }
}

function toInput(draft: Draft): NotebookInput {
  return {
    title: draft.title.trim() === '' ? t.untitled : draft.title.trim(),
    body: draft.body,
    tags: [...new Set(draft.tags.split(',').map((tag) => tag.trim()))]
      .filter((tag) => tag !== '')
      .slice(0, 30),
    isPinned: draft.isPinned,
    links: draft.links.map(({ entityType, entityId }) => ({ entityType, entityId })),
  }
}

function sameDraft(a: Draft, b: Draft): boolean {
  return JSON.stringify(toInput(a)) === JSON.stringify(toInput(b))
}

/** Notebook (section 10.7): free notes, pinned first, linked to recipes, ingredients and bottles. */
export function NotebookPage() {
  const notebook = useNotebook()
  const create = useCreateEntry()
  // /notebook?entry=<id>, from the palette, opens that note.
  const { key, search } = useLocation()
  const wanted = new URLSearchParams(search).get('entry')
  const [selectedId, setSelectedId] = useState<string | null>(wanted)
  const [query, setQuery] = useState('')
  const [visit, setVisit] = useState(key)
  if (visit !== key) {
    setVisit(key)
    if (wanted) {
      setSelectedId(wanted)
      setQuery('')
    }
  }

  const entries = useMemo(
    () =>
      [...(notebook.data ?? [])].sort(
        (a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt,
      ),
    [notebook.data],
  )
  const needle = normalizeName(query)
  const shown =
    needle === ''
      ? entries
      : entries.filter((entry) =>
          normalizeName([entry.title, entry.body, ...entry.tags].join(' ')).includes(needle),
        )
  const selected = entries.find((entry) => entry.id === selectedId) ?? null

  function newEntry() {
    create.mutate(
      { title: t.untitled, body: '', tags: [], isPinned: false, links: [] },
      {
        onSuccess: (entry) => {
          setQuery('')
          setSelectedId(entry.id)
        },
        onError: notifyError,
      },
    )
  }

  const addButton = (
    <Button icon={<Plus size={16} aria-hidden="true" />} disabled={create.isPending} onClick={newEntry}>
      {t.add}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(entries.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {addButton}
      </header>

      {notebook.isPending ? null : entries.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={addButton}
        />
      ) : (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-4">
          <Card className="sticky top-0 max-h-[calc(100vh-200px)] gap-3 overflow-hidden p-3">
            <Input
              variant="search"
              label={t.filter}
              hideLabel
              placeholder={t.filterPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
            />
            <ul className="-mx-1 m-0 flex min-h-0 list-none flex-col gap-1 overflow-y-auto p-0 px-1">
              {shown.map((entry, index) => (
                <li
                  key={entry.id}
                  className="animate-rise"
                  style={{ '--rise-index': Math.min(index, 8) } as CSSProperties}
                >
                  <button
                    type="button"
                    aria-current={entry.id === selectedId ? 'true' : undefined}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-1 rounded-nested border px-3 py-2 text-left transition-[background-color,border-color] duration-150 ease-out-soft',
                      entry.id === selectedId
                        ? 'border-accent/30 bg-[linear-gradient(90deg,rgb(239_120_43/0.13),rgb(239_120_43/0.03))]'
                        : 'border-transparent hover:bg-tint/4',
                    )}
                    onClick={() => {
                      setSelectedId(entry.id)
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {entry.isPinned ? (
                        <Pin size={12} strokeWidth={2} aria-label={t.pin} className="shrink-0 text-accent" />
                      ) : null}
                      <span className="truncate text-body font-semibold text-fg">{entry.title}</span>
                    </span>
                    {entry.body.trim() === '' ? null : (
                      <span className="line-clamp-2 text-small leading-snug text-fg-secondary">
                        {entry.body}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                      <span>{formatRelative(entry.updatedAt)}</span>
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-surface-2 px-1.5 text-fg-secondary">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {selected ? (
            <Editor
              key={selected.id}
              entry={selected}
              onDeleted={() => {
                setSelectedId(null)
              }}
              onRestored={setSelectedId}
            />
          ) : (
            <EmptyState
              icon={<StickyNote size={16} strokeWidth={1.75} aria-hidden="true" />}
              title={t.pick}
              className="min-h-[320px] p-8"
            />
          )}
        </div>
      )}
    </div>
  )
}

/** The « @ » being typed just before the caret, if any: its position and the text after it. */
function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const match = /(^|\s)@([^\s@]{0,40})$/u.exec(before)
  if (!match) return null
  const query = match[2] ?? ''
  return { start: caret - query.length - 1, query }
}

const LINK_ICONS = { recipe: BookOpen, ingredient: Wine, product: Wine } as const

function Editor({
  entry,
  onDeleted,
  onRestored,
}: {
  entry: NotebookEntry
  onDeleted: () => void
  onRestored: (id: string) => void
}) {
  const navigate = useNavigate()
  const { mutate: save } = useUpdateEntry()
  const remove = useDeleteEntry()
  const recreate = useCreateEntry()
  const createRecipe = useCreateRecipe()
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry))
  const [savedDraft, setSavedDraft] = useState<Draft>(() => toDraft(entry))
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [active, setActive] = useState(0)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const latest = useRef(draft)
  const lastSaved = useRef(savedDraft)
  const dirty = !sameDraft(draft, savedDraft)
  const search = useSearch(mention?.query ?? '')
  const hits = mention && mention.query !== '' ? (search.data ?? []).slice(0, 6) : []

  useEffect(() => {
    latest.current = draft
  }, [draft])

  // Saved on its own a moment after the last change, and when the editor closes.
  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => {
      const snapshot = draft
      save(
        { id: entry.id, data: toInput(snapshot) },
        {
          onSuccess: () => {
            lastSaved.current = snapshot
            setSavedDraft(snapshot)
          },
          onError: notifyError,
        },
      )
    }, AUTOSAVE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [draft, dirty, entry.id, save])

  // A change typed less than a moment before the editor closes is saved too.
  useEffect(() => {
    const id = entry.id
    return () => {
      if (!sameDraft(latest.current, lastSaved.current)) save({ id, data: toInput(latest.current) })
    }
  }, [entry.id, save])

  function patch(next: Partial<Draft>) {
    setDraft((previous) => ({ ...previous, ...next }))
  }

  function pick(hit: { entityType: 'recipe' | 'ingredient' | 'product'; id: string; title: string }) {
    if (!mention) return
    const before = draft.body.slice(0, mention.start)
    const after = draft.body.slice(mention.start + mention.query.length + 1)
    const inserted = `${hit.title} `
    const links = draft.links.some((link) => link.entityId === hit.id)
      ? draft.links
      : [...draft.links, { entityType: hit.entityType, entityId: hit.id, name: hit.title }]
    patch({ body: before + inserted + after, links })
    setMention(null)
    const caret = before.length + inserted.length
    requestAnimationFrame(() => {
      bodyRef.current?.focus()
      bodyRef.current?.setSelectionRange(caret, caret)
    })
  }

  function onBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (hits.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + hits.length) % hits.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const hit = hits[active]
      if (!hit) return
      event.preventDefault()
      if (!search.isPlaceholderData) {
        pick(hit)
        return
      }
      // The list still answers the first letters: the name typed decides, once its results are there.
      void search.refetch({ cancelRefetch: false }).then(({ data }) => {
        const best = data?.[0]
        if (best && bodyRef.current?.value === draft.body) pick(best)
      })
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setMention(null)
    }
  }

  function deleteEntry() {
    const input = toInput(draft)
    remove.mutate(
      { id: entry.id },
      {
        onSuccess: () => {
          onDeleted()
          toast.undo(t.deleted(input.title), () => {
            recreate.mutate(input, {
              onSuccess: (restored) => {
                onRestored(restored.id)
              },
              onError: notifyError,
            })
          })
        },
        onError: notifyError,
      },
    )
  }

  function toIdea() {
    const input = toInput(draft)
    createRecipe.mutate(
      {
        data: { ...emptyRecipe(), name: input.title, status: 'idea', notes: draft.body.trim() || null },
        label: null,
      },
      {
        onSuccess: (recipe) => {
          toast.show({ message: t.ideaCreated(recipe.name) })
          void navigate(`/recipes/${recipe.id}`)
        },
        onError: notifyError,
      },
    )
  }

  const listboxId = `mentions-${entry.id}`

  return (
    <Card className="animate-fade-in gap-4">
      <div className="flex items-center justify-between gap-3">
        <span
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-caption transition-colors duration-200',
            dirty ? 'text-fg-muted' : 'text-status-ok',
          )}
        >
          {dirty ? null : <Check size={12} strokeWidth={2.25} aria-hidden="true" />}
          {dirty ? '…' : t.saved}
        </span>
        <div className="flex items-center gap-1.5">
          <IconButton
            variant="ghost"
            size="sm"
            label={draft.isPinned ? t.unpin : t.pin}
            aria-pressed={draft.isPinned}
            className={draft.isPinned ? 'text-accent' : undefined}
            icon={
              draft.isPinned ? (
                <PinOff size={14} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Pin size={14} strokeWidth={1.75} aria-hidden="true" />
              )
            }
            onClick={() => {
              patch({ isPinned: !draft.isPinned })
            }}
          />
          <Button
            variant="outline"
            size="sm"
            icon={<Lightbulb size={14} aria-hidden="true" />}
            disabled={createRecipe.isPending}
            onClick={toIdea}
          >
            {t.toIdea}
          </Button>
          <IconButton
            variant="danger"
            size="sm"
            label={t.delete}
            icon={<Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
            onClick={deleteEntry}
          />
        </div>
      </div>

      <Input
        label={t.titleField}
        value={draft.title}
        maxLength={200}
        autoComplete="off"
        onChange={(event) => {
          patch({ title: event.target.value })
        }}
      />

      <div className="relative">
        <Textarea
          ref={bodyRef}
          label={t.body}
          description={t.bodyHint}
          rows={10}
          maxLength={20_000}
          value={draft.body}
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={hits.length > 0 ? `${listboxId}-${String(active)}` : undefined}
          onKeyDown={onBodyKeyDown}
          onChange={(event) => {
            patch({ body: event.target.value })
            setMention(mentionAt(event.target.value, event.target.selectionStart))
            setActive(0)
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setMention(null)
            }, 120)
          }}
        />
        {hits.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t.mentions}
            className="absolute right-3 bottom-8 left-3 z-20 m-0 flex animate-pop-in list-none flex-col gap-0.5 rounded-nested border border-border-strong bg-surface-2 p-1 shadow-float"
          >
            {hits.map((hit, index) => {
              const Icon = LINK_ICONS[hit.entityType]
              return (
                <li
                  key={`${hit.entityType}-${hit.id}`}
                  id={`${listboxId}-${String(index)}`}
                  role="option"
                  aria-selected={index === active}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-body',
                    index === active ? 'bg-accent/14 text-fg' : 'text-fg-secondary',
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    pick(hit)
                  }}
                  onPointerEnter={() => {
                    setActive(index)
                  }}
                >
                  <Icon size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-accent" />
                  <span className="truncate font-medium">{hit.title}</span>
                  {hit.detail ? (
                    <span className="ml-auto truncate text-caption text-fg-muted">{hit.detail}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <Input
        label={t.tags}
        description={t.tagsHint}
        value={draft.tags}
        autoComplete="off"
        onChange={(event) => {
          patch({ tags: event.target.value })
        }}
      />

      {draft.links.length > 0 ? (
        <section aria-label={t.links} className="flex flex-col gap-2">
          <h2 className="m-0 flex items-center gap-1.5 text-small font-medium text-fg-secondary">
            <Link2 size={14} strokeWidth={1.75} aria-hidden="true" />
            {t.links}
          </h2>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {draft.links.map((link) => {
              const Icon = LINK_ICONS[link.entityType]
              const name = link.name ?? t.linkDeleted
              const to =
                link.entityType === 'recipe'
                  ? `/recipes/${link.entityId}`
                  : link.entityType === 'ingredient'
                    ? `/bar?ingredient=${link.entityId}`
                    : null
              return (
                <li
                  key={link.entityId}
                  className="flex animate-pop-in items-center gap-1 rounded-full border border-accent/25 bg-accent/8 py-0.5 pr-0.5 pl-2.5 text-small"
                >
                  <Icon size={12} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
                  {to && link.name ? (
                    <Link to={to} className="font-medium text-fg hover:text-accent-soft">
                      {name}
                    </Link>
                  ) : (
                    <span className={link.name ? 'font-medium text-fg' : 'text-fg-muted italic'}>{name}</span>
                  )}
                  <button
                    type="button"
                    aria-label={t.removeLink(name)}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                    onClick={() => {
                      patch({ links: draft.links.filter((other) => other.entityId !== link.entityId) })
                    }}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </Card>
  )
}
