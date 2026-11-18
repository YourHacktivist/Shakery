import * as Popover from '@radix-ui/react-popover'
import { Command, useCommandState } from 'cmdk'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { normalizeName } from '@core/normalize'
import {
  FieldLayout,
  fieldFrameClass,
  fieldInputClass,
  focusFieldInput,
  useFieldIds,
} from '@renderer/components/Input'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.components.forms.combobox

export type ComboboxOption = {
  id: string
  label: string
  /** Muted detail on the right, e.g. the category of an ingredient. */
  hint?: string
}

/** Value of the « create » item in the list; option ids are UUIDs and cannot collide with it. */
const CREATE_VALUE = 'combobox:create'

type IndexedOption = ComboboxOption & { normalized: string; words: string[] }

/**
 * Options matching a query, accents and case ignored: every word typed must appear in the label.
 * Labels that start with the query come first, then those where a word starts with it.
 */
export function filterOptions<O extends { normalized: string; words: string[] }>(
  options: readonly O[],
  query: string,
): O[] {
  const normalized = normalizeName(query)
  if (normalized === '') return [...options]
  const terms = normalized.split(' ')
  const rank = (option: O) => {
    if (option.normalized.startsWith(normalized)) return 0
    if (option.words.some((word) => word.startsWith(terms[0] ?? ''))) return 1
    return 2
  }
  return options
    .filter((option) => terms.every((term) => option.normalized.includes(term)))
    .map((option) => ({ option, rank: rank(option) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ option }) => option)
}

type ComboboxProps = {
  label: string
  hideLabel?: boolean
  description?: ReactNode
  error?: ReactNode
  options: readonly ComboboxOption[]
  /** Id of the selected option, or null. */
  value: string | null
  onSelect: (id: string) => void
  /** When given, a typed name that matches no option exactly can be created. */
  onCreate?: (label: string) => void
  placeholder?: string
  /** Shown when nothing matches and creation is not offered. */
  emptyText?: string
  disabled?: boolean
  id?: string
  ref?: Ref<HTMLInputElement>
  /** Classes of the outer block (label, field and messages). */
  className?: string
}

/** Autocomplete with creation (ingredient picker): cmdk list in a Radix popover anchored to the field. */
export function Combobox({
  label,
  hideLabel = false,
  description,
  error,
  options,
  value,
  onSelect,
  onCreate,
  placeholder,
  emptyText = t.empty,
  disabled = false,
  id,
  ref,
  className,
}: ComboboxProps) {
  const ids = useFieldIds({ id, description, error })
  const listboxId = `${ids.inputId}-list`
  const frameRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  /** Text being typed; null while the field shows the selected option. */
  const [query, setQuery] = useState<string | null>(null)
  /** Value of the highlighted item of the list (cmdk value). */
  const [highlighted, setHighlighted] = useState('')

  const indexed = useMemo<IndexedOption[]>(
    () =>
      options.map((option) => {
        const normalized = normalizeName(option.label)
        return { ...option, normalized, words: normalized.split(' ') }
      }),
    [options],
  )

  const selected = options.find((option) => option.id === value)

  function resultsFor(text: string | null) {
    const matches = text === null ? indexed : filterOptions(indexed, text)
    const typed = text?.trim() ?? ''
    const normalized = normalizeName(typed)
    const exact = indexed.some((option) => option.normalized === normalized)
    const creatable = onCreate !== undefined && normalized !== '' && !exact ? typed : null
    return { matches, creatable }
  }

  const { matches, creatable } = resultsFor(query)

  /** First item to highlight: the selected option when it is listed, otherwise the best match. */
  function firstValue(text: string | null) {
    const results = resultsFor(text)
    if (text === null && value !== null && results.matches.some((option) => option.id === value)) return value
    return results.matches[0]?.id ?? (results.creatable === null ? '' : CREATE_VALUE)
  }

  function openList(text: string | null) {
    setHighlighted(firstValue(text))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setQuery(null)
  }

  function choose(itemValue: string) {
    if (itemValue === CREATE_VALUE) {
      if (creatable !== null) onCreate?.(creatable)
    } else {
      onSelect(itemValue)
    }
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Home' || event.key === 'End') {
      // These keys move the caret in the text; cmdk would use them to move in the list.
      event.stopPropagation()
      return
    }
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      openList(query)
      return
    }
    if (!open && event.key === 'Escape' && query !== null) {
      // A second Escape gives back the selected option.
      event.preventDefault()
      setQuery(null)
    }
  }

  return (
    <FieldLayout
      inputId={ids.inputId}
      label={label}
      hideLabel={hideLabel}
      description={description}
      descriptionId={ids.descriptionId}
      error={error}
      errorId={ids.errorId}
      className={className}
    >
      <Popover.Root
        open={open && !disabled}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
      >
        {/* Ctrl+N, Ctrl+J and Ctrl+K are shortcuts of the application: no vim bindings. */}
        <Command
          shouldFilter={false}
          loop
          vimBindings={false}
          value={highlighted}
          onValueChange={setHighlighted}
          className="min-w-0"
        >
          <Popover.Anchor asChild>
            <div
              ref={frameRef}
              className={cn(fieldFrameClass({ invalid: Boolean(error), disabled }), 'gap-2 pr-3 pl-3.5')}
              onMouseDown={focusFieldInput}
            >
              <ComboboxInput
                ref={ref}
                id={ids.inputId}
                listboxId={listboxId}
                open={open && !disabled}
                text={query ?? selected?.label ?? ''}
                placeholder={placeholder}
                disabled={disabled}
                invalid={Boolean(error)}
                describedBy={ids.describedBy}
                onTextChange={(text) => {
                  setQuery(text)
                  openList(text)
                }}
                onClick={() => {
                  if (!open) openList(query)
                }}
                onKeyDown={handleKeyDown}
                onBlur={close}
              />
              <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 text-fg-muted" />
            </div>
          </Popover.Anchor>
          <Popover.Portal>
            <Popover.Content
              id={listboxId}
              align="start"
              sideOffset={6}
              collisionPadding={8}
              className="animate-pop-in z-50 w-[var(--radix-popover-trigger-width)] rounded-nested border border-border-strong bg-surface-2 p-1 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.7)]"
              // The focus stays in the field while the list is open.
              onOpenAutoFocus={(event) => {
                event.preventDefault()
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
              }}
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onInteractOutside={(event) => {
                if (event.target instanceof Node && frameRef.current?.contains(event.target)) {
                  event.preventDefault()
                }
              }}
            >
              <Command.List
                label={t.listLabel}
                className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto"
              >
                {matches.map((option) => (
                  <Command.Item
                    key={option.id}
                    value={option.id}
                    onSelect={choose}
                    className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-small text-fg-secondary select-none data-[selected=true]:bg-border-strong data-[selected=true]:text-fg"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-accent">
                      {option.id === value ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="shrink-0 text-caption text-fg-muted">{option.hint}</span>
                    ) : null}
                  </Command.Item>
                ))}
                {creatable === null ? null : (
                  <Command.Item
                    value={CREATE_VALUE}
                    onSelect={choose}
                    className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-small font-medium text-accent-soft select-none data-[selected=true]:bg-border-strong"
                  >
                    <Plus size={16} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{t.create(creatable)}</span>
                  </Command.Item>
                )}
                <Command.Empty className="px-3 py-2 text-small text-fg-muted">{emptyText}</Command.Empty>
              </Command.List>
            </Popover.Content>
          </Popover.Portal>
        </Command>
      </Popover.Root>
    </FieldLayout>
  )
}

type ComboboxInputProps = {
  id: string
  listboxId: string
  open: boolean
  text: string
  placeholder?: string
  disabled: boolean
  invalid: boolean
  describedBy?: string
  onTextChange: (text: string) => void
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onBlur: () => void
  ref?: Ref<HTMLInputElement>
}

/**
 * The field itself. cmdk's own input always says « expanded »; this one follows the popover and
 * points to the highlighted item. Its keys bubble to the cmdk root, which moves in the list.
 */
function ComboboxInput({
  id,
  listboxId,
  open,
  text,
  placeholder,
  disabled,
  invalid,
  describedBy,
  onTextChange,
  onClick,
  onKeyDown,
  onBlur,
  ref,
}: ComboboxInputProps) {
  // cmdk does not refresh `selectedItemId` when its value is controlled, as here: read the
  // highlighted option from the list once the DOM is updated.
  const highlighted = useCommandState((state) => state.value)
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  useLayoutEffect(() => {
    const find = () =>
      open
        ? document.getElementById(listboxId)?.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]')
            ?.id
        : undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the DOM after commit, bails out when unchanged
    setActiveId(find())
    // On opening, the items mark their selection one frame later: read again then.
    const frame = requestAnimationFrame(() => {
      setActiveId(find())
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [open, highlighted, text, listboxId])

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      role="combobox"
      autoComplete="off"
      spellCheck={false}
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-activedescendant={open ? activeId : undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      placeholder={placeholder}
      disabled={disabled}
      value={text}
      className={fieldInputClass}
      onChange={(event) => {
        onTextChange(event.target.value)
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  )
}
