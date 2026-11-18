/**
 * The 14 regulatory allergens (EU regulation 1169/2011, annex II), section 8 of the spec.
 * Codes are stable identifiers stored in JSON columns; labels live in the i18n files.
 */
export const ALLERGEN_CODES = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const

export type AllergenCode = (typeof ALLERGEN_CODES)[number]
