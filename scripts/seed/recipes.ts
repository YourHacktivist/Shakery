/**
 * IBA recipes for the seed: the ingredient lines read on the IBA website (review/iba-raw.json)
 * become recipe lines through iba-map.json (IBA label to ingredient, unit words), and the
 * French texts come from iba-fr.json, written by hand (steps rewritten, never translated
 * word for word). Used by build.ts.
 */
import { normalizeName } from '../../src/core/normalize'
import type { IbaCocktail } from './iba'

export type SeedUnit =
  | 'ml'
  | 'cl'
  | 'oz'
  | 'dash'
  | 'drop'
  | 'barspoon'
  | 'tsp'
  | 'g'
  | 'piece'
  | 'leaf'
  | 'slice'
  | 'wedge'
  | 'top'
  | 'to_taste'

export type RecipeLineSeed = {
  ingredient: string
  quantity: number | null
  unit: SeedUnit
  is_optional: boolean
  is_garnish: boolean
  note: string | null
}

export type RecipeSeed = {
  seed_key: string
  name: string
  kind: 'cocktail' | 'prep'
  source: 'seed_iba' | 'seed'
  family: string | null
  method: string | null
  glass: string | null
  ice: string | null
  garnish: string | null
  steps: string[]
  notes: string | null
  credit: string | null
  yield_ml: number | null
  ingredient_key: string | null
  category: string | null
  lines: RecipeLineSeed[]
}

type ManualLine = {
  quantity: number | null
  unit: SeedUnit
  ingredient: string
  note?: string
  optional?: boolean
}

export type IbaMap = {
  /** IBA label (lower case) to the name of a seed ingredient, or a line to ignore (null). */
  ingredients: Record<string, string | null>
  /** Unit words of the IBA site to Shakery units. */
  units: Record<string, SeedUnit>
  /** Lines that need a hand reading, by exact text; one IBA line may give several. */
  lines: Record<string, ManualLine | ManualLine[]>
}

/** Hand-written French entry of a cocktail: n name, f family, m method, g glass, i ice, d garnish, s steps. */
export type IbaFrench = {
  n: string
  f: string
  m: string
  g: string | null
  i: string | null
  d: string | null
  s: string[]
}

/** IBA lists, as named on its website. */
const CATEGORIES: Record<string, string> = {
  'the-unforgettables': 'The Unforgettables',
  'contemporary-classics': 'Contemporary Classics',
  'new-era': 'New Era Drinks',
}

const NUMBER = /^(\d+ \d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*/

function parseNumber(text: string): number {
  return text
    .trim()
    .split(' ')
    .reduce((sum, part) => {
      if (part.includes('/')) {
        const [a, b] = part.split('/').map(Number)
        return sum + (a ?? 0) / (b ?? 1)
      }
      return sum + Number(part.replace(',', '.'))
    }, 0)
}

function toLine(line: ManualLine): RecipeLineSeed {
  return {
    ingredient: line.ingredient,
    quantity: line.quantity,
    unit: line.unit,
    is_optional: line.optional ?? false,
    is_garnish: false,
    note: line.note ?? null,
  }
}

/** « 30 ml Gin », « 2 Dashes Angostura Bitters », « Top up with Soda Water ». */
export function parseLine(raw: string, map: IbaMap): RecipeLineSeed[] | 'ignored' | null {
  // The website mixes composed and decomposed accents.
  raw = raw.normalize('NFC')
  const manual = map.lines[raw]
  if (manual) return (Array.isArray(manual) ? manual : [manual]).map(toLine)
  let rest = raw.trim()
  let quantity: number | null = null
  const number = NUMBER.exec(rest)
  if (number) {
    quantity = parseNumber(number[1] ?? '')
    rest = rest.slice(number[0].length)
  }
  let unit: SeedUnit | null = null
  const lower = rest.toLowerCase()
  // Longest unit word first, so that « bar spoons » wins over « bar spoon ».
  for (const word of Object.keys(map.units).sort((a, b) => b.length - a.length)) {
    if (lower.startsWith(`${word} `)) {
      unit = map.units[word] ?? null
      rest = rest
        .slice(word.length)
        .trim()
        .replace(/^(of|with)\s+/i, '')
      break
    }
  }
  const label = rest.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!(label in map.ingredients)) return null
  const ingredient = map.ingredients[label]
  if (ingredient === null || ingredient === undefined) return 'ignored'
  if (unit === null) unit = quantity === null ? 'to_taste' : 'piece'
  if (unit === 'top' || unit === 'to_taste') quantity = null
  return [{ ingredient, quantity, unit, is_optional: false, is_garnish: false, note: null }]
}

export function buildRecipes(
  raw: readonly IbaCocktail[],
  map: IbaMap,
  french: Record<string, IbaFrench>,
  ingredientKeys: ReadonlyMap<string, string>,
): { recipes: RecipeSeed[]; unknownLines: string[]; missingFrench: string[] } {
  const recipes: RecipeSeed[] = []
  const unknownLines: string[] = []
  const missingFrench: string[] = []
  for (const cocktail of raw) {
    const fr = french[cocktail.slug]
    if (!fr) {
      missingFrench.push(cocktail.slug)
      continue
    }
    const lines: RecipeLineSeed[] = []
    for (const text of cocktail.ingredients) {
      const parsed = parseLine(text, map)
      if (parsed === null) {
        unknownLines.push(`${cocktail.slug}: ${text}`)
        continue
      }
      if (parsed === 'ignored') continue
      for (const line of parsed) {
        const key = ingredientKeys.get(normalizeName(line.ingredient))
        if (!key) {
          unknownLines.push(`${cocktail.slug}: ${text} (ingrédient ${line.ingredient} absent)`)
          continue
        }
        lines.push({ ...line, ingredient: key })
      }
    }
    recipes.push({
      seed_key: `iba.${cocktail.slug}`,
      name: fr.n,
      kind: 'cocktail',
      source: 'seed_iba',
      family: fr.f,
      method: fr.m,
      glass: fr.g === null ? null : `glass.${fr.g}`,
      ice: fr.i === null ? null : `ice.${fr.i}`,
      garnish: fr.d,
      steps: fr.s,
      notes: null,
      credit: `IBA, ${CATEGORIES[cocktail.category] ?? cocktail.category}`,
      yield_ml: null,
      ingredient_key: null,
      category: null,
      lines,
    })
  }
  return { recipes, unknownLines, missingFrench }
}
