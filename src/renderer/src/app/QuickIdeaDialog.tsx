import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useId, useMemo, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { normalizeName } from '@core/normalize'
import { Button } from '@renderer/components/Button'
import { filterOptions } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { Kbd } from '@renderer/components/Kbd'
import { toast } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { fieldErrorMessage, textOrNull } from '@renderer/lib/forms'
import { ShakeryError } from '@renderer/lib/ipc'
import { useIngredients, useQuickIdea } from '@renderer/lib/queries'
import { quickIdeaSchema, type QuickIdea } from '@shared/domain/catalog'
import type { z } from 'zod'

const t = fr.shell.quickIdea
const MAX_INGREDIENTS = 20
const MAX_SUGGESTIONS = 5
const FORM_ID = 'quick-idea-form'

type QuickIdeaValues = z.output<typeof quickIdeaSchema>

/**
 * Quick idea (section 10.2), Ctrl+N from anywhere: a name, a few ingredients typed freely
 * with suggestions from the known ones, one line of note. Enter creates the recipe at the
 * « idée » status. Only the name is required.
 */
export function QuickIdeaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title}
      description={t.description}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {t.create}
            <Kbd tone="onAccent">{fr.shell.keys.enter}</Kbd>
          </Button>
        </>
      }
    >
      <QuickIdeaForm onClose={onClose} />
    </Dialog>
  )
}

function QuickIdeaForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const quickIdea = useQuickIdea()
  const [draft, setDraft] = useState('')
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<QuickIdea, unknown, QuickIdeaValues>({
    resolver: zodResolver(quickIdeaSchema),
    defaultValues: { name: '', ingredients: [], note: null },
  })

  const submit = handleSubmit((values) => {
    if (quickIdea.isPending) return
    quickIdea.mutate(values, {
      onSuccess: (recipe) => {
        toast.show({
          message: t.created(recipe.name),
          action: {
            label: t.open,
            onAction: () => void navigate(`/recipes/${recipe.id}`),
          },
        })
        onClose()
      },
    })
  })

  /** An ingredient still being typed is kept, as if Enter had been pressed in its field. */
  function submitWithDraft() {
    const pending = draft.trim()
    const current = getValues('ingredients') ?? []
    if (pending !== '' && current.length < MAX_INGREDIENTS) {
      setValue('ingredients', addUnique(current, pending))
      setDraft('')
    }
    void submit()
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    submitWithDraft()
  }

  const nameField = register('name')
  const noteField = register('note', { setValueAs: (value: string | null) => textOrNull(value ?? '') })

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submitWithDraft()
      }}
    >
      <Input
        {...nameField}
        label={t.name}
        placeholder={t.namePlaceholder}
        autoComplete="off"
        maxLength={120}
        data-autofocus=""
        error={fieldErrorMessage(errors.name, { required: t.nameRequired })}
        onKeyDown={submitOnEnter}
      />
      <Controller
        control={control}
        name="ingredients"
        render={({ field }) => (
          <IngredientChips
            value={field.value ?? []}
            onChange={field.onChange}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={submitWithDraft}
          />
        )}
      />
      <Input
        {...noteField}
        label={t.note}
        placeholder={t.notePlaceholder}
        autoComplete="off"
        maxLength={2000}
        onKeyDown={submitOnEnter}
      />
      {quickIdea.error ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {quickIdea.error instanceof ShakeryError ? quickIdea.error.userMessage : fr.errors.INTERNAL}
        </p>
      ) : null}
    </form>
  )
}

function addUnique(list: readonly string[], label: string): string[] {
  const normalized = normalizeName(label)
  if (list.some((item) => normalizeName(item) === normalized)) return [...list]
  return [...list, label]
}

type IngredientChipsProps = {
  value: readonly string[]
  onChange: (value: string[]) => void
  draft: string
  onDraftChange: (draft: string) => void
  /** Enter on an empty field creates the idea. */
  onSubmit: () => void
}

/** Free text ingredients as chips: Enter or a comma adds one, arrows pick a known ingredient. */
function IngredientChips({ value, onChange, draft, onDraftChange, onSubmit }: IngredientChipsProps) {
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listId = `${baseId}-list`
  const hintId = `${baseId}-hint`
  const ingredients = useIngredients()
  const [highlighted, setHighlighted] = useState(-1)
  const full = value.length >= MAX_INGREDIENTS

  const indexed = useMemo(
    () =>
      (ingredients.data ?? []).map((ingredient) => {
        const names = [ingredient.name, ...ingredient.aliases].map(normalizeName)
        return {
          id: ingredient.id,
          label: ingredient.name,
          normalized: names.join(' | '),
          words: names.join(' ').split(' '),
        }
      }),
    [ingredients.data],
  )

  const chosen = new Set(value.map(normalizeName))
  const suggestions =
    draft.trim() === ''
      ? []
      : filterOptions(indexed, draft)
          .filter((option) => !chosen.has(normalizeName(option.label)))
          .slice(0, MAX_SUGGESTIONS)
  const expanded = suggestions.length > 0

  function add(labels: readonly string[]) {
    let next = [...value]
    for (const label of labels) {
      const trimmed = label.trim()
      if (trimmed === '' || next.length >= MAX_INGREDIENTS) continue
      next = addUnique(next, trimmed)
    }
    if (next.length !== value.length) onChange(next)
    onDraftChange('')
    setHighlighted(-1)
  }

  function remove(index: number) {
    onChange(value.filter((_, position) => position !== index))
    document.getElementById(inputId)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    switch (event.key) {
      case 'Enter': {
        event.preventDefault()
        const suggestion = suggestions[highlighted]
        if (suggestion) add([suggestion.label])
        else if (draft.trim() !== '') add([draft])
        else onSubmit()
        return
      }
      case ',':
        event.preventDefault()
        add([draft])
        return
      case 'ArrowDown':
        if (!expanded) return
        event.preventDefault()
        setHighlighted((current) => (current + 1) % suggestions.length)
        return
      case 'ArrowUp':
        if (!expanded) return
        event.preventDefault()
        setHighlighted((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
        return
      case 'Escape':
        if (highlighted < 0 && draft === '') return
        // Leaves the suggestions first; the next Escape closes the window.
        event.preventDefault()
        setHighlighted(-1)
        onDraftChange('')
        return
      case 'Backspace':
        if (draft === '' && value.length > 0) {
          event.preventDefault()
          onChange(value.slice(0, -1))
        }
        return
      default:
        return
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (!text.includes(',')) return
    event.preventDefault()
    add(`${draft}${text}`.split(','))
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-small font-medium text-fg-secondary">
        {t.ingredients}
      </label>
      <div
        className={cn(
          'flex min-h-11 min-w-0 flex-wrap items-center gap-1.5 rounded-field border border-border-strong bg-surface-1 px-2 py-1.5 transition-colors duration-150 ease-out-soft hover:bg-surface-2',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            document.getElementById(inputId)?.focus()
          }
        }}
      >
        {value.length > 0 ? (
          <ul aria-label={t.ingredients} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {value.map((label, index) => (
              <li
                key={label}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border-strong bg-surface-2 pr-1 pl-2.5 text-small text-fg"
              >
                {label}
                <button
                  type="button"
                  aria-label={t.remove(label)}
                  title={t.remove(label)}
                  className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-fg-muted hover:bg-border-strong hover:text-fg"
                  onClick={() => {
                    remove(index)
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
          aria-describedby={hintId}
          placeholder={value.length === 0 ? t.ingredientsPlaceholder : undefined}
          disabled={full}
          maxLength={120}
          value={draft}
          className="h-8 min-w-[12rem] flex-1 bg-transparent px-1.5 text-body text-fg outline-none placeholder:text-fg-muted"
          onChange={(event) => {
            onDraftChange(event.target.value)
            setHighlighted(-1)
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </div>
      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.suggestions}
          className="m-0 flex list-none flex-col gap-0.5 rounded-nested border border-border-strong bg-surface-2 p-1"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              className={cn(
                'flex min-h-8 cursor-pointer items-center rounded-lg px-2.5 text-small select-none',
                index === highlighted ? 'bg-border-strong text-fg' : 'text-fg-secondary hover:text-fg',
              )}
              onMouseDown={(event) => {
                event.preventDefault()
                add([suggestion.label])
              }}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      ) : null}
      <p id={hintId} className="m-0 text-caption text-fg-muted">
        {full ? t.tooMany : t.ingredientsHint}
      </p>
    </div>
  )
}
