/**
 * Helpers shared by the forms built with react-hook-form and the Zod schemas of
 * shared/domain/catalog.ts. Zod messages are technical and in English: the field shows a
 * French message chosen from the issue code instead.
 */
import type { FieldError } from 'react-hook-form'
import { fr } from '@renderer/i18n/fr'

const t = fr.recipes.form

type ErrorOptions = {
  /** Message for an empty required field (a name, an ingredient, a category). */
  required?: string
  /** A number field: bounds become « hors limites », a wrong type « nombre entier ». */
  numeric?: boolean
}

/** French message of a field error, chosen from the Zod issue code. */
export function fieldErrorMessage(
  error: FieldError | undefined,
  { required, numeric = false }: ErrorOptions = {},
): string | undefined {
  if (!error) return undefined
  switch (error.type) {
    case 'too_small':
      return numeric ? t.outOfRange : (required ?? t.required)
    case 'too_big':
      return numeric ? t.outOfRange : t.tooLong
    case 'invalid_type':
      return numeric ? t.integer : (required ?? t.required)
    default:
      return t.invalid
  }
}

/** Empty or blank text becomes null, as the schemas expect for optional text. */
export function textOrNull(value: string): string | null {
  return value.trim() === '' ? null : value
}

/** Splits a list typed as text (« a, b ») into trimmed, non-empty items. */
export function splitList(value: string, separator: string | RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item !== '')
}
