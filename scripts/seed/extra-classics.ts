/**
 * The extra classics of the seed (D-036). A bulk export of recipes, whose address is given by
 * SHAKERY_CLASSICS_EXPORT_URL and kept out of the repository, is fetched once by
 * extra-classics-fetch.ts and kept in .cache/. Each ingredient line (« Rutte Dry Gin 30 ml ») is cut into a label, a quantity, a
 * unit word and an extra text; classics-map.json then gives, for every label, the ingredient of the
 * French reference it stands for, the brand kept as a note and the unit to use without quantity.
 */
import { normalizeName } from '../../src/core/normalize'
import type { RecipeLineSeed, RecipeSeed, SeedUnit } from './recipes'

/** Address of the export, outside the repository; only a new fetch needs it. */
export const EXPORT_URL = process.env['SHAKERY_CLASSICS_EXPORT_URL'] ?? ''
export const EXPORT_CACHE = 'classics/recipes.jsonl'

export type RawClassic = {
  name: string
  url: string
  abv: number
  base: string
  method: string
  glass: string
  garnish: string
  ingredients: string[]
}

export type ParsedLine = {
  /** Lower case, single spaces, NFC: the key of classics-map.json. */
  label: string
  quantity: number | null
  /** Lower case unit word as written (« dash », « spoon »), null without one. */
  unitWord: string | null
  /** Text after the unit (« (4 drops) », « lightly whipped »), null without one. */
  extra: string | null
  /** « Top up with » and the like, or « Garnish with », written after the label. */
  marker: 'top' | 'garnish' | null
}

/** Unit words of the export, longest first so that « dashes » wins over « dash ». */
export const UNIT_WORDS = [
  'ml',
  'cl',
  'oz',
  'dashes',
  'dash',
  'drops',
  'drop',
  'spoons',
  'spoon',
  'barspoons',
  'barspoon',
  'teaspoons',
  'teaspoon',
  'tsp',
  'tablespoons',
  'tablespoon',
  'tbsp',
  'pcs',
  'pc',
  'whole',
  'units',
  'unit',
  'cubes',
  'cube',
  'slices',
  'slice',
  'wedges',
  'wedge',
  'twists',
  'twist',
  'sprigs',
  'sprig',
  'leaves',
  'leaf',
  'grams',
  'gram',
  'g',
  'pinches',
  'pinch',
  'grinds',
  'grind',
  'splashes',
  'splash',
  'scoops',
  'scoop',
  'inches',
  'inch',
  'parts',
  'part',
  'cupful',
  'cups',
  'cup',
  'fresh',
  'bottles',
  'bottle',
  'pints',
  'pint',
  'fifth',
  'peas',
  'pea',
  'pieces',
  'piece',
  'stalks',
  'stalk',
  'sticks',
  'stick',
  'pods',
  'pod',
  'strips',
  'strip',
  'cans',
  'can',
  'shots',
  'shot',
  'dried',
  'rings',
  'ring',
  'knobs',
  'knob',
] as const

const NUM = String.raw`\d+(?:[.,]\d+)?`
const FRACTION = String.raw`\d+\s*[/⁄]\s*\d+`
const VULGAR = String.raw`\d*[½¼¾⅓⅔⅛]`
const ONE = String.raw`(?:${NUM}\s+${FRACTION}|${FRACTION}|${VULGAR}|${NUM})`
const QTY = String.raw`${ONE}(?:\s*(?:-|to)\s*${ONE})?`
const UNITS = [...new Set(UNIT_WORDS)].sort((a, b) => b.length - a.length).join('|')
// Greedy label: the quantity is the last one of the line, so that « Saline solution (4 parts
// water to 1 part salt) 2 drop » keeps its parentheses in the label.
const WITH_UNIT = new RegExp(String.raw`^(.+)\s+(${QTY})\s*(${UNITS})(?=$|\s|\()\.?\s*(.*)$`, 'iu')
const QTY_AT_END = new RegExp(String.raw`^(.+)\s+(${QTY})$`, 'iu')
const WHOLE_QTY = new RegExp(String.raw`^${QTY}$`, 'iu')

/** The greedy label may have eaten the start of the quantity (« 1 » of « 1 1/2 », « 1 to » of « 1 to 2 »). */
function widen(label: string, quantity: string): [string, string] {
  const tokens = label.split(' ')
  for (let take = Math.min(3, tokens.length - 1); take >= 1; take -= 1) {
    const candidate = `${tokens.slice(-take).join(' ')} ${quantity}`
    if (WHOLE_QTY.test(candidate)) return [tokens.slice(0, -take).join(' '), candidate]
  }
  return [label, quantity]
}
const TOP = /\s+(?:top up with|top up|top with|top|fill up with|fill with|to top|float)$/iu
const GARNISH = /\s+(?:garnish with|for garnish|to garnish|garnish)$/iu

const VULGARS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
}

function parseOne(text: string): number {
  const value = text.trim()
  const vulgar = /^(\d*)([½¼¾⅓⅔⅛])$/u.exec(value)
  if (vulgar) return Number(vulgar[1] || 0) + (VULGARS[vulgar[2] ?? ''] ?? 0)
  return value.split(/\s+/).reduce((sum, part) => {
    const fraction = /^(\d+)\s*[/⁄]\s*(\d+)$/u.exec(part)
    if (fraction) return sum + Number(fraction[1]) / Number(fraction[2])
    return sum + Number(part.replace(',', '.'))
  }, 0)
}

/** « 1-2 » gives the middle of the range. */
export function parseQuantity(text: string): number {
  const parts = text.split(/\s*(?:-|to)\s*/u).filter((part) => part !== '')
  const values = parts.map(parseOne)
  const value = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.round(value * 1000) / 1000
}

export function normalizeLabel(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:]+$/u, '')
    .trim()
}

export function parseLine(raw: string): ParsedLine | null {
  const text = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (text === '') return null
  const top = TOP.exec(text)
  if (top) {
    return {
      label: normalizeLabel(text.slice(0, top.index)),
      quantity: null,
      unitWord: null,
      extra: null,
      marker: 'top',
    }
  }
  const garnish = GARNISH.exec(text)
  if (garnish) {
    return {
      label: normalizeLabel(text.slice(0, garnish.index)),
      quantity: null,
      unitWord: null,
      extra: null,
      marker: 'garnish',
    }
  }
  const withUnit = WITH_UNIT.exec(text)
  if (withUnit) {
    const extra = (withUnit[4] ?? '').trim()
    const [label, quantity] = widen(withUnit[1] ?? '', withUnit[2] ?? '')
    return {
      label: normalizeLabel(label),
      quantity: parseQuantity(quantity),
      unitWord: (withUnit[3] ?? '').toLowerCase(),
      extra: extra === '' ? null : extra,
      marker: null,
    }
  }
  const atEnd = QTY_AT_END.exec(text)
  if (atEnd) {
    const [label, quantity] = widen(atEnd[1] ?? '', atEnd[2] ?? '')
    return {
      label: normalizeLabel(label),
      quantity: parseQuantity(quantity),
      unitWord: null,
      extra: null,
      marker: null,
    }
  }
  return { label: normalizeLabel(text), quantity: null, unitWord: null, extra: null, marker: null }
}

/** Last segment of the recipe URL: stable, unique, ASCII. */
export function slugOf(url: string): string {
  const slug = url.replace(/\/+$/, '').split('/').pop() ?? ''
  if (!/^[a-z0-9_-]+$/.test(slug)) throw new Error(`Unexpected recipe URL: ${url}`)
  return slug
}

export function readExport(body: string): RawClassic[] {
  return body
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as RawClassic)
}

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

/** One label of the export read by hand (classics-map.json, « ingredients »). */
export type LabelEntry = {
  /** Name of an ingredient of the reference (or of a classic preparation). */
  i: string
  /** Brand or product named by the export, kept as the line note. */
  b?: string
  /** French note for the line (« pressé minute », « à omettre avec une glace humide »). */
  n?: string
  /** Unit when the export gives no quantity: top, piece or to_taste (default to_taste). */
  u?: 'top' | 'piece' | 'to_taste'
  /** Garnish line. */
  g?: boolean
  /** Optional line. */
  o?: boolean
}

/** A label that is not an ingredient (« ice crushed ») is mapped to null and dropped. */
export type ClassicsMap = {
  units: Record<string, { unit: SeedUnit; factor?: number; note?: string }>
  glasses: Record<string, string | null>
  methods: Record<string, string | null>
  /** Names spoiled by a wrong encoding in the export, by exact raw name. */
  names?: Record<string, string>
  ingredients: Record<string, LabelEntry | null>
  /** Extra texts after the unit, translated (« (4 drops) » to « 4 gouttes »), or null to drop. */
  extras: Record<string, string | null>
  /** Lines read by hand, by exact raw text: replace the parsed line. Null drops the line. */
  lines: Record<string, Array<{ i: string; q: number | null; u: SeedUnit; n?: string; g?: boolean }> | null>
}

export type ExtraClassicsResult = {
  recipes: RecipeSeed[]
  skipped: string[]
  problems: string[]
}

/**
 * Turns the export into recipe seeds. `ingredientKeys` maps a normalised ingredient name to its
 * seed_key; `reserved` holds the normalised names already taken by IBA cocktails and preparations.
 */
export function buildExtraClassics(
  raw: readonly RawClassic[],
  map: ClassicsMap,
  garnishFr: Readonly<Record<string, string>>,
  ingredientKeys: ReadonlyMap<string, string>,
  reserved: ReadonlySet<string>,
): ExtraClassicsResult {
  const recipes: RecipeSeed[] = []
  const skipped: string[] = []
  const problems: string[] = []
  const names = new Set(reserved)
  const keys = new Set<string>()

  for (const cocktail of raw) {
    const slug = slugOf(cocktail.url)
    const name = (map.names?.[cocktail.name] ?? cocktail.name).normalize('NFC').trim()
    const normalized = normalizeName(name)
    if (names.has(normalized)) {
      skipped.push(name)
      continue
    }
    if (keys.has(slug)) {
      problems.push(`${slug}: duplicate URL`)
      continue
    }
    keys.add(slug)
    names.add(normalized)

    const lines: RecipeLineSeed[] = []
    for (const text of cocktail.ingredients) {
      const hand = map.lines[text.normalize('NFC').trim()]
      if (hand === null) continue
      if (hand !== undefined) {
        for (const line of hand) {
          const key = ingredientKeys.get(normalizeName(line.i))
          if (!key) {
            problems.push(`${slug}: « ${text} » gives the unknown ingredient ${line.i}`)
            continue
          }
          lines.push({
            ingredient: key,
            quantity: line.u === 'top' || line.u === 'to_taste' ? null : line.q,
            unit: line.u,
            is_optional: false,
            is_garnish: line.g ?? false,
            note: line.n ?? null,
          })
        }
        continue
      }
      const parsed = parseLine(text)
      if (!parsed) continue
      if (!(parsed.label in map.ingredients)) {
        problems.push(`${slug}: unknown label « ${parsed.label} » (${text})`)
        continue
      }
      const entry = map.ingredients[parsed.label]
      if (entry === null || entry === undefined) continue
      const key = ingredientKeys.get(normalizeName(entry.i))
      if (!key) {
        problems.push(`${slug}: « ${parsed.label} » gives the unknown ingredient ${entry.i}`)
        continue
      }
      const notes: string[] = []
      if (entry.b) notes.push(entry.b)
      if (entry.n) notes.push(entry.n)

      let unit: SeedUnit
      let quantity: number | null = parsed.quantity
      if (parsed.marker === 'top') {
        unit = 'top'
        quantity = null
      } else if (parsed.unitWord !== null) {
        const unitEntry = map.units[parsed.unitWord]
        if (!unitEntry) {
          problems.push(`${slug}: unknown unit « ${parsed.unitWord} » (${text})`)
          continue
        }
        unit = unitEntry.unit
        if (unitEntry.note) notes.push(unitEntry.note.replace('{q}', formatQuantity(parsed.quantity)))
        if (quantity !== null && unitEntry.factor !== undefined) quantity = round(quantity * unitEntry.factor)
      } else if (quantity !== null) {
        // A bare number counts pieces (« Cranberries 2 »); a liquid without unit is read by hand.
        unit = entry.u === 'top' ? 'top' : 'piece'
      } else {
        unit = entry.u ?? 'to_taste'
      }
      if (unit === 'top' || unit === 'to_taste') quantity = null
      if (parsed.extra !== null) {
        if (!(parsed.extra in map.extras)) {
          problems.push(`${slug}: unknown extra « ${parsed.extra} » (${text})`)
          continue
        }
        const extra = map.extras[parsed.extra]
        if (extra) notes.push(extra)
      }
      lines.push({
        ingredient: key,
        quantity,
        unit,
        is_optional: entry.o ?? false,
        is_garnish: parsed.marker === 'garnish' || (entry.g ?? false),
        note: notes.length > 0 ? notes.join(', ') : null,
      })
    }
    if (lines.length === 0) {
      problems.push(`${slug}: no line left`)
      continue
    }

    if (!(cocktail.method in map.methods)) problems.push(`${slug}: unknown method ${cocktail.method}`)
    if (!(cocktail.glass in map.glasses)) problems.push(`${slug}: unknown glass ${cocktail.glass}`)
    const garnishText = cocktail.garnish.trim()
    let garnish: string | null = null
    if (garnishText !== '') {
      const french = garnishFr[garnishText]
      if (french === undefined) problems.push(`${slug}: garnish without French text « ${garnishText} »`)
      else garnish = french === '' ? null : french
    }

    recipes.push({
      seed_key: `classic.${slug}`,
      name,
      kind: 'cocktail',
      source: 'seed',
      family: null,
      method: map.methods[cocktail.method] ?? null,
      glass: map.glasses[cocktail.glass] ?? null,
      ice: null,
      garnish,
      steps: [],
      notes: null,
      credit: null,
      yield_ml: null,
      ingredient_key: null,
      category: null,
      lines,
    })
  }
  return { recipes, skipped, problems }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function formatQuantity(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}
