import { useMemo, useState } from 'react'
import { Button } from '@renderer/components/Button'
import { Combobox } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { RatingScale, type RatingValue } from '@renderer/components/RatingScale'
import { Select } from '@renderer/components/Select'
import { StarRating } from '@renderer/components/StarRating'
import { toast } from '@renderer/components/Toast'
import { errorMessage } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useCreateTasting, useRecipe, useRecipes } from '@renderer/lib/queries'
import { TASTING_CRITERIA, type TastingCriterion } from '@shared/domain/journal'
import { FormattedTextarea } from '@renderer/components/FormattedTextarea'

const t = fr.journal
const td = t.dialog
const FORM_ID = 'tasting-form'

type TastingDialogProps = {
  open: boolean
  /** Recipe and version proposed when the dialog opens from a recipe or the lab. */
  recipeId: string | null
  version: number | null
  onClose: () => void
}

/**
 * Tasting note (section 10.6), Ctrl+J from anywhere: the recipe and version tasted, an
 * overall rating, the eight criteria from « trop peu » to « trop », a comment and the next
 * step to test. Everything but the recipe is optional, so a note takes a few seconds.
 */
export function TastingDialog({ open, recipeId, version, onClose }: TastingDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={td.title}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {td.cancel}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {td.save}
          </Button>
        </>
      }
    >
      <TastingForm initialRecipeId={recipeId} initialVersion={version} onClose={onClose} />
    </Dialog>
  )
}

function TastingForm({
  initialRecipeId,
  initialVersion,
  onClose,
}: {
  initialRecipeId: string | null
  initialVersion: number | null
  onClose: () => void
}) {
  const recipes = useRecipes()
  const create = useCreateTasting()
  const [recipeId, setRecipeId] = useState<string | null>(initialRecipeId)
  const [version, setVersion] = useState<number | null>(initialVersion)
  const [overall, setOverall] = useState<number | null>(null)
  const [scores, setScores] = useState<Partial<Record<TastingCriterion, RatingValue>>>({})
  const [comment, setComment] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [context, setContext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recipe = useRecipe(recipeId ?? undefined)

  const options = useMemo(
    () =>
      (recipes.data ?? [])
        .filter((summary) => summary.kind === 'cocktail')
        .map((summary) => ({ id: summary.id, label: summary.name, hint: t.version(summary.version) })),
    [recipes.data],
  )
  const history = recipe.data?.history ?? []
  const current = recipe.data?.version ?? null
  const chosenVersion = version ?? current

  async function submit() {
    if (!recipeId || chosenVersion === null) {
      setError(td.recipeRequired)
      return
    }
    setError(null)
    try {
      const saved = await create.mutateAsync({
        recipeId,
        recipeVersion: chosenVersion,
        tastedAt: Date.now(),
        overall,
        scores,
        comment,
        nextStep,
        context,
      })
      toast.show({ message: td.saved(saved.recipeName) })
      onClose()
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="grid grid-cols-[1fr_200px] gap-4">
        <Combobox
          label={td.recipe}
          options={options}
          value={recipeId}
          placeholder={td.recipePlaceholder}
          error={error === td.recipeRequired ? error : undefined}
          onSelect={(id) => {
            setRecipeId(id)
            setVersion(null)
            setError(null)
          }}
        />
        <Select
          label={td.version}
          disabled={history.length === 0}
          value={chosenVersion === null ? '' : String(chosenVersion)}
          onChange={(event) => {
            setVersion(Number(event.target.value))
          }}
          options={[...history]
            .sort((a, b) => b.version - a.version)
            .map((entry) => ({
              value: String(entry.version),
              label: td.versionOption(entry.version, entry.label, entry.version === current),
            }))}
        />
      </div>

      <StarRating label={td.overall} value={overall} onChange={setOverall} optionLabel={td.overallOption} />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-3 flex w-full items-baseline justify-between p-0">
          <span className="text-small font-medium text-fg-secondary">{td.scores}</span>
          <span className="text-caption text-fg-muted">{td.scoresHint}</span>
        </legend>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {TASTING_CRITERIA.map((criterion) => (
            <RatingScale
              key={criterion}
              label={t.criteria[criterion]}
              value={scores[criterion] ?? null}
              onChange={(value) => {
                setScores((previous) => ({ ...previous, [criterion]: value }))
              }}
            />
          ))}
        </div>
      </fieldset>

      <FormattedTextarea
        label={td.comment}
        rows={3}
        maxLength={4000}
        value={comment}
        onChange={(event) => {
          setComment(event.target.value)
        }}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={td.nextStep}
          placeholder={td.nextStepPlaceholder}
          maxLength={1000}
          autoComplete="off"
          value={nextStep}
          onChange={(event) => {
            setNextStep(event.target.value)
          }}
        />
        <Input
          label={td.context}
          placeholder={td.contextPlaceholder}
          maxLength={300}
          autoComplete="off"
          value={context}
          onChange={(event) => {
            setContext(event.target.value)
          }}
        />
      </div>
      {error && error !== td.recipeRequired ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {error}
        </p>
      ) : null}
    </form>
  )
}
