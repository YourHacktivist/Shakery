import { X } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { IconButton } from '@renderer/components/Button'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

type DialogProps = {
  open: boolean
  /** Called on Escape, on a click on the backdrop and on the close button. */
  onClose: () => void
  title: ReactNode
  /** Keeps the title for screen readers only (the command palette has no visible title). */
  hideTitle?: boolean
  description?: ReactNode
  children?: ReactNode
  /** Actions, aligned to the right under a separator. */
  footer?: ReactNode
  size?: DialogSize
  /** `top` sits in the upper part of the window, like the command palette. */
  placement?: 'center' | 'top'
  showCloseButton?: boolean
  /** No inner padding nor visible header: the children lay out the whole panel. */
  bare?: boolean
  /** Added to the glass panel. */
  className?: string
}

const SIZES: Record<DialogSize, string> = {
  sm: 'w-[min(400px,calc(100vw-32px))]',
  md: 'w-[min(520px,calc(100vw-32px))]',
  lg: 'w-[min(640px,calc(100vw-32px))]',
  xl: 'w-[min(780px,calc(100vw-32px))]',
}

/** Focuses the element marked `data-autofocus`, caret at the end for a text field. */
function focusInitialElement(dialog: HTMLDialogElement): void {
  const target = dialog.querySelector<HTMLElement>('[data-autofocus]')
  if (!target) return
  target.focus()
  if (target instanceof HTMLInputElement) {
    const end = target.value.length
    try {
      target.setSelectionRange(end, end)
    } catch {
      // Some input types do not support a selection; the focus is enough.
    }
  }
}

/**
 * Modal window on the native <dialog> element: `showModal` traps the focus and makes the
 * rest inert. Glass panel (floating element, section 11), dark backdrop, Escape and a
 * click on the backdrop close it, and the focus goes back to where it was.
 * The content is mounted only while open; mark the field to focus with `data-autofocus`.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  size = 'md',
  placement = 'center',
  showCloseButton = true,
  bare = false,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)
  const onCloseRef = useRef(onClose)
  const pressedOnBackdrop = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    openRef.current = true
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    focusInitialElement(dialog)
    return () => {
      openRef.current = false
      if (dialog.open) dialog.close()
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [open])

  // The browser closed the dialog on its own (repeated Escape): sync the parent state.
  function handleNativeClose(event: SyntheticEvent<HTMLDialogElement>) {
    if (!event.currentTarget.open && openRef.current) onCloseRef.current()
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onCloseRef.current()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // A menu inside the dialog may already have used this Escape to close itself.
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    onCloseRef.current()
  }

  // The panel fills the <dialog> box: a click whose target is the <dialog> itself landed
  // on the backdrop. Pressing inside then releasing outside (text selection) is ignored.
  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressedOnBackdrop.current = event.target === event.currentTarget
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const onBackdrop = event.target === event.currentTarget && pressedOnBackdrop.current
    pressedOnBackdrop.current = false
    if (onBackdrop) onCloseRef.current()
  }

  const heading = (
    <h2
      id={titleId}
      className={cn(
        'm-0 text-heading font-medium tracking-[-0.01em] text-fg',
        (hideTitle || bare) && 'sr-only',
      )}
    >
      {title}
    </h2>
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'max-h-[calc(100vh-64px)] max-w-none overflow-visible border-0 bg-transparent p-0 text-fg backdrop:bg-veil backdrop:animate-fade-in',
        placement === 'top' ? 'mx-auto mt-[12vh] mb-auto' : 'm-auto',
        SIZES[size],
      )}
    >
      {open ? (
        <div
          className={cn(
            'glass flex max-h-[calc(100vh-64px)] animate-pop-in flex-col overflow-hidden rounded-card shadow-dialog',
            className,
          )}
        >
          {bare ? (
            <>
              {heading}
              {description ? (
                <p id={descriptionId} className="sr-only">
                  {description}
                </p>
              ) : null}
              {children}
            </>
          ) : (
            <>
              {/* Without a ring of its own: cut by the panel, it was a lone copper line above the footer. */}
              <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4 outline-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {heading}
                    {description ? (
                      <p id={descriptionId} className="m-0 text-body leading-relaxed text-fg-secondary">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  {showCloseButton ? (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label={fr.shell.dialog.close}
                      icon={<X size={16} aria-hidden="true" />}
                      onClick={() => {
                        onCloseRef.current()
                      }}
                      className="-mt-1 -mr-2"
                    />
                  ) : null}
                </div>
                {children}
              </div>
              {footer ? (
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-4 py-4">
                  {footer}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </dialog>
  )
}
