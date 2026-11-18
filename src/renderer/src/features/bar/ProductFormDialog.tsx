import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { toast } from '@renderer/components/Toast'
import {
  AllergenField,
  NullableSelectField,
  NullableTextField,
  NumberField,
} from '@renderer/features/shared/fields'
import { errorMessage } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { fieldErrorMessage } from '@renderer/lib/forms'
import { useCreateProduct, useUpdateProduct } from '@renderer/lib/queries'
import { PACK_UNIT_VALUES, productInputSchema, type Product, type ProductInput } from '@shared/domain/catalog'
import type { z } from 'zod'

const t = fr.bar
const tp = t.productForm
const FORM_ID = 'product-form'

type ProductValues = z.output<typeof productInputSchema>

const basisOptions = (['ht', 'ttc'] as const).map((value) => ({ value, label: tp.basisOptions[value] }))
const packOptions = PACK_UNIT_VALUES.map((value) => ({ value, label: t.packUnits[value] }))

function toInput(ingredientId: string, product: Product | null): ProductInput {
  if (!product) {
    return {
      ingredientId,
      brand: null,
      name: '',
      abv: null,
      volumeMl: null,
      sugarGPerL: null,
      acidGPerL: null,
      barcode: null,
      purchasePriceCents: null,
      purchasePriceBasis: null,
      packQuantity: null,
      packUnit: null,
      owned: false,
      personalNotes: null,
      allergens: [],
    }
  }
  const { id: _id, ...rest } = product
  return { ...rest, allergens: [...product.allergens] }
}

type ProductFormDialogProps = {
  open: boolean
  ingredientId: string
  /** The bottle to modify, or null to add one. */
  product: Product | null
  onClose: () => void
}

/** A bottle of an ingredient: brand, name, volume, degree, price paid with its HT or TTC basis. */
export function ProductFormDialog({ open, ingredientId, product, onClose }: ProductFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? tp.editTitle(product.name) : tp.createTitle}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tp.cancel}
          </Button>
          <Button type="submit" form={FORM_ID}>
            {tp.save}
          </Button>
        </>
      }
    >
      <ProductForm ingredientId={ingredientId} product={product} onDone={onClose} />
    </Dialog>
  )
}

function ProductForm({
  ingredientId,
  product,
  onDone,
}: {
  ingredientId: string
  product: Product | null
  onDone: () => void
}) {
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const [failure, setFailure] = useState<string | null>(null)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productInputSchema),
    defaultValues: toInput(ingredientId, product),
  })

  const submit = handleSubmit(async (values) => {
    setFailure(null)
    try {
      const saved = product
        ? await update.mutateAsync({ id: product.id, data: values })
        : await create.mutateAsync(values)
      toast.show({ message: product ? tp.saved(saved.name) : tp.created(saved.name) })
      onDone()
    } catch (error) {
      setFailure(errorMessage(error))
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
        <NullableTextField control={control} name="brand" label={tp.brand} maxLength={120} />
        <Input
          {...register('name')}
          label={tp.name}
          autoComplete="off"
          maxLength={120}
          data-autofocus=""
          error={fieldErrorMessage(errors.name, { required: fr.recipes.form.required })}
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <NumberField
          control={control}
          name="abv"
          label={tp.abv}
          unit={t.detail.abvUnit}
          max={100}
          step={0.5}
        />
        <NumberField
          control={control}
          name="volumeMl"
          label={tp.volume}
          unit={fr.recipes.panel.units.ml}
          max={100_000}
          step={50}
          integer
        />
        <NumberField
          control={control}
          name="sugarGPerL"
          label={tp.sugar}
          unit={t.detail.perLitre}
          max={1000}
        />
        <NumberField control={control} name="acidGPerL" label={tp.acid} unit={t.detail.perLitre} max={1000} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          control={control}
          name="purchasePriceCents"
          label={tp.price}
          unit="€"
          max={100_000}
          step={0.5}
          decimals={2}
          scale={100}
        />
        <NullableSelectField
          control={control}
          name="purchasePriceBasis"
          label={tp.basis}
          description={tp.basisHint}
          options={basisOptions}
          errorMessage={tp.basisRequired}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          control={control}
          name="packQuantity"
          label={tp.packQuantity}
          description={tp.packHint}
          max={10_000}
        />
        <NullableSelectField
          control={control}
          name="packUnit"
          label={tp.packUnit}
          options={packOptions}
          errorMessage={tp.packTogether}
        />
      </div>
      <NullableTextField
        control={control}
        name="barcode"
        label={tp.barcode}
        description={tp.barcodeHint}
        maxLength={14}
        invalidMessage={tp.barcodeInvalid}
      />
      <NullableTextField control={control} name="personalNotes" label={tp.notes} maxLength={4000} multiline />
      <AllergenField control={control} name="allergens" label={tp.allergens} />
      <Checkbox {...register('owned')} label={tp.owned} />
      {failure ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {failure}
        </p>
      ) : null}
    </form>
  )
}
