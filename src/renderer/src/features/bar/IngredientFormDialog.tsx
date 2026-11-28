import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { Select } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { leafCategoryGroups } from '@renderer/features/shared/categories'
import {
  AllergenField,
  CommaListField,
  NullableSelectField,
  NumberField,
} from '@renderer/features/shared/fields'
import { errorMessage, isConflict } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { fieldErrorMessage } from '@renderer/lib/forms'
import { useCategories, useCreateIngredient, useUpdateIngredient } from '@renderer/lib/queries'
import {
  ingredientInputSchema,
  type IngredientDetail,
  type IngredientInput,
  type IngredientSummary,
} from '@shared/domain/catalog'
import type { z } from 'zod'

const t = fr.bar
const tf = t.ingredientForm
const FORM_ID = 'ingredient-form'

type IngredientValues = z.output<typeof ingredientInputSchema>

const sourceOptions = (['ciqual', 'computed', 'label', 'reference', 'user'] as const).map((value) => ({
  value,
  label: t.sources[value],
}))
const confidenceOptions = (['sourced', 'estimated'] as const).map((value) => ({
  value,
  label: t.confidenceOptions[value],
}))

function toInput(detail: IngredientDetail | null): IngredientInput {
  if (!detail) {
    return {
      name: '',
      categoryId: '',
      defaultAbv: null,
      sugarGPerL: null,
      acidGPerL: null,
      compositionSource: null,
      compositionConfidence: null,
      densityGPerMl: null,
      flavorTags: [],
      description: null,
      allergens: [],
      isStaple: false,
      aliases: [],
    }
  }
  return {
    name: detail.name,
    categoryId: detail.categoryId,
    defaultAbv: detail.defaultAbv,
    sugarGPerL: detail.sugarGPerL,
    acidGPerL: detail.acidGPerL,
    compositionSource: detail.compositionSource,
    compositionConfidence: detail.compositionConfidence,
    densityGPerMl: detail.densityGPerMl,
    flavorTags: [...detail.flavorTags],
    description: detail.description,
    allergens: [...detail.allergens],
    isStaple: detail.isStaple,
    aliases: [...detail.aliases],
  }
}

type IngredientFormDialogProps = {
  open: boolean
  /** The ingredient to modify, or null to create one. */
  ingredient: IngredientDetail | null
  onClose: () => void
  onSaved: (ingredient: IngredientSummary) => void
}

/** Creation and modification of an ingredient of « Mon bar ». */
export function IngredientFormDialog({ open, ingredient, onClose, onSaved }: IngredientFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={ingredient ? tf.editTitle(ingredient.name) : tf.createTitle}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tf.cancel}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {tf.save}
          </Button>
        </>
      }
    >
      <IngredientForm ingredient={ingredient} onSaved={onSaved} />
    </Dialog>
  )
}

function IngredientForm({
  ingredient,
  onSaved,
}: {
  ingredient: IngredientDetail | null
  onSaved: (ingredient: IngredientSummary) => void
}) {
  const categories = useCategories()
  const create = useCreateIngredient()
  const update = useUpdateIngredient()
  const [failure, setFailure] = useState<string | null>(null)
  const groups = useMemo(() => leafCategoryGroups(categories.data ?? []), [categories.data])
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IngredientInput, unknown, IngredientValues>({
    resolver: zodResolver(ingredientInputSchema),
    defaultValues: toInput(ingredient),
  })

  const submit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      const saved = ingredient
        ? await update.mutateAsync({ id: ingredient.id, data: values })
        : await create.mutateAsync(values)
      toast.show({ message: ingredient ? tf.saved(saved.name) : tf.created(saved.name) })
      onSaved(saved)
    } catch (error) {
      setFailure(isConflict(error) ? tf.conflict : errorMessage(error))
    }
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
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('name')}
          label={tf.name}
          autoComplete="off"
          maxLength={120}
          data-autofocus=""
          error={fieldErrorMessage(errors.name, { required: fr.recipes.form.required })}
        />
        <Select
          {...register('categoryId')}
          label={tf.category}
          placeholder={tf.categoryPlaceholder}
          options={groups}
          error={fieldErrorMessage(errors.categoryId, { required: fr.recipes.form.categoryRequired })}
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <NumberField
          control={control}
          name="defaultAbv"
          label={tf.abv}
          unit={t.detail.abvUnit}
          max={100}
          step={0.5}
        />
        <NumberField
          control={control}
          name="sugarGPerL"
          label={tf.sugar}
          unit={t.detail.perLitre}
          max={2000}
        />
        <NumberField control={control} name="acidGPerL" label={tf.acid} unit={t.detail.perLitre} max={1000} />
        <NumberField
          control={control}
          name="densityGPerMl"
          label={tf.density}
          description={tf.densityHint}
          unit={t.detail.densityUnit}
          max={5}
          step={0.01}
          decimals={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NullableSelectField
          control={control}
          name="compositionSource"
          label={tf.source}
          options={sourceOptions}
        />
        <NullableSelectField
          control={control}
          name="compositionConfidence"
          label={tf.confidence}
          options={confidenceOptions}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CommaListField control={control} name="aliases" label={tf.aliases} description={tf.aliasesHint} />
        <CommaListField control={control} name="flavorTags" label={tf.flavors} description={tf.flavorsHint} />
      </div>
      <AllergenField control={control} name="allergens" label={tf.allergens} />
      <Checkbox {...register('isStaple')} label={tf.staple} />
      {failure ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {failure}
        </p>
      ) : null}
    </form>
  )
}
