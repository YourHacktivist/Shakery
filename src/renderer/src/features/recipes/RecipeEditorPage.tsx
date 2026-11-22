import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Checkbox } from '@renderer/components/Checkbox'
import { Combobox, type ComboboxOption } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select, type SelectGroup, type SelectOption } from '@renderer/components/Select'
import { toast } from '@renderer/components/Toast'
import { ComputedPanel } from '@renderer/features/recipes/ComputedPanel'
import { CreateIngredientDialog } from '@renderer/features/recipes/CreateIngredientDialog'
import {
  cleanForSave,
  computationInput,
  detailToInput,
  emptyLine,
  emptyRecipe,
} from '@renderer/features/recipes/model'
import { categoryNames, leafCategoryGroups } from '@renderer/features/shared/categories'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { fieldErrorMessage, splitList, textOrNull } from '@renderer/lib/forms'
import {
  useCategories,
  useCreateRecipe,
  useGlasses,
  useIceTypes,
  useIngredients,
  useProducts,
  useRecipe,
  useRecipePhoto,
  useSetPhoto,
  useUpdateRecipe,
} from '@renderer/lib/queries'
import {
  FAMILY_VALUES,
  METHOD_VALUES,
  ORIGIN_VALUES,
  recipeInputSchema,
  STATUS_VALUES,
  UNIT_VALUES,
  type RecipeDetail,
  type RecipeInput,
  type RecipeInputParsed,
} from '@shared/domain/catalog'
import { FormattedTextarea } from '@renderer/components/FormattedTextarea'
import { PhotoField } from '@renderer/components/PhotoField'
import type { PickedPhoto } from '@renderer/lib/photo'
import { photoUrl } from '@shared/domain/photos'

const t = fr.recipes
const te = t.editor
const tl = te.lines
const tf = te.fields

type FormControl = Control<RecipeInput, unknown, RecipeInputParsed>
type Unit = (typeof UNIT_VALUES)[number]

const unitOptions: SelectOption[] = UNIT_VALUES.map((value) => ({ value, label: t.units[value] }))
const statusOptions: SelectOption[] = STATUS_VALUES.map((value) => ({
  value,
  label: fr.components.display.status[value],
}))
const originOptions: SelectOption[] = ORIGIN_VALUES.map((value) => ({ value, label: t.origins[value] }))
const familyOptions: SelectOption[] = FAMILY_VALUES.map((value) => ({ value, label: t.families[value] }))
const methodOptions: SelectOption[] = METHOD_VALUES.map((value) => ({ value, label: t.methods[value] }))
const lengthOptions: SelectOption[] = (['short', 'long'] as const).map((value) => ({
  value,
  label: t.lengths[value],
}))
const momentOptions: SelectOption[] = (['before_dinner', 'all_day', 'after_dinner'] as const).map(
  (value) => ({
    value,
    label: t.moments[value],
  }),
)

/** Step of the dose arrows: what a bartender adjusts by in each unit. */
function unitStep(unit: Unit): number {
  if (unit === 'ml') return 5
  if (unit === 'cl') return 0.5
  if (unit === 'oz') return 0.25
  return 1
}

/** Editor of a recipe (section 10.4): /recipes/new for a blank one, /recipes/:id/edit otherwise. */
export function RecipeEditorPage() {
  const { id } = useParams()
  const recipe = useRecipe(id)
  if (id === undefined) return <RecipeEditor key="new" recipe={null} />
  if (recipe.isPending) {
    return (
      <p className="m-0 text-body text-fg-muted" aria-busy="true">
        {te.loading}
      </p>
    )
  }
  if (recipe.isError) {
    return (
      <EmptyState
        title={t.detail.notFound}
        className="mx-auto min-h-[320px] max-w-page p-8"
        action={
          <Link to="/recipes" className="text-body font-semibold text-accent-soft hover:text-accent">
            {t.detail.backToList}
          </Link>
        }
      />
    )
  }
  return <RecipeEditor key={id} recipe={recipe.data} />
}

type Creating = { index: number; name: string }

function RecipeEditor({ recipe }: { recipe: RecipeDetail | null }) {
  const navigate = useNavigate()
  const ingredients = useIngredients()
  const categories = useCategories()
  const glasses = useGlasses()
  const iceTypes = useIceTypes()
  const create = useCreateRecipe()
  const update = useUpdateRecipe()
  const [defaults] = useState(() => (recipe ? detailToInput(recipe) : emptyRecipe()))
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { isDirty, errors, isSubmitting },
  } = useForm<RecipeInput, unknown, RecipeInputParsed>({
    resolver: zodResolver(recipeInputSchema),
    defaultValues: defaults,
  })
  const [correction, setCorrection] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [creating, setCreating] = useState<Creating | null>(null)
  const allowLeave = useRef(false)
  // Chosen here, written with « Enregistrer »: undefined is « as it was », null takes it off.
  const [photo, setPhoto] = useState<PickedPhoto | null | undefined>(undefined)
  const savedPhoto = useRecipePhoto(recipe?.id)
  const photoMutation = useSetPhoto()
  const changed = isDirty || photo !== undefined
  const kind = useWatch({ control, name: 'kind' })

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      changed && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  )

  const names = useMemo(() => categoryNames(categories.data), [categories.data])
  const ingredientNames = useMemo(
    () => new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients.data],
  )
  const ingredientOptions = useMemo<ComboboxOption[]>(
    () =>
      (ingredients.data ?? [])
        // A preparation cannot use itself.
        .filter((ingredient) => recipe === null || ingredient.prepRecipeId !== recipe.id)
        .map((ingredient) => ({
          id: ingredient.id,
          label: ingredient.name,
          hint: names.get(ingredient.categoryId),
          keywords: ingredient.aliases,
        })),
    [ingredients.data, names, recipe],
  )
  const categoryGroups = useMemo(() => leafCategoryGroups(categories.data ?? []), [categories.data])
  const glassOptions = useMemo(
    () => (glasses.data ?? []).map((glass) => ({ value: glass.id, label: glass.name })),
    [glasses.data],
  )
  const iceOptions = useMemo(
    () => (iceTypes.data ?? []).map((ice) => ({ value: ice.id, label: ice.name })),
    [iceTypes.data],
  )

  async function save(values: RecipeInputParsed) {
    const data = cleanForSave(values)
    allowLeave.current = true
    try {
      const saved =
        recipe === null
          ? await create.mutateAsync({ data, label: textOrNull(versionLabel) })
          : photo !== undefined && !isDirty
            ? recipe // A new photo alone makes no new version.
            : await update.mutateAsync({
                id: recipe.id,
                data,
                newVersion: !correction,
                label: correction ? null : textOrNull(versionLabel),
              })
      if (photo !== undefined) {
        // The recipe is written: a photo that fails is said, and does not undo it.
        await photoMutation
          .mutateAsync({ owner: 'recipe', id: saved.id, content: photo?.content ?? null })
          .catch(notifyError)
      }
      toast.show({ message: te.saved(saved.name, fr.components.display.version(saved.version)) })
      void navigate(`/recipes/${saved.id}`, { replace: true })
    } catch (error) {
      allowLeave.current = false
      notifyError(error)
    }
  }

  function reportInvalid() {
    toast.show({ message: te.invalid, tone: 'error' })
  }

  return (
    <div className="mx-auto flex max-w-page flex-col">
      <form
        noValidate
        aria-labelledby="recipe-editor-title"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void handleSubmit(save, reportInvalid)(event)
        }}
      >
        <header className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-caption text-fg-muted">
              {recipe ? te.eyebrowEdit(fr.components.display.version(recipe.version)) : te.eyebrowNew}
            </span>
            <h1
              id="recipe-editor-title"
              className="m-0 truncate text-title font-semibold tracking-tight text-fg"
            >
              {recipe ? te.editTitle(recipe.name) : te.newTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => void navigate(recipe ? `/recipes/${recipe.id}` : '/recipes')}
            >
              {te.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? te.saving : te.save}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4 max-[1360px]:grid-cols-[minmax(0,1fr)_292px]">
          <div className="flex min-w-0 flex-col gap-4">
            <Section title={te.sections.essentials}>
              <Input
                {...register('name')}
                label={tf.name}
                placeholder={tf.namePlaceholder}
                autoComplete="off"
                maxLength={120}
                autoFocus={recipe === null}
                error={fieldErrorMessage(errors.name, { required: t.form.nameRequired })}
              />
              <div className="flex flex-wrap gap-4">
                <div className="flex shrink-0 flex-col gap-1.5">
                  <span aria-hidden="true" className="text-small font-medium text-fg-secondary">
                    {tf.kind}
                  </span>
                  <Controller
                    control={control}
                    name="kind"
                    render={({ field }) => (
                      <SegmentedControl<'cocktail' | 'prep'>
                        label={tf.kind}
                        value={field.value ?? 'cocktail'}
                        onChange={field.onChange}
                        className="self-start"
                        options={[
                          { value: 'cocktail', label: te.kindOptions.cocktail },
                          { value: 'prep', label: te.kindOptions.prep },
                        ]}
                      />
                    )}
                  />
                </div>
                <Select
                  {...register('status')}
                  label={tf.status}
                  options={statusOptions}
                  className="min-w-36 flex-1"
                />
                <Select
                  {...register('origin')}
                  label={tf.origin}
                  options={originOptions}
                  className="min-w-36 flex-1"
                />
              </div>
              <NullableText
                control={control}
                name="credit"
                label={tf.credit}
                description={tf.creditHint}
                maxLength={200}
              />
            </Section>

            <Section title={te.sections.lines}>
              <LinesEditor
                control={control}
                register={register}
                getValues={getValues}
                setValue={setValue}
                options={ingredientOptions}
                names={ingredientNames}
                onCreate={(index, name) => {
                  setCreating({ index, name })
                }}
              />
            </Section>

            <Section title={te.sections.service}>
              <div className="grid grid-cols-3 gap-4">
                <NullableSelect control={control} name="method" label={tf.method} options={methodOptions} />
                <NullableSelect control={control} name="glassId" label={tf.glass} options={glassOptions} />
                <NullableSelect control={control} name="iceId" label={tf.ice} options={iceOptions} />
                <NullableSelect control={control} name="family" label={tf.family} options={familyOptions} />
                <NullableSelect
                  control={control}
                  name="drinkLength"
                  label={tf.length}
                  options={lengthOptions}
                />
                <NullableSelect
                  control={control}
                  name="servingMoment"
                  label={tf.moment}
                  options={momentOptions}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <NullableText
                  control={control}
                  name="profile"
                  label={tf.profile}
                  description={tf.profileHint}
                  maxLength={200}
                />
                <NumberField
                  control={control}
                  name="dilutionOverridePct"
                  label={tf.dilution}
                  description={tf.dilutionHint}
                  unit={t.panel.units.pct}
                  max={100}
                />
              </div>
            </Section>

            <Section title={te.sections.text}>
              <ListText
                control={control}
                name="steps"
                label={tf.steps}
                description={tf.stepsHint}
                multiline
              />
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <NullableText control={control} name="garnish" label={tf.garnish} maxLength={1000} />
                <Controller
                  control={control}
                  name="garnishCostHtCents"
                  render={({ field, fieldState }) => (
                    <NumberWithUnit
                      ref={field.ref}
                      label={tf.garnishCost}
                      description={tf.garnishCostHint}
                      unit="€"
                      min={0}
                      max={10_000}
                      step={0.1}
                      decimals={2}
                      value={field.value === null || field.value === undefined ? null : field.value / 100}
                      onChange={(value) => {
                        field.onChange(value === null ? null : Math.round(value * 100))
                      }}
                      onBlur={field.onBlur}
                      error={fieldErrorMessage(fieldState.error, { numeric: true })}
                    />
                  )}
                />
              </div>
              <NullableText control={control} name="notes" label={tf.notes} maxLength={10_000} multiline />
              <ListText control={control} name="tags" label={tf.tags} description={tf.tagsHint} />
            </Section>

            {kind === 'prep' ? (
              <Section title={te.sections.prep}>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    control={control}
                    name="yieldMl"
                    label={tf.yield}
                    description={tf.yieldHint}
                    unit={t.panel.units.ml}
                    max={100_000}
                    integer
                  />
                  <NumberField
                    control={control}
                    name="shelfLifeDays"
                    label={tf.shelfLife}
                    description={tf.shelfLifeHint}
                    unit={tf.shelfLifeUnit}
                    max={3650}
                    integer
                  />
                </div>
                <NullableSelect
                  control={control}
                  name="prepCategoryId"
                  label={tf.category}
                  description={tf.categoryHint}
                  options={categoryGroups}
                />
                <NullableText
                  control={control}
                  name="storageNotes"
                  label={tf.storage}
                  maxLength={2000}
                  multiline
                />
              </Section>
            ) : null}
          </div>

          <aside className="sticky top-0 flex min-w-0 flex-col gap-4">
            <EditorPanel control={control} getValues={getValues} names={ingredientNames} />
            <Section title={fr.components.forms.photo.title}>
              <PhotoField
                src={photo === undefined ? photoUrl(savedPhoto.data?.path) : (photo?.preview ?? null)}
                alt={fr.components.forms.photo.of(recipe?.name ?? te.newTitle)}
                disabled={isSubmitting}
                onPick={setPhoto}
                onRemove={() => {
                  // Never saved: simply forgotten.
                  setPhoto(savedPhoto.data?.path ? null : undefined)
                }}
              />
            </Section>
            {recipe ? (
              <Section title={te.sections.save}>
                <Checkbox
                  label={tf.newVersion}
                  description={tf.newVersionHint}
                  checked={correction}
                  onChange={(event) => {
                    setCorrection(event.target.checked)
                  }}
                />
                <Input
                  label={tf.label}
                  description={tf.labelHint}
                  value={versionLabel}
                  maxLength={120}
                  disabled={correction}
                  autoComplete="off"
                  onChange={(event) => {
                    setVersionLabel(event.target.value)
                  }}
                />
              </Section>
            ) : null}
          </aside>
        </div>
      </form>

      <CreateIngredientDialog
        open={creating !== null}
        initialName={creating?.name ?? ''}
        onClose={() => {
          setCreating(null)
        }}
        onDone={(ingredient) => {
          if (creating) {
            setValue(`lines.${creating.index}.ingredientId`, ingredient.id, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          setCreating(null)
        }}
      />

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => {
          blocker.reset?.()
        }}
        title={te.leave.title}
        description={te.leave.description}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              data-autofocus=""
              onClick={() => {
                blocker.reset?.()
              }}
            >
              {te.leave.stay}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                blocker.proceed?.()
              }}
            >
              {te.leave.leave}
            </Button>
          </>
        }
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" aria-label={title} className="gap-4">
      <h2 className="m-0 text-body font-semibold text-fg">{title}</h2>
      {children}
    </Card>
  )
}

/** Calculated panel of the draft, refreshed a moment after the last change. */
function EditorPanel({
  control,
  getValues,
  names,
}: {
  control: FormControl
  getValues: UseFormGetValues<RecipeInput>
  names: ReadonlyMap<string, string>
}) {
  const watched = useWatch({ control })
  const [data, setData] = useState<RecipeInput | null>(() => computationInput(getValues()))

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = computationInput(getValues())
      // A value out of bounds is being typed: keep the last valid calculation.
      if (next === null || recipeInputSchema.safeParse(next).success) setData(next)
    }, 300)
    return () => {
      window.clearTimeout(timer)
    }
  }, [watched, getValues])

  return <ComputedPanel data={data} names={names} />
}

type TextKey = 'credit' | 'garnish' | 'notes' | 'profile' | 'storageNotes'

/** Optional text: an empty field is stored as null. */
function NullableText({
  control,
  name,
  label,
  description,
  maxLength,
  multiline = false,
}: {
  control: FormControl
  name: TextKey
  label: string
  description?: string
  maxLength: number
  multiline?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const common = {
          name: field.name,
          label,
          description,
          maxLength,
          value: field.value ?? '',
          onBlur: field.onBlur,
          error: fieldErrorMessage(fieldState.error),
        }
        return multiline ? (
          <FormattedTextarea
            {...common}
            ref={field.ref}
            rows={4}
            onChange={(event) => {
              field.onChange(textOrNull(event.target.value))
            }}
          />
        ) : (
          <Input
            {...common}
            ref={field.ref}
            autoComplete="off"
            onChange={(event) => {
              field.onChange(textOrNull(event.target.value))
            }}
          />
        )
      }}
    />
  )
}

type ChoiceKey =
  'family' | 'method' | 'glassId' | 'iceId' | 'drinkLength' | 'servingMoment' | 'prepCategoryId'

/** Optional choice: « Non précisé » is stored as null. */
function NullableSelect({
  control,
  name,
  label,
  description,
  options,
}: {
  control: FormControl
  name: ChoiceKey
  label: string
  description?: string
  options: readonly (SelectOption | SelectGroup)[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          ref={field.ref}
          name={field.name}
          label={label}
          description={description}
          options={options}
          placeholder={t.none}
          value={field.value ?? ''}
          onBlur={field.onBlur}
          onChange={(event) => {
            field.onChange(event.target.value === '' ? null : event.target.value)
          }}
        />
      )}
    />
  )
}

type NumberKey = 'dilutionOverridePct' | 'yieldMl' | 'shelfLifeDays'

function NumberField({
  control,
  name,
  label,
  description,
  unit,
  max,
  integer = false,
}: {
  control: FormControl
  name: NumberKey
  label: string
  description?: string
  unit: string
  max: number
  integer?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <NumberWithUnit
          ref={field.ref}
          name={field.name}
          label={label}
          description={description}
          unit={unit}
          min={0}
          max={max}
          decimals={integer ? 0 : undefined}
          value={field.value ?? null}
          onBlur={field.onBlur}
          onChange={(value) => {
            field.onChange(value === null || !integer ? value : Math.round(value))
          }}
          error={fieldErrorMessage(fieldState.error, { numeric: true })}
        />
      )}
    />
  )
}

/**
 * A list typed as text: steps one per line, tags separated by commas. The text stays as typed
 * while the form receives the list.
 */
function ListText({
  control,
  name,
  label,
  description,
  multiline = false,
}: {
  control: FormControl
  name: 'steps' | 'tags'
  label: string
  description?: string
  multiline?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ListTextInput
          value={field.value ?? []}
          onChange={field.onChange}
          onBlur={field.onBlur}
          label={label}
          description={description}
          multiline={multiline}
        />
      )}
    />
  )
}

function ListTextInput({
  value,
  onChange,
  onBlur,
  label,
  description,
  multiline,
}: {
  value: readonly string[]
  onChange: (value: string[]) => void
  onBlur: () => void
  label: string
  description?: string
  multiline: boolean
}) {
  const [text, setText] = useState(() => value.join(multiline ? '\n' : ', '))
  return multiline ? (
    <FormattedTextarea
      lists={false}
      label={label}
      description={description}
      rows={5}
      value={text}
      onBlur={onBlur}
      onChange={(event) => {
        setText(event.target.value)
        onChange(event.target.value.split('\n'))
      }}
    />
  ) : (
    <Input
      label={label}
      description={description}
      value={text}
      autoComplete="off"
      onBlur={onBlur}
      onChange={(event) => {
        setText(event.target.value)
        onChange(splitList(event.target.value, ','))
      }}
    />
  )
}

type LinesEditorProps = {
  control: FormControl
  register: UseFormRegister<RecipeInput>
  getValues: UseFormGetValues<RecipeInput>
  setValue: UseFormSetValue<RecipeInput>
  options: readonly ComboboxOption[]
  names: ReadonlyMap<string, string>
  onCreate: (index: number, name: string) => void
}

/**
 * Lines of the recipe. Reordered with the mouse (drag the handle), with the up and down
 * buttons, or with Alt and the arrows from anywhere in the line.
 */
function LinesEditor({ control, register, getValues, setValue, options, names, onCreate }: LinesEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'lines' })
  const [announcement, setAnnouncement] = useState('')
  const [dragReady, setDragReady] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  function lineName(index: number): string {
    const id = getValues(`lines.${index}.ingredientId`)
    return (id ? names.get(id) : undefined) ?? tl.unnamed
  }

  function moveLine(from: number, to: number, focus: HTMLElement | null) {
    if (to < 0 || to >= fields.length || from === to) return
    const name = lineName(from)
    move(from, to)
    setAnnouncement(tl.moved(name, to + 1, fields.length))
    if (!focus) return
    // Moving a line moves its DOM nodes, which drops the focus: give it back.
    requestAnimationFrame(() => {
      if (focus instanceof HTMLButtonElement && focus.disabled) {
        focus.closest('[data-line]')?.querySelector<HTMLButtonElement>('[data-move]:not(:disabled)')?.focus()
      } else {
        focus.focus()
      }
    })
  }

  function addLine() {
    append(emptyLine(), { shouldFocus: false })
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll<HTMLInputElement>('[data-line] input[role="combobox"]')
      inputs?.[inputs.length - 1]?.focus()
    })
  }

  function endDrag() {
    setDragFrom(null)
    setDragReady(null)
    setDropIndex(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <p className="m-0 text-small text-fg-muted">{tl.empty}</p>
      ) : (
        <ol ref={listRef} aria-label={tl.listLabel} className="m-0 flex list-none flex-col gap-2 p-0">
          {fields.map((field, index) => (
            <LineRow
              key={field.id}
              index={index}
              total={fields.length}
              control={control}
              register={register}
              setValue={setValue}
              options={options}
              draggable={dragReady === index}
              dropTarget={dropIndex === index && dragFrom !== index}
              onCreate={onCreate}
              onMove={moveLine}
              onRemove={() => {
                remove(index)
              }}
              onHandleDown={() => {
                setDragReady(index)
              }}
              onDragStart={(event) => {
                setDragFrom(index)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(index))
              }}
              onDragOver={(event) => {
                if (dragFrom === null) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                if (dropIndex !== index) setDropIndex(index)
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragFrom !== null) moveLine(dragFrom, index, null)
                endDrag()
              }}
              onDragEnd={endDrag}
            />
          ))}
        </ol>
      )}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" icon={<Plus size={16} aria-hidden="true" />} onClick={addLine}>
          {tl.add}
        </Button>
        {fields.length > 1 ? <span className="text-caption text-fg-muted">{tl.reorderHint}</span> : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

type LineRowProps = {
  index: number
  total: number
  control: FormControl
  register: UseFormRegister<RecipeInput>
  setValue: UseFormSetValue<RecipeInput>
  options: readonly ComboboxOption[]
  draggable: boolean
  dropTarget: boolean
  onCreate: (index: number, name: string) => void
  onMove: (from: number, to: number, focus: HTMLElement | null) => void
  onRemove: () => void
  onHandleDown: () => void
  onDragStart: (event: DragEvent<HTMLLIElement>) => void
  onDragOver: (event: DragEvent<HTMLLIElement>) => void
  onDrop: (event: DragEvent<HTMLLIElement>) => void
  onDragEnd: () => void
}

function LineRow({
  index,
  total,
  control,
  register,
  setValue,
  options,
  draggable,
  dropTarget,
  onCreate,
  onMove,
  onRemove,
  onHandleDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LineRowProps) {
  const position = index + 1
  const unit = useWatch({ control, name: `lines.${index}.unit` })
  const ingredientId = useWatch({ control, name: `lines.${index}.ingredientId` })
  const products = useProducts(ingredientId ? ingredientId : null)
  const bottles = (products.data ?? []).map((product) => ({
    value: product.id,
    label: product.brand ? `${product.brand} ${product.name}` : product.name,
  }))
  const noQuantity = unit === 'top' || unit === 'to_taste'

  function handleKeyDownCapture(event: KeyboardEvent<HTMLLIElement>) {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    // Before the field itself: a combobox would open its list on Alt and an arrow.
    event.preventDefault()
    event.stopPropagation()
    const target = event.target instanceof HTMLElement ? event.target : null
    onMove(index, event.key === 'ArrowUp' ? index - 1 : index + 1, target)
  }

  return (
    <li
      data-line=""
      aria-label={tl.position(position)}
      draggable={draggable}
      onKeyDownCapture={handleKeyDownCapture}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        '@container flex flex-col gap-1.5 rounded-nested border bg-surface-2/50 p-2 transition-colors duration-150 ease-out-soft',
        dropTarget ? 'border-accent' : 'border-border',
      )}
    >
      {/* Too narrow for one row: the ingredient keeps the first one, dose and unit go below. */}
      <div className="flex flex-wrap items-start gap-2 @min-[35rem]:flex-nowrap">
        <span
          aria-hidden="true"
          title={tl.drag(position)}
          className="mt-2 flex cursor-grab text-fg-muted hover:text-fg active:cursor-grabbing"
          onPointerDown={onHandleDown}
        >
          <GripVertical size={14} />
        </span>
        <span aria-hidden="true" className="nums mt-2 w-4 shrink-0 text-right text-caption text-fg-muted">
          {position}
        </span>
        <Controller
          control={control}
          name={`lines.${index}.ingredientId`}
          render={({ field, fieldState }) => (
            <Combobox
              ref={field.ref}
              label={tl.ingredient(position)}
              hideLabel
              placeholder={tl.ingredientPlaceholder}
              options={options}
              value={field.value ? field.value : null}
              onSelect={(id) => {
                field.onChange(id)
                setValue(`lines.${index}.preferredProductId`, null)
              }}
              onCreate={(label) => {
                onCreate(index, label)
              }}
              error={fieldErrorMessage(fieldState.error, { required: t.form.ingredientRequired })}
              className="min-w-0 flex-1 basis-[calc(100%-4rem)] @min-[35rem]:basis-0"
            />
          )}
        />
        <Controller
          control={control}
          name={`lines.${index}.quantity`}
          render={({ field, fieldState }) => (
            <NumberWithUnit
              ref={field.ref}
              name={field.name}
              label={tl.quantity(position)}
              hideLabel
              min={0}
              max={100_000}
              step={unitStep(unit ?? 'ml')}
              disabled={noQuantity}
              value={field.value ?? null}
              onBlur={field.onBlur}
              onChange={field.onChange}
              error={fieldErrorMessage(fieldState.error, { numeric: true })}
              className="ml-[2.875rem] w-20 shrink-0 @min-[35rem]:ml-0"
            />
          )}
        />
        <Select
          {...register(`lines.${index}.unit`)}
          label={tl.unit(position)}
          hideLabel
          options={unitOptions}
          className="w-32 shrink-0"
        />
        <div className="mt-0.5 ml-auto flex shrink-0 items-center gap-0.5 @min-[35rem]:ml-0">
          <IconButton
            data-move=""
            size="sm"
            variant="ghost"
            label={tl.moveUp(position)}
            icon={<ArrowUp size={14} aria-hidden="true" />}
            disabled={index === 0}
            onClick={(event) => {
              onMove(index, index - 1, event.currentTarget)
            }}
          />
          <IconButton
            data-move=""
            size="sm"
            variant="ghost"
            label={tl.moveDown(position)}
            icon={<ArrowDown size={14} aria-hidden="true" />}
            disabled={index === total - 1}
            onClick={(event) => {
              onMove(index, index + 1, event.currentTarget)
            }}
          />
          <IconButton
            size="sm"
            variant="ghost"
            label={tl.remove(position)}
            icon={<Trash2 size={14} aria-hidden="true" />}
            onClick={onRemove}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-10">
        {unit === 'top' ? (
          <Controller
            control={control}
            name={`lines.${index}.topEstimateMl`}
            render={({ field, fieldState }) => (
              <NumberWithUnit
                ref={field.ref}
                name={field.name}
                label={tl.topEstimate(position)}
                hideLabel
                placeholder={tl.topEstimateShort}
                unit={t.panel.units.ml}
                min={0}
                max={10_000}
                step={10}
                value={field.value ?? null}
                onBlur={field.onBlur}
                onChange={field.onChange}
                error={fieldErrorMessage(fieldState.error, { numeric: true })}
                className="w-40"
              />
            )}
          />
        ) : null}
        <Checkbox {...register(`lines.${index}.isOptional`)} label={tl.optional} />
        <Checkbox {...register(`lines.${index}.isGarnish`)} label={tl.garnish} />
        {bottles.length > 0 ? (
          <Controller
            control={control}
            name={`lines.${index}.preferredProductId`}
            render={({ field }) => (
              <Select
                ref={field.ref}
                name={field.name}
                label={tl.bottle}
                hideLabel
                placeholder={tl.bottleAny}
                options={bottles}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.target.value === '' ? null : event.target.value)
                }}
                className="w-56"
              />
            )}
          />
        ) : null}
        <Controller
          control={control}
          name={`lines.${index}.note`}
          render={({ field }) => (
            <Input
              ref={field.ref}
              name={field.name}
              label={tl.note(position)}
              hideLabel
              placeholder={tl.notePlaceholder}
              maxLength={500}
              autoComplete="off"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(event) => {
                field.onChange(textOrNull(event.target.value))
              }}
              className="min-w-[10rem] flex-1"
            />
          )}
        />
      </div>
    </li>
  )
}
