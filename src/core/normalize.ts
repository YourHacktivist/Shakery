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
/** Invisible format characters: zero-width space and joiner, soft hyphen, BOM, direction marks. */
const FORMAT = /\p{Cf}+/gu
const APOSTROPHES = /[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g
const DASHES = /[\u2010-\u2015\u2212]/g
const SPACES = /[\s\u00A0\u202F]+/g

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(LIGATURE_PATTERN, (char) => LIGATURES[char] ?? char)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(FORMAT, '')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, '-')
    .replace(SPACES, ' ')
    .trim()
}

/**
 * Tags as typed, once each: « Été » then « été » keeps « Été », the first spelling. A tag
 * that is only invisible characters is dropped.
 */
export function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const tag of tags) {
    const key = normalizeName(tag)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    kept.push(tag.trim())
  }
  return kept
}
