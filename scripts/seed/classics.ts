/**
 * Family and standard steps of a classic whose source gives neither (D-039: the export of the
 * extra classics has the lines, the method, the glass and the garnish only). Deterministic rules,
 * measured against the 102 IBA classics read by hand (classics.test.ts). A drink that no rule
 * recognises keeps an empty family: never « other », which the interface calls « Autre ».
 * The steps are the usual course of the method, announced as such by `TYPICAL_STEPS_CREDIT`.
 */
import type { Method } from '../../src/core/model'
import type { RECIPE_FAMILIES } from '../../src/main/db/schema'

export type Family = Exclude<(typeof RECIPE_FAMILIES)[number], 'other'>

export type ClassicLine = {
  readonly name: string
  readonly category: string
  /** Reference degree of the ingredient, null when unknown. */
  readonly abv: number | null
  readonly quantity: number | null
  readonly unit: string
  readonly note: string | null
  readonly isGarnish: boolean
  readonly isOptional: boolean
}

export type Classic = {
  readonly name: string
  readonly method: Method | null
  /** Method word of the export: « layered » and « muddled » are both stored as « build ». */
  readonly sourceMethod?: string
  readonly glass: string | null
  readonly garnish: string | null
  readonly lines: readonly ClassicLine[]
}

const NBSP = String.fromCharCode(0xa0)
const ML: Readonly<Record<string, number>> = {
  ml: 1,
  cl: 10,
  oz: 30,
  dash: 0.25,
  drop: 0.05,
  barspoon: 5,
  tsp: 5,
}
/** A line « top » counts as this much to weigh the parts of a drink, never in a calculation. */
const TOP_WEIGHT = 90
const PIECES = new Set(['piece', 'leaf', 'slice', 'wedge'])

const SHARP_JUICES = new Set([
  'Jus de citron',
  'Jus de citron Rangpur',
  'Jus de citron vert',
  'Jus de yuzu',
  'Jus de bergamote',
  'Jus de calamansi',
  'Verjus',
  'Sour mix',
  'Solution acide',
  "Solution d'acide citrique",
])
const TART_JUICES = new Set([
  "Jus d'orange",
  "Jus d'orange sanguine",
  'Jus de mandarine',
  "Jus d'ananas",
  'Jus de pamplemousse',
  'Jus de pamplemousse rose',
  'Jus de fruit de la passion',
])
const SPARKLING_JUICES = new Set(['Jus de pomme pétillant', 'Soda au thé à la banane'])
const LONG_GLASSES = new Set([
  'glass.collins',
  'glass.highball',
  'glass.mule',
  'glass.hurricane',
  'glass.beer',
])
const ICED_GLASSES = new Set([
  ...LONG_GLASSES,
  'glass.rocks',
  'glass.julep',
  'glass.tiki',
  'glass.copa',
  'glass.pitcher',
  'glass.punch_bowl',
])
const SHARED_GLASSES = new Set(['glass.pitcher', 'glass.punch_bowl'])

function has(category: string, ...prefixes: string[]): boolean {
  return prefixes.some((prefix) => category === prefix || category.startsWith(`${prefix}.`))
}

function weight(line: ClassicLine): number {
  if (line.unit === 'top') return TOP_WEIGHT
  return (line.quantity ?? 0) * (ML[line.unit] ?? 0)
}

function isSparklingWine(line: ClassicLine): boolean {
  return has(line.category, 'cat.sparkling')
}

/** Added last, so that the bubbles stay. */
function isBubbly(line: ClassicLine): boolean {
  return (
    isSparklingWine(line) ||
    has(line.category, 'cat.mixers.ginger', 'cat.mixers.sodas', 'cat.mixers.sparkling_water') ||
    has(line.category, 'cat.mixers.tonic', 'cat.beer_cider.beer', 'cat.beer_cider.cider') ||
    SPARKLING_JUICES.has(line.name)
  )
}

function isCreamy(line: ClassicLine): boolean {
  return has(line.category, 'cat.dairy.milk') && line.name !== 'Beurre'
}

function isZest(line: ClassicLine): boolean {
  return /\bzestes?\b/i.test(line.note ?? '')
}

function isSharp(line: ClassicLine): boolean {
  if (SHARP_JUICES.has(line.name)) return true
  // Pieces or wedges to crush, as in a caipirinha: a slice only flavours.
  return (
    (line.name === 'Citron' || line.name === 'Citron vert') &&
    (line.unit === 'piece' || line.unit === 'wedge') &&
    !isZest(line)
  )
}

function isSweet(line: ClassicLine): boolean {
  return (
    has(line.category, 'cat.sweeteners', 'cat.liqueurs', 'cat.preps.syrups', 'cat.preps.cordials') ||
    line.category === 'prep'
  )
}

/** « Sans alcool » must be certain: every line is known to hold none. */
function isAlcoholFree(lines: readonly ClassicLine[]): boolean {
  return lines.length > 0 && lines.every((line) => line.abv === 0 || has(line.category, 'cat.alcohol_free'))
}

export function familyOf(recipe: Classic): Family | null {
  if (isAlcoholFree(recipe.lines)) return 'non_alcoholic'
  const lines = recipe.lines.filter((line) => !line.isGarnish && !line.isOptional)
  const { glass, method } = recipe
  if (glass === 'glass.shot') return 'shot'
  if ((glass !== null && SHARED_GLASSES.has(glass)) || /\bpunch\b/i.test(recipe.name)) return 'punch'

  const total = lines.reduce((sum, line) => sum + weight(line), 0)
  const part = (test: (line: ClassicLine) => boolean) =>
    lines.filter(test).reduce((sum, line) => sum + weight(line), 0)
  const named = (...names: string[]) => lines.some((line) => names.includes(line.name))
  const long = glass !== null && LONG_GLASSES.has(glass)
  const mixed = method === 'shake' || method === 'dry_shake' || method === 'blend'
  const sharp = lines.some(isSharp)
  const bubbly = lines.filter(isBubbly)

  // Tiki: its glass or tool, or rum, fruit and one of the house ingredients of the genre.
  if (glass === 'glass.tiki' || method === 'swizzle') return 'tiki'
  const rum = part((line) => has(line.category, 'cat.spirits.rum'))
  if (rum > 0 && rum >= part((line) => has(line.category, 'cat.spirits')) / 2 && bubbly.length === 0) {
    const pineapple = named("Jus d'ananas", 'Ananas', "Purée d'ananas")
    const coconut = named('Crème de coco', 'Crème de coco sucrée', 'Lait de coco', 'Sirop piña colada')
    if (pineapple && coconut) return 'tiki'
    if (sharp) {
      const house = named('Falernum', "Sirop d'orgeat", 'Liqueur de piment de la Jamaïque', 'Bitters tiki')
      const passion = named(
        'Purée de fruit de la passion',
        'Sirop de fruit de la passion',
        'Jus de fruit de la passion',
      )
      if (house || pineapple || passion) return 'tiki'
    }
  }

  if (bubbly.length > 0) {
    const water = bubbly.some(
      (line) => isSparklingWine(line) || has(line.category, 'cat.mixers.sparkling_water'),
    )
    const sour = sharp && lines.some(isSweet)
    if (sour && water && (mixed || part(isSharp) >= 25)) return 'fizz'
    // A wine lengthened in a flute or a coupe has no family of the list.
    if (bubbly.every(isSparklingWine) && !long) return null
    return 'highball'
  }

  const egg = lines.some((line) => line.name === "Jaune d'œuf" || line.name === 'Œuf entier')
  if (mixed && (egg || (lines.some(isCreamy) && !sharp && !long))) return 'flip'
  if (named('Jus de tomate', 'Clamato')) return null

  const juice = part(
    (line) => has(line.category, 'cat.juices', 'cat.fruits.puree') && !SHARP_JUICES.has(line.name),
  )
  if (long && juice >= 60) return 'highball'
  if (sharp) return 'sour'
  if (juice > 0) {
    const tart = lines.some((line) => TART_JUICES.has(line.name) && weight(line) > 0)
    return mixed && tart && juice <= total / 2 && !long ? 'sour' : null
  }

  const soft = part(
    (line) =>
      has(line.category, 'cat.dairy', 'cat.coffee_tea', 'cat.fruits', 'cat.wines.still', 'cat.beer_cider') &&
      line.name !== "Blanc d'œuf",
  )
  const strong = part(
    (line) =>
      has(line.category, 'cat.spirits', 'cat.liqueurs', 'cat.bitters', 'cat.wines') &&
      !has(line.category, 'cat.wines.still'),
  )
  // Milk or coffee, even without a measure, is another kind of drink.
  const lengthened = lines.some((line) => isCreamy(line) || has(line.category, 'cat.coffee_tea.coffee'))
  if (soft === 0 && !lengthened && !long && total > 0 && strong >= total * 0.7) return 'spirit_forward'
  if (long && strong > 0 && strong < total) return 'highball'
  return null
}

function list(lines: readonly ClassicLine[]): string {
  return [...new Set(lines.map((line) => line.name))].join(', ')
}

/** The same within a sentence: « Ginger beer et Crème liquide ». */
function listInSentence(lines: readonly ClassicLine[]): string {
  return new Intl.ListFormat('fr', { type: 'conjunction' }).format(new Set(lines.map((line) => line.name)))
}

function isCrushed(line: ClassicLine): boolean {
  if (!PIECES.has(line.unit) || isZest(line)) return false
  if (has(line.category, 'cat.fruits.fresh', 'cat.seasonings.herbs')) return true
  return line.name === 'Gingembre' || line.name.startsWith('Piment jalapeño')
}

function isHot(recipe: Classic, lines: readonly ClassicLine[]): boolean {
  if (recipe.method !== 'build' && recipe.method !== 'stir') return false
  if (recipe.glass === 'glass.toddy') return true
  return lines.some(
    (line) => line.name === 'Café chaud' || /(^|, )(très )?(chaude?|bouillante)($|,)/.test(line.note ?? ''),
  )
}

/** Steps usual for the method, with what the lines, the glass and the garnish add to them. */
export function typicalSteps(recipe: Classic): string[] {
  const { method, glass } = recipe
  if (method === null || method === 'other') return []
  const lines = recipe.lines.filter((line) => !line.isGarnish)
  if (lines.length === 0) return []
  const colon = `${NBSP}:`
  const steps: string[] = []

  const rim = [recipe.garnish ?? '', ...lines.map((line) => line.note ?? '')].some((text) =>
    /givr(er|é|age)/i.test(text),
  )
  const rimStep = () => {
    if (rim) steps.push('Givrer le bord du verre.')
  }
  const garnishStep = () => {
    steps.push(recipe.garnish === null ? 'Servir aussitôt.' : 'Décorer et servir aussitôt.')
  }

  if (recipe.sourceMethod === 'layered' && lines.length > 1) {
    rimStep()
    steps.push(
      `Verser un à un sur le dos d’une cuillère, dans cet ordre${colon} ${list(lines)}.`,
      'Ne pas mélanger.',
    )
    garnishStep()
    return steps
  }

  const hot = isHot(recipe, lines)
  const rinse = lines.filter((line) => /rincer le verre/i.test(line.note ?? ''))
  const floated = lines.filter((line) => /en surface/i.test(line.note ?? ''))
  const topped = lines.filter((line) => !floated.includes(line) && (line.unit === 'top' || isBubbly(line)))
  const body = lines.filter(
    (line) => !rinse.includes(line) && !floated.includes(line) && !topped.includes(line),
  )
  const apart = lines.filter((line) => !body.includes(line))
  const what =
    apart.length > 0 ? `tous les ingrédients, sauf ${listInSentence(apart)},` : 'tous les ingrédients'

  const iced = !hot && glass !== null && ICED_GLASSES.has(glass)
  const shared = glass !== null && SHARED_GLASSES.has(glass)
  const muddles =
    !hot &&
    !shared &&
    body.some(isCrushed) &&
    (method === 'shake' || method === 'dry_shake' || method === 'build')

  rimStep()
  if (hot) steps.push('Préchauffer le verre à l’eau chaude, puis le vider.')
  else if (glass !== null && !iced) steps.push('Rafraîchir le verre.')
  if (rinse.length > 0) steps.push(`Rincer le verre puis le vider${colon} ${list(rinse)}.`)

  if (muddles) {
    const where = method === 'build' ? 'au fond du verre' : 'au fond du shaker'
    steps.push(`Écraser doucement au pilon, ${where}${colon} ${list(body.filter(isCrushed))}.`)
  }

  if (body.length > 0) {
    switch (method) {
      case 'shake':
      case 'dry_shake': {
        steps.push(`Verser ${what} dans le shaker.`)
        const foam = body.some((line) => has(line.category, 'cat.dairy.eggs', 'cat.dairy.emulsifiers'))
        if (foam || method === 'dry_shake') {
          steps.push('Frapper une première fois sans glace pour monter la mousse.')
        }
        steps.push('Ajouter des glaçons et frapper énergiquement, jusqu’à ce que le shaker soit givré.')
        const strain = muddles ? 'Filtrer deux fois' : 'Filtrer'
        steps.push(iced ? `${strain} dans le verre rempli de glaçons neufs.` : `${strain} dans le verre.`)
        break
      }
      case 'stir':
        if (hot) {
          steps.push(`Verser ${what} dans le verre et mélanger.`)
        } else {
          steps.push(
            `Verser ${what} dans un verre à mélange rempli de glaçons.`,
            'Mélanger à la cuillère jusqu’à ce que le tout soit bien froid.',
            iced ? 'Filtrer dans le verre rempli de glaçons neufs.' : 'Filtrer dans le verre.',
          )
        }
        break
      case 'throw':
        steps.push(
          `Verser ${what} dans un shaker avec des glaçons.`,
          'Lancer le mélange d’une timbale à l’autre, en retenant la glace.',
          'Filtrer dans le verre.',
        )
        break
      case 'blend':
        steps.push(
          `Mixer ${what} au blender avec de la glace pilée, jusqu’à une texture lisse.`,
          'Verser dans le verre.',
        )
        break
      case 'swizzle':
        steps.push(
          `Verser ${what} dans le verre rempli de glace pilée.`,
          'Mélanger au swizzle stick jusqu’à ce que le verre givre.',
        )
        break
      case 'build':
        if (shared) {
          steps.push(`Verser ${what} dans le récipient, ajouter des glaçons et mélanger.`)
        } else if (hot) {
          steps.push(`Verser ${what} dans le verre et mélanger.`)
        } else if (iced) {
          steps.push(`Verser ${what} dans le verre, remplir de glaçons et mélanger à la cuillère.`)
        } else {
          steps.push(`Verser bien frais dans le verre ${what.replace(/,$/, '')}.`)
        }
        break
    }
  } else if (iced) {
    steps.push('Remplir le verre de glaçons.')
  }

  if (topped.length > 0) {
    steps.push(
      body.length > 0
        ? `Compléter avec${colon} ${list(topped)}.`
        : `Verser doucement, bien frais${colon} ${list(topped)}.`,
    )
  }
  if (floated.length > 0) steps.push(`Déposer en surface${colon} ${list(floated)}.`)
  garnishStep()
  return steps
}
