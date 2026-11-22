import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Button } from '@renderer/components/Button'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { PhotoError, preparePhoto, type PickedPhoto } from '@renderer/lib/photo'

const t = fr.components.forms.photo

/** A photo to drop or to choose (sections 10.4 and 10.6). The parent decides when it is saved. */
export function PhotoField({
  src,
  alt,
  disabled = false,
  compact = false,
  onPick,
  onRemove,
}: {
  /** The photo to show, saved or only chosen. */
  src: string | null
  alt: string
  disabled?: boolean
  compact?: boolean
  onPick: (photo: PickedPhoto) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [broken, setBroken] = useState<string | null>(null)
  const shown = src !== null && src !== broken ? src : null
  const waiting = disabled || busy

  async function take(file: File | undefined) {
    if (!file || waiting) return
    setError(null)
    setBusy(true)
    try {
      onPick(await preparePhoto(file))
    } catch (failure) {
      setError(t.problems[failure instanceof PhotoError ? failure.problem : 'unreadable'])
    } finally {
      setBusy(false)
    }
  }

  function dragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }

  return (
    <div
      data-part="photo-drop"
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-nested transition-colors duration-150 ease-out-soft',
        over && 'bg-accent/10 outline-2 outline-offset-2 outline-accent outline-dashed',
      )}
      onDragOver={dragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        void take(event.dataTransfer.files[0])
      }}
    >
      {shown ? (
        <img
          src={shown}
          alt={alt}
          decoding="async"
          className={cn(
            'w-full rounded-nested border border-border bg-surface-2 object-contain',
            compact ? 'max-h-40' : 'max-h-80',
          )}
          onError={() => {
            setBroken(shown)
          }}
        />
      ) : null}
      {shown ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ImagePlus size={14} aria-hidden="true" />}
            disabled={waiting}
            onClick={() => input.current?.click()}
          >
            {t.change}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} aria-hidden="true" />}
            disabled={waiting}
            onClick={() => {
              setError(null)
              onRemove()
            }}
          >
            {t.remove}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={waiting}
          className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-nested border border-dashed border-border-strong px-3 text-small text-fg-secondary transition-colors duration-150 ease-out-soft hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-55',
            compact ? 'min-h-14 py-2' : 'min-h-20 py-3',
          )}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-accent" />
          <span>{busy ? t.reading : t.drop}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        hidden
        tabIndex={-1}
        aria-label={alt}
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // The same file can be chosen again after a removal.
          event.target.value = ''
          void take(file)
        }}
      />
      {error ? (
        <p role="alert" className="m-0 text-small text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
