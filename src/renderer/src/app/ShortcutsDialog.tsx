import { Clock } from 'lucide-react'
import { Dialog } from '@renderer/components/Dialog'
import { Kbd } from '@renderer/components/Kbd'
import { fr } from '@renderer/i18n/fr'
import { SHORTCUTS, shortcutKeyLabels } from '@renderer/lib/shortcuts'

/** The « ? » panel: every shortcut of section 10.1, those not built yet marked « Bientôt ». */
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = fr.shell.shortcuts
  return (
    <Dialog open={open} onClose={onClose} title={t.title} description={t.description} size="md">
      <ul className="m-0 flex list-none flex-col p-0">
        {SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.id}
            data-available={shortcut.available ? 'true' : 'false'}
            className="flex min-h-11 items-center gap-3 border-b border-border py-2 last:border-b-0"
          >
            <span
              className={
                shortcut.available
                  ? 'min-w-0 flex-1 text-body text-fg'
                  : 'min-w-0 flex-1 text-body text-fg-muted'
              }
            >
              {t.items[shortcut.id]}
            </span>
            {shortcut.available ? null : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-caption font-medium text-fg-secondary">
                <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                {t.soon}
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              {shortcutKeyLabels(shortcut.id).map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
