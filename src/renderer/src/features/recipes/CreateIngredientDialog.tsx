import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { normalizeName } from '@core/normalize'
import { Button } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { categoryNames, leafCategoryGroups } from '@renderer/features/shared/categories'
import { errorMessage, isConflict } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { fieldErrorMessage } from '@renderer/lib/forms'
import { useCategories, useCreateIngredient, useIngredients } from '@renderer/lib/queries'
import { ingredientInputSchema, type IngredientInput, type IngredientSummary } from '@shared/domain/catalog'
import type { z } from 'zod'

const t = fr.recipes.ingredientDialog
const FORM_ID = 'create-ingredient-form'

type CreateIngredientDialogProps = {
  open: boolean
  /** Name typed in the ingredient field. */
  initialName: string
  onClose: () => void
  /** The new ingredient, or an existing one the user chose instead. */
  onDone: (ingredient: IngredientSummary) => void
}

/**
 * Creates an ingredient from the editor: the name typed, a category chosen among the leaves
 * of the tree. An ingredient with the same name or alias is shown before creating, and the
 * duplicate refused by the main process (CONFLICT) is said in words.
 */
export function CreateIngredientDialog({ open, initialName, onClose, onDone }: CreateIngredientDialogProps) {
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
          </Button>
        </>
      }
    >
      <CreateIngredientForm initialName={initialName} onDone={onDone} />
    </Dialog>
  )
}

function CreateIngredientForm({
  initialName,
  onDone,
}: {
  initialName: string
  onDone: (ingredient: IngredientSummary) => void
}) {
  const categories = useCategories()
  const ingredients = useIngredients()
  const create = useCreateIngredient()
  const [failure, setFailure] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IngredientInput, unknown, z.output<typeof ingredientInputSchema>>({
    resolver: zodResolver(ingredientInputSchema),
    defaultValues: { name: initialName, categoryId: '' },
  })
  const name = useWatch({ control, name: 'name' })

  const groups = useMemo(() => leafCategoryGroups(categories.data ?? []), [categories.data])
  const names = useMemo(() => categoryNames(categories.data), [categories.data])

  /** Ingredients whose name or alias is the one typed, whatever their category. */
  const similar = useMemo(() => {
    const normalized = normalizeName(name)
    if (normalized === '') return []
    return (ingredients.data ?? []).filter(
      (ingredient) =>
        normalizeName(ingredient.name) === normalized ||
        ingredient.aliases.some((alias) => normalizeName(alias) === normalized),
    )
  }, [ingredients.data, name])

  const submit = handleSubmit((values) => {
    setFailure(null)
    create.mutate(values, {
      onSuccess: (ingredient) => {
        toast.show({ message: t.created(ingredient.name) })
        onDone(ingredient)
      },
      onError: (error) => {
        setFailure(isConflict(error) ? t.conflict : errorMessage(error))
      },
    })
  })

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <Input
        {...register('name')}
        label={t.name}
        autoComplete="off"
        maxLength={120}
        error={fieldErrorMessage(errors.name, { required: fr.recipes.form.required })}
      />
      <Select
        {...register('categoryId')}
        label={t.category}
        placeholder={t.categoryPlaceholder}
        options={groups}
        data-autofocus=""
        error={fieldErrorMessage(errors.categoryId, { required: fr.recipes.form.categoryRequired })}
      />
      {similar.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-nested border border-status-warning/40 bg-status-warning/8 p-3.5">
          <p className="m-0 text-small text-fg">{t.similar}</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {similar.map((ingredient) => (
              <li key={ingredient.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-small text-fg-secondary">
                  {ingredient.name}
                  <span className="text-fg-muted">{` · ${names.get(ingredient.categoryId) ?? ''}`}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onDone(ingredient)
                  }}
                >
                  {t.use(ingredient.name)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {failure ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {failure}
        </p>
      ) : null}
    </form>
  )
}
