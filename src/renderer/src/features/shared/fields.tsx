/**
 * Form fields bound to react-hook-form for nullable values: an empty text, an unset number
 * or « Non précisé » is stored as null, as the schemas of shared/domain/catalog.ts expect.
 */
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form'
import { AllergenBadge } from '@renderer/components/AllergenBadge'
import { Checkbox } from '@renderer/components/Checkbox'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { Select, type SelectGroup, type SelectOption } from '@renderer/components/Select'
import { Textarea } from '@renderer/components/Textarea'
import { fr } from '@renderer/i18n/fr'
import { fieldErrorMessage, splitList, textOrNull } from '@renderer/lib/forms'
import { ALLERGEN_CODES, type AllergenCode } from '@shared/domain/allergens'
import { useState } from 'react'

type Bound<T extends FieldValues, V> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the transformed values do not matter to a field
  control: Control<T, unknown, any>
  name: FieldPathByValue<T, V>
}

type NumberFieldProps<T extends FieldValues> = Bound<T, number | null | undefined> & {
  label: string
  description?: string
  unit?: string
  min?: number
  max?: number
  step?: number
  decimals?: number
  /** Whole numbers only: a typed decimal is rounded. */
  integer?: boolean
  /** Stored value = shown value × scale (100 for an amount in cents shown in euros). */
  scale?: number
  className?: string
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  unit,
  min = 0,
  max,
  step,
  decimals,
  integer = false,
  scale = 1,
  className,
}: NumberFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const stored = field.value as number | null | undefined
        return (
          <NumberWithUnit
            ref={field.ref}
            name={field.name}
            label={label}
            description={description}
            unit={unit}
            min={min}
            max={max}
            step={step}
            decimals={integer ? 0 : decimals}
            value={stored === null || stored === undefined ? null : stored / scale}
            onBlur={field.onBlur}
            onChange={(value) => {
              if (value === null) field.onChange(null)
              else field.onChange(integer || scale !== 1 ? Math.round(value * scale) : value)
            }}
            error={fieldErrorMessage(fieldState.error, { numeric: true })}
            className={className}
          />
        )
      }}
    />
  )
}

type TextFieldProps<T extends FieldValues> = Bound<T, string | null | undefined> & {
  label: string
  description?: string
  placeholder?: string
  maxLength: number
  multiline?: boolean
  /** Message of a format error (a barcode). */
  invalidMessage?: string
  className?: string
}

export function NullableTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  maxLength,
  multiline = false,
  invalidMessage,
  className,
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value as string | null | undefined) ?? ''
        const error = fieldState.error ? (invalidMessage ?? fieldErrorMessage(fieldState.error)) : undefined
        const onChange = (text: string) => {
          field.onChange(textOrNull(text))
        }
        return multiline ? (
          <Textarea
            ref={field.ref}
            name={field.name}
            label={label}
            description={description}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={3}
            value={value}
            onBlur={field.onBlur}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            error={error}
            className={className}
          />
        ) : (
          <Input
            ref={field.ref}
            name={field.name}
            label={label}
            description={description}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete="off"
            value={value}
            onBlur={field.onBlur}
            onChange={(event) => {
              onChange(event.target.value)
            }}
            error={error}
            className={className}
          />
        )
      }}
    />
  )
}

type SelectFieldProps<T extends FieldValues> = Bound<T, string | null | undefined> & {
  label: string
  description?: string
  options: readonly (SelectOption | SelectGroup)[]
  /** Error message to show instead of the generic one (a required choice, a rule). */
  errorMessage?: string
  className?: string
}

export function NullableSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  errorMessage,
  className,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          ref={field.ref}
          name={field.name}
          label={label}
          description={description}
          options={options}
          placeholder={fr.recipes.none}
          value={field.value ?? ''}
          onBlur={field.onBlur}
          onChange={(event) => {
            field.onChange(event.target.value === '' ? null : event.target.value)
          }}
          error={fieldState.error ? (errorMessage ?? fieldErrorMessage(fieldState.error)) : undefined}
          className={className}
        />
      )}
    />
  )
}

type ListFieldProps<T extends FieldValues> = Bound<T, string[] | undefined> & {
  label: string
  description?: string
}

/** A list typed as text, separated by commas (aliases, tags). */
export function CommaListField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: ListFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <CommaListInput
          value={(field.value as string[] | undefined) ?? []}
          onChange={field.onChange}
          onBlur={field.onBlur}
          label={label}
          description={description}
        />
      )}
    />
  )
}

function CommaListInput({
  value,
  onChange,
  onBlur,
  label,
  description,
}: {
  value: readonly string[]
  onChange: (value: string[]) => void
  onBlur: () => void
  label: string
  description?: string
}) {
  const [text, setText] = useState(() => value.join(', '))
  return (
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

type AllergenFieldProps<T extends FieldValues> = Bound<T, AllergenCode[] | undefined> & {
  label: string
}

/** The 14 regulatory allergens as checkboxes. */
export function AllergenField<T extends FieldValues>({ control, name, label }: AllergenFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = (field.value as AllergenCode[] | undefined) ?? []
        return (
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2 p-0 text-small font-medium text-fg-secondary">{label}</legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {ALLERGEN_CODES.map((code) => (
                <Checkbox
                  key={code}
                  label={fr.components.display.allergens[code]}
                  checked={selected.includes(code)}
                  onChange={(event) => {
                    const next = ALLERGEN_CODES.filter((candidate) =>
                      candidate === code ? event.target.checked : selected.includes(candidate),
                    )
                    field.onChange(next)
                  }}
                />
              ))}
            </div>
          </fieldset>
        )
      }}
    />
  )
}

/** Allergens of an ingredient or a bottle, or a sentence when there is none. */
export function AllergenList({ codes, empty }: { codes: readonly AllergenCode[]; empty: string }) {
  if (codes.length === 0) return <p className="m-0 text-small text-fg-secondary">{empty}</p>
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {codes.map((code) => (
        <li key={code} className="max-w-full">
          <AllergenBadge code={code} />
        </li>
      ))}
    </ul>
  )
}
