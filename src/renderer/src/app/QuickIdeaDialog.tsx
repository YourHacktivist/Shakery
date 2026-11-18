import { Lightbulb } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { fr } from '@renderer/i18n/fr'

/** Provisional quick idea window (Ctrl+N): the real entry form arrives in phase 3. */
export function QuickIdeaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = fr.shell.quickIdea
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.title}
      description={t.description}
      size="sm"
      footer={
        <Button data-autofocus="" onClick={onClose}>
          {t.confirm}
        </Button>
      }
    >
      <p className="m-0 flex items-start gap-2.5 rounded-nested border border-border bg-surface-1/60 p-3.5 text-small leading-normal text-fg-secondary">
        <Lightbulb size={16} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0 text-accent" />
        <span>{t.phase}</span>
      </p>
    </Dialog>
  )
}
