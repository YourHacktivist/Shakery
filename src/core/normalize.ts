/**
 * Normalized form of names and aliases (section 7): lower case, accents removed (NFD
 * then diacritics dropped), ligatures expanded (« œ » becomes « oe »), typographic
 * apostrophes and dashes unified, spaces collapsed. Used for uniqueness, duplicate
 * detection and search.
 */
/** Ligatures, and letters that NFD does not decompose into a base letter plus accent. */
const LIGATURES: Record<string, string> = {
  ı: 'i',
  ł: 'l',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ħ: 'h',
  œ: 'oe',
  æ: 'ae',
  ß: 'ss',
  ĳ: 'ij',
  ﬀ: 'ff',
  ﬁ: 'fi',
  ﬂ: 'fl',
  ﬃ: 'ffi',
  ﬄ: 'ffl',
  ﬅ: 'st',
  ﬆ: 'st',
}

const LIGATURE_PATTERN = new RegExp(`[${Object.keys(LIGATURES).join('')}]`, 'g')
const DIACRITICS = /\p{M}+/gu
const APOSTROPHES = /[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g
const DASHES = /[\u2010-\u2015\u2212]/g
const SPACES = /[\s\u00A0\u202F]+/g

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(LIGATURE_PATTERN, (char) => LIGATURES[char] ?? char)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, '-')
    .replace(SPACES, ' ')
    .trim()
}
