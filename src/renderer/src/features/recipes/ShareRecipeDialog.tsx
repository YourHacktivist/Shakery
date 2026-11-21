import { Copy, FileDown, FileText, Image } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'
import type { RecipeDetail } from '@shared/domain/catalog'
import { recipeImage, recipeMarkdown, type ShareContext } from './share'

const s = fr.recipes.share

type Action = 'copy' | 'markdown' | 'image' | 'archive'

/** Sharing a recipe (section 12.4): Markdown, image, or a .shakery file for a colleague. */
export function ShareRecipeDialog({
  open,
  onClose,
  recipe,
  context,
}: {
  open: boolean
  onClose: () => void
  recipe: RecipeDetail
  context: ShareContext
}) {
  const [includePrivate, setIncludePrivate] = useState(false)
  const [busy, setBusy] = useState<Action | null>(null)

  async function run(action: Action, work: () => Promise<string | null>) {
    setBusy(action)
    try {
      const message = await work()
      if (message) toast.show({ message })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(null)
    }
  }

  const saved = (result: { saved: boolean }, message: string) => (result.saved ? message : null)

  const row = (action: Action, icon: ReactNode, label: string, work: () => Promise<string | null>) => (
    <Button
      variant="outline"
      icon={icon}
      disabled={busy !== null}
      aria-busy={busy === action}
      className="justify-start"
      onClick={() => void run(action, work)}
    >
      {label}
    </Button>
  )

  return (
    <Dialog open={open} onClose={onClose} title={s.title} description={s.description} size="md">
      <div className="flex flex-col gap-2">
        {row('copy', <Copy size={16} aria-hidden="true" />, s.copyMarkdown, async () => {
          await unwrap(window.shakery.export.copyText({ text: recipeMarkdown(recipe, context) }))
          return s.copied
        })}
        {row('markdown', <FileText size={16} aria-hidden="true" />, s.saveMarkdown, async () =>
          saved(
            await unwrap(
              window.shakery.export.saveFile({
                kind: 'markdown',
                name: recipe.name,
                content: recipeMarkdown(recipe, context),
              }),
            ),
            s.saved,
          ),
        )}
        {row('image', <Image size={16} aria-hidden="true" />, s.saveImage, async () =>
          saved(
            await unwrap(
              window.shakery.export.saveFile({
                kind: 'png',
                name: recipe.name,
                content: await recipeImage(recipe, context),
              }),
            ),
            s.saved,
          ),
        )}
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <p className="m-0 text-small text-fg-secondary">{s.colleagueHint}</p>
          <Checkbox
            label={s.includePrivate}
            checked={includePrivate}
            onChange={(event) => {
              setIncludePrivate(event.target.checked)
            }}
          />
          {row('archive', <FileDown size={16} aria-hidden="true" />, s.colleague, async () =>
            saved(
              await unwrap(
                window.shakery.export.notebook({
                  kind: 'partial',
                  recipeIds: [recipe.id],
                  includePrivate,
                  collectionId: null,
                  label: recipe.name,
                }),
              ),
              s.exported,
            ),
          )}
        </div>
      </div>
    </Dialog>
  )
}
