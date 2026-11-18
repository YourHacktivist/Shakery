import { Command } from 'cmdk'
import { CornerDownLeft, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { normalizeName } from '@core/normalize'
import { Dialog } from '@renderer/components/Dialog'
import { Kbd } from '@renderer/components/Kbd'
import { fr } from '@renderer/i18n/fr'

export type CommandPaletteItem = {
  id: string
  /** Shown and searched; unique within the palette. */
  label: string
  icon?: ReactNode
  /** Extra search terms (synonyms). Accents and case never matter. */
  keywords?: readonly string[]
  onSelect: () => void
}

export type CommandPaletteGroup = {
  id: string
  heading: string
  items: readonly CommandPaletteItem[]
}

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
  groups: readonly CommandPaletteGroup[]
  /** Text already in the search field when it opens (a letter typed outside a field). */
  initialQuery?: string
  className?: string
}

/**
 * Ctrl+K palette: a search field over grouped actions, in the glass dialog. Arrows move,
 * Enter runs the action and closes the palette. The full search arrives in phase 5.
 */
export function CommandPalette({ open, onClose, groups, initialQuery = '', className }: CommandPaletteProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fr.shell.palette.title}
      bare
      showCloseButton={false}
      size="lg"
      placement="top"
      className={className}
    >
      <PaletteBody groups={groups} initialQuery={initialQuery} onClose={onClose} />
    </Dialog>
  )
}

/** Mounted on each opening, so the search starts again from `initialQuery`. */
function PaletteBody({
  groups,
  initialQuery,
  onClose,
}: {
  groups: readonly CommandPaletteGroup[]
  initialQuery: string
  onClose: () => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const t = fr.shell.palette
  const keys = fr.shell.keys

  return (
    <Command label={t.label} loop vimBindings={false} className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 focus-within:border-border-strong">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-fg-muted" />
        <Command.Input
          data-autofocus=""
          value={query}
          onValueChange={setQuery}
          placeholder={t.placeholder}
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-sans text-lead text-fg outline-none placeholder:text-fg-muted focus-visible:outline-none"
        />
      </div>
      <Command.List
        label={t.listLabel}
        className="max-h-[min(420px,55vh)] scroll-py-2 overflow-y-auto p-2 [scrollbar-color:var(--color-border-strong)_transparent] [scrollbar-width:thin]"
      >
        <Command.Empty className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
          <span className="text-body font-semibold text-fg">{t.empty}</span>
          <span className="max-w-sm text-small text-fg-secondary">{t.emptyHint}</span>
        </Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.id}
            heading={group.heading}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.01em] [&_[cmdk-group-heading]]:text-fg-muted"
          >
            {group.items.map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                keywords={[normalizeName(item.label), ...(item.keywords ?? []).map(normalizeName)]}
                onSelect={() => {
                  item.onSelect()
                  onClose()
                }}
                className="group flex h-10 cursor-pointer items-center gap-3 rounded-field px-3 text-body font-medium text-fg-secondary select-none data-[selected=true]:bg-border-strong data-[selected=true]:text-fg"
              >
                {item.icon ? (
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 text-fg-muted group-data-[selected=true]:text-accent"
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <CornerDownLeft
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-fg-muted opacity-0 group-data-[selected=true]:opacity-100"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-3 text-caption text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Kbd>{keys.up}</Kbd>
          <Kbd>{keys.down}</Kbd>
          {t.hintMove}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>{keys.enter}</Kbd>
          {t.hintOpen}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>{keys.escape}</Kbd>
          {t.hintClose}
        </span>
      </div>
    </Command>
  )
}
