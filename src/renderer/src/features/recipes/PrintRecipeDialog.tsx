import { FileDown, Printer } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { unwrap } from '@renderer/lib/ipc'
import { useSetting } from '@renderer/lib/queries'
import { RecipeSheet } from '@renderer/print/RecipeSheet'
import { useRecipeSheet } from '@renderer/print/useRecipeSheet'
import type { RecipePaper } from '@shared/print'

const t = fr.recipes.sheet

/** The preview fits this box whatever the paper (A4 is 794 x 1123 px at 96 dpi, A5 559 x 794). */
const PREVIEW_HEIGHT = 440
const PAPER_PX: Record<RecipePaper, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },
  a5: { width: 559, height: 794 },
}

/** Ctrl+P on a recipe: preview, PDF or printer (section 12.2). */
export function PrintRecipeDialog({ recipeId, onClose }: { recipeId: string | null; onClose: () => void }) {
  return (
    <Dialog open={recipeId !== null} onClose={onClose} title={t.title} description={t.description} size="xl">
      {recipeId === null ? null : <PrintRecipe recipeId={recipeId} />}
    </Dialog>
  )
}

function PrintRecipe({ recipeId }: { recipeId: string }) {
  const defaultPaper = useSetting('print.paper')
  const defaultIndicators = useSetting('print.indicators')
  const [paper, setPaper] = useState<RecipePaper>(defaultPaper)
  const [indicators, setIndicators] = useState(defaultIndicators)
  const [busy, setBusy] = useState(false)
  const sheet = useRecipeSheet(recipeId)
  const size = PAPER_PX[paper]
  const scale = PREVIEW_HEIGHT / size.height

  async function send(target: 'pdf' | 'printer') {
    setBusy(true)
    try {
      const options = { id: recipeId, paper, indicators }
      if (target === 'pdf') {
        if ((await unwrap(window.shakery.export.recipePdf(options))).saved) toast.show({ message: t.saved })
      } else if ((await unwrap(window.shakery.export.printRecipe(options))).printed) {
        toast.show({ message: t.sent })
      }
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-[312px_minmax(0,1fr)] gap-6">
      <div className="flex h-[440px] justify-center">
        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-field bg-white shadow-float"
          style={{ width: size.width * scale, height: PREVIEW_HEIGHT }}
        >
          {sheet ? (
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ transform: `scale(${String(scale)})` }}
            >
              <RecipeSheet {...sheet} paper={paper} indicators={indicators} preview />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-4">
        <SegmentedControl<RecipePaper>
          label={t.paper}
          value={paper}
          onChange={setPaper}
          options={[
            { value: 'a4', label: t.papers.a4 },
            { value: 'a5', label: t.papers.a5 },
          ]}
        />
        <Checkbox
          label={t.indicators}
          description={t.indicatorsHint}
          checked={indicators}
          onChange={(event) => {
            setIndicators(event.target.checked)
          }}
        />
        <div className="mt-auto flex w-full flex-col gap-2">
          <Button
            data-autofocus=""
            className="w-full"
            icon={<FileDown size={16} aria-hidden="true" />}
            disabled={busy || !sheet}
            onClick={() => void send('pdf')}
          >
            {t.savePdf}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            icon={<Printer size={16} aria-hidden="true" />}
            disabled={busy || !sheet}
            onClick={() => void send('printer')}
          >
            {t.print}
          </Button>
        </div>
      </div>
    </div>
  )
}
