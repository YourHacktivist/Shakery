import { Bold, Italic, List, ListOrdered, type LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent, type TextareaHTMLAttributes, type ReactNode, type Ref } from 'react'
import { hasFormatting, toggleList, toggleMark, type TextEdit } from '@core/rich-text'
import { RichText } from '@renderer/components/RichText'
import { Textarea } from '@renderer/components/Textarea'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.components.forms.formatting

type Action = 'bold' | 'italic' | 'bullets' | 'numbers'
const ICONS: Record<Action, LucideIcon> = { bold: Bold, italic: Italic, bullets: List, numbers: ListOrdered }

function editFor(action: Action, value: string, start: number, end: number): TextEdit {
  if (action === 'bold') return toggleMark(value, start, end, '**')
  if (action === 'italic') return toggleMark(value, start, end, '*')
  return toggleList(value, start, end, action)
}

/** Written as if typed, so that Ctrl+Z undoes it and React hears the change. */
function write(field: HTMLTextAreaElement, edit: TextEdit): void {
  field.focus()
  field.setSelectionRange(edit.from, edit.to)
  // The only editing command that keeps the undo stack of a textarea; Chromium keeps it for that.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (!document.execCommand(edit.text === '' ? 'delete' : 'insertText', false, edit.text)) return
  field.setSelectionRange(edit.select[0], edit.select[1])
}

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  value: string
  description?: ReactNode
  error?: ReactNode
  ref?: Ref<HTMLTextAreaElement>
  /** False where each line already is an item (the steps). */
  lists?: boolean
}

/**
 * A free text that takes bold, italic and lists (D-044): buttons, Ctrl+B and Ctrl+I, and what it
 * will look like under the field as soon as it holds any.
 */
export function FormattedTextarea({ lists = true, value, className, onKeyDown, ...rest }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const actions: Action[] = lists ? ['bold', 'italic', 'bullets', 'numbers'] : ['bold', 'italic']

  function run(action: Action, field: HTMLTextAreaElement) {
    write(field, editFor(action, field.value, field.selectionStart, field.selectionEnd))
  }

  function handleKeys(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key !== 'b' && key !== 'i') return
    // Prevented here, Ctrl+B does not fold the sidebar while writing.
    event.preventDefault()
    run(key === 'b' ? 'bold' : 'italic', event.currentTarget)
  }

  return (
    <div ref={box} className={cn('relative flex min-w-0 flex-col gap-1.5', className)}>
      <div role="group" aria-label={t.group(rest.label)} className="absolute top-[-4px] right-0 flex gap-0.5">
        {actions.map((action) => {
          const Icon = ICONS[action]
          return (
            <button
              key={action}
              type="button"
              aria-label={t[action]}
              title={t[action]}
              disabled={rest.disabled}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors duration-150 ease-out-soft hover:bg-surface-2 hover:text-fg"
              // The selection of the field survives the click.
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => {
                const field = box.current?.querySelector('textarea')
                if (field) run(action, field)
              }}
            >
              <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <Textarea {...rest} value={value} onKeyDown={handleKeys} />
      {(lists ? hasFormatting(value) : value.split('\n').some(hasFormatting)) ? (
        <div className="rounded-field border border-dashed border-border px-3.5 py-2">
          <span className="text-caption text-fg-muted">{t.preview}</span>
          <RichText text={value} className="text-body leading-relaxed text-fg-secondary" />
        </div>
      ) : null}
    </div>
  )
}
