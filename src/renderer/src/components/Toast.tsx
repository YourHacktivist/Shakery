import { CircleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { create } from 'zustand'
import { Button, IconButton } from '@renderer/components/Button'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

export type ToastTone = 'neutral' | 'error'

export type ToastAction = {
  label: string
  onAction: () => void
}

export type ToastOptions = {
  message: string
  action?: ToastAction
  /** Milliseconds before it leaves; 5 s by default, 8 s when there is an action. */
  duration?: number
  tone?: ToastTone
}

export type ToastEntry = {
  id: number
  message: string
  action?: ToastAction
  duration: number
  tone: ToastTone
}

export const DEFAULT_TOAST_DURATION = 5000
/** Every deletion offers « Annuler » for 8 seconds (section 10.1). */
export const UNDO_TOAST_DURATION = 8000
const MAX_TOASTS = 3

type ToastState = {
  toasts: ToastEntry[]
  show: (options: ToastOptions) => number
  dismiss: (id: number) => void
  clear: () => void
}

let nextId = 1

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (options) => {
    const id = nextId++
    const entry: ToastEntry = {
      id,
      message: options.message,
      action: options.action,
      duration: options.duration ?? (options.action ? UNDO_TOAST_DURATION : DEFAULT_TOAST_DURATION),
      tone: options.tone ?? 'neutral',
    }
    set((state) => ({ toasts: [...state.toasts, entry].slice(-MAX_TOASTS) }))
    return id
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }))
  },
  clear: () => {
    set({ toasts: [] })
  },
}))

/** Imperative access, usable outside React: `toast.show({ message })`, `toast.undo(message, restore)`. */
export const toast = {
  show: (options: ToastOptions): number => useToastStore.getState().show(options),
  /** After a deletion: « Annuler » stays available for 8 seconds. */
  undo: (message: string, onUndo: () => void): number =>
    useToastStore.getState().show({
      message,
      action: { label: fr.shell.toast.undo, onAction: onUndo },
      duration: UNDO_TOAST_DURATION,
    }),
  dismiss: (id: number): void => {
    useToastStore.getState().dismiss(id)
  },
}

/**
 * One notification. Its timer runs only while it is displayed, and pauses while the
 * pointer is over it or the focus is inside, so « Annuler » can be reached calmly.
 */
function ToastView({ entry }: { entry: ToastEntry }) {
  const dismiss = useToastStore((state) => state.dismiss)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(entry.duration)
  const paused = hovered || focused
  const t = fr.shell.toast

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = window.setTimeout(() => {
      dismiss(entry.id)
    }, remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [paused, entry.id, dismiss])

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
      setFocused(false)
    }
  }

  const action = entry.action

  return (
    <div
      className="pointer-events-auto flex animate-pop-in items-center gap-2 rounded-nested border border-border-strong bg-surface-2 py-1.5 pr-1.5 pl-3 shadow-pop"
      onPointerEnter={() => {
        setHovered(true)
      }}
      onPointerLeave={() => {
        setHovered(false)
      }}
      onFocus={() => {
        setFocused(true)
      }}
      onBlur={handleBlur}
    >
      {entry.tone === 'error' ? (
        <CircleAlert size={16} aria-hidden="true" className="shrink-0 text-status-danger" />
      ) : null}
      <p className="m-0 min-w-0 flex-1 text-small text-fg">
        {entry.tone === 'error' ? <span className="sr-only">{t.errorPrefix}</span> : null}
        {entry.message}
      </p>
      {action ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            action.onAction()
            dismiss(entry.id)
          }}
        >
          {action.label}
        </Button>
      ) : null}
      <IconButton
        variant="ghost"
        size="sm"
        label={t.dismiss}
        icon={<X size={14} aria-hidden="true" />}
        onClick={() => {
          dismiss(entry.id)
        }}
      />
    </div>
  )
}

/** Display area of the notifications, bottom right. Mount it once, in the shell. */
export function Toaster({ className }: { className?: string }) {
  const toasts = useToastStore((state) => state.toasts)
  return (
    <section
      aria-label={fr.shell.toast.region}
      className={cn(
        'pointer-events-none fixed right-4 bottom-4 z-50 w-[min(340px,calc(100vw-32px))]',
        className,
      )}
    >
      <div role="status" aria-live="polite" aria-atomic="false" className="flex flex-col gap-1.5">
        {toasts.map((entry) => (
          <ToastView key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  )
}
