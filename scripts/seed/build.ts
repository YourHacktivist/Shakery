/**
 * Last step of the seed pipeline: merges the reviewed sources into data/seed/ingredients.json.
 *
 * - Wikidata candidates kept by review/decisions.json (source wikidata, QID in external_ref);
 * - hand-written ingredients of hand-ingredients.json (source seed);
 * - sugar and acid from review/ciqual-values.json (composition_source ciqual);
 * - water, sugars and honey from hand-compositions.json, with their density (D-031);
 * then data/seed/recipes.json: the classic preparations of preps.json, then the IBA cocktails
 * (review/iba-raw.json read through iba-map.json, French texts of iba-fr.json).
 *
 * Fails on an unknown category, a duplicate normalised name in a category, an alias that is
 * the name of another ingredient, a decision that matches no candidate, or `needs_review`.
 *
 * Usage: npx tsx scripts/seed/build.ts
 */
import path from 'node:path'
import { normalizeName } from '../../src/core/normalize'
import type { CiqualValue } from './ciqual'
import type { IbaCocktail } from './iba'
import { DATA_DIR, readJson, REVIEW_DIR, SEED_DIR, slugify, writeJson } from './lib'
import { buildRecipes, type IbaFrench, type IbaMap, type RecipeSeed, type SeedUnit } from './recipes'
import type { Candidate } from './wikidata'

type Decision = string | { category: string; name: string }

type Decisions = {
  autoAccept: string[]
  keepAbv: string[]
  reject: string[]
  accept: Record<string, Decision>
}

type HandComposition = {
  ciqual: string
  sugar_g_per_100g: number
  density_g_per_ml: number
  confidence: 'sourced' | 'estimated'
}

type HandIngredient = {
  name: string
  category: string
  aliases: string[]
  is_staple?: boolean
  allergens?: string[]
  external_ref?: string
}

export type IngredientSeed = {
  seed_key: string
  name: string
  category: string
  aliases: string[]
  default_abv: number | null
  sugar_g_per_l: number | null
  acid_g_per_l: number | null
  composition_source: 'ciqual' | null
  composition_confidence: 'sourced' | 'estimated' | null
  density_g_per_ml: number | null
  allergens: string[]
  is_staple: boolean
  source: 'wikidata' | 'seed'
  external_ref: string | null
}

async function main(): Promise<void> {
  const categories = await readJson<{ seed_key: string; parent: string | null }[]>(
    path.join(DATA_DIR, 'categories.json'),
  )
  const parents = new Set(categories.map((c) => c.parent).filter((p): p is string => p !== null))
  const leaves = new Set(categories.map((c) => c.seed_key).filter((key) => !parents.has(key)))

  const candidates = await readJson<Candidate[]>(path.join(REVIEW_DIR, 'wikidata-candidates.json'))
  const decisions = await readJson<Decisions>(path.join(REVIEW_DIR, 'decisions.json'))
  const { ingredients: hand } = await readJson<{ ingredients: HandIngredient[] }>(
    path.join(SEED_DIR, 'hand-ingredients.json'),
  )
  const ciqual = await readJson<Record<string, CiqualValue>>(path.join(REVIEW_DIR, 'ciqual-values.json'))

  const out: IngredientSeed[] = []
  const used = new Set<string>()
  for (const candidate of candidates) {
    const decision = decisions.accept[candidate.name]
    const auto = decisions.autoAccept.includes(candidate.root) && !decisions.reject.includes(candidate.name)
    if (decision === undefined && !auto) continue
    // Two Wikidata items may share a French label: the first one is kept.
    if (used.has(candidate.name)) continue
    used.add(candidate.name)
    const category = typeof decision === 'object' ? decision.category : (decision ?? candidate.category)
    const name = typeof decision === 'object' ? decision.name : candidate.name
    out.push({
      seed_key: `ing.${candidate.qid.toLowerCase()}`,
      name,
      category,
      aliases: candidate.aliases,
      default_abv: decisions.keepAbv.includes(candidate.name) ? candidate.abv : null,
      sugar_g_per_l: null,
      acid_g_per_l: null,
      composition_source: null,
      composition_confidence: null,
      density_g_per_ml: null,
      allergens: [],
      is_staple: false,
      source: 'wikidata',
      external_ref: candidate.qid,
    })
  }
  const unmatched = Object.keys(decisions.accept).filter((name) => !used.has(name))
  if (unmatched.length > 0) throw new Error(`Decisions without candidate: ${unmatched.join(', ')}`)

  for (const item of hand) {
    out.push({
      seed_key: `ing.${slugify(item.name)}`,
      name: item.name,
      category: item.category,
      aliases: item.aliases,
      default_abv: null,
      sugar_g_per_l: null,
      acid_g_per_l: null,
      composition_source: null,
      composition_confidence: null,
      density_g_per_ml: null,
      allergens: item.allergens ?? [],
      is_staple: item.is_staple ?? false,
      source: 'seed',
      external_ref: item.external_ref ?? null,
    })
  }

  for (const [name, value] of Object.entries(ciqual)) {
    const target = out.find((ingredient) => ingredient.name === name)
    if (!target) throw new Error(`Ciqual value for an unknown ingredient: ${name}`)
    target.sugar_g_per_l = value.sugar_g_per_l
    target.acid_g_per_l = value.acid_g_per_l
    if (value.sugar_g_per_l !== null || value.acid_g_per_l !== null) {
      target.composition_source = 'ciqual'
      target.composition_confidence = 'sourced'
    }
  }

  const { values: compositions } = await readJson<{ values: Record<string, HandComposition> }>(
    path.join(SEED_DIR, 'hand-compositions.json'),
  )
  for (const [name, value] of Object.entries(compositions)) {
    const target = out.find((ingredient) => ingredient.name === name)
    if (!target) throw new Error(`Hand composition for an unknown ingredient: ${name}`)
    if (target.composition_source !== null) throw new Error(`${name} already has a composition`)
    target.default_abv = 0
    target.sugar_g_per_l = Math.round(value.sugar_g_per_100g * 10 * value.density_g_per_ml * 10) / 10
    target.acid_g_per_l = 0
    target.composition_source = 'ciqual'
    target.composition_confidence = value.confidence
    target.density_g_per_ml = value.density_g_per_ml
  }

  // Checks of section 9: leaf categories, unique names per category, aliases that do not
  // collide with another ingredient's name, stable unique keys.
  const names = new Map<string, string>()
  const keys = new Set<string>()
  for (const ingredient of out) {
    if (!leaves.has(ingredient.category))
      throw new Error(`${ingredient.name}: ${ingredient.category} is not a leaf`)
    const key = `${ingredient.category}|${normalizeName(ingredient.name)}`
    if (names.has(key)) throw new Error(`Duplicate name in ${ingredient.category}: ${ingredient.name}`)
    names.set(key, ingredient.seed_key)
    if (keys.has(ingredient.seed_key)) throw new Error(`Duplicate seed_key ${ingredient.seed_key}`)
    keys.add(ingredient.seed_key)
  }
  // An alias shared by two ingredients would make the matching ambiguous: it is dropped.
  const allNames = new Set(out.map((ingredient) => normalizeName(ingredient.name)))
  const aliasCount = new Map<string, number>()
  for (const ingredient of out) {
    for (const alias of new Set(ingredient.aliases.map(normalizeName))) {
      aliasCount.set(alias, (aliasCount.get(alias) ?? 0) + 1)
    }
  }
  for (const ingredient of out) {
    const seen = new Set<string>()
    ingredient.aliases = ingredient.aliases.filter((alias) => {
      const normalized = normalizeName(alias)
      const keep =
        !seen.has(normalized) &&
        normalized !== normalizeName(ingredient.name) &&
        !allNames.has(normalized) &&
        aliasCount.get(normalized) === 1
      seen.add(normalized)
      return keep
    })
  }

  out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'fr'))
  await writeJson(path.join(DATA_DIR, 'ingredients.json'), out)
  console.log(
    `${out.length} ingredients written, ${out.filter((i) => i.composition_source).length} with Ciqual values`,
  )

  // Recipes: preparations first, each one becoming an ingredient the next ones can use.
  const byName = new Map(out.map((ingredient) => [normalizeName(ingredient.name), ingredient.seed_key]))
  const { preps } = await readJson<{ preps: PrepEntry[] }>(path.join(SEED_DIR, 'preps.json'))
  const recipes: RecipeSeed[] = []
  for (const prep of preps) {
    if (!leaves.has(prep.category)) throw new Error(`${prep.name}: ${prep.category} is not a leaf`)
    const ingredientKey = `ing.prep.${slugify(prep.name)}`
    recipes.push({
      seed_key: `prep.${slugify(prep.name)}`,
      name: prep.name,
      kind: 'prep',
      source: 'seed',
      family: null,
      method: null,
      glass: null,
      ice: null,
      garnish: null,
      steps: prep.steps,
      notes: prep.notes ?? null,
      credit: null,
      yield_ml: null,
      ingredient_key: ingredientKey,
      category: prep.category,
      lines: prep.lines.map((line) => {
        const key = byName.get(normalizeName(line.ingredient))
        if (!key) throw new Error(`${prep.name}: unknown ingredient ${line.ingredient}`)
        return {
          ingredient: key,
          quantity: line.quantity,
          unit: line.unit,
          is_optional: line.optional ?? false,
          is_garnish: false,
          note: line.note ?? null,
        }
      }),
    })
    byName.set(normalizeName(prep.name), ingredientKey)
  }

  const raw = await readJson<IbaCocktail[]>(path.join(REVIEW_DIR, 'iba-raw.json'))
  const map = await readJson<IbaMap>(path.join(SEED_DIR, 'iba-map.json'))
  const french = await readJson<Record<string, IbaFrench>>(path.join(SEED_DIR, 'iba-fr.json'))
  const iba = buildRecipes(raw, map, french, byName)
  if (iba.unknownLines.length > 0 || iba.missingFrench.length > 0) {
    throw new Error(
      `IBA lines to read by hand:\n${iba.unknownLines.join('\n')}\nWithout French text: ${iba.missingFrench.join(', ')}`,
    )
  }
  const empty = iba.recipes.filter((recipe) => recipe.lines.length === 0).map((recipe) => recipe.name)
  if (empty.length > 0) throw new Error(`IBA recipes without lines: ${empty.join(', ')}`)
  recipes.push(...iba.recipes.sort((a, b) => a.name.localeCompare(b.name, 'fr')))
  await writeJson(path.join(DATA_DIR, 'recipes.json'), recipes)
  console.log(`${preps.length} preparations and ${iba.recipes.length} IBA cocktails written`)
}

type PrepEntry = {
  name: string
  category: string
  steps: string[]
  notes?: string
  lines: { ingredient: string; quantity: number | null; unit: SeedUnit; note?: string; optional?: boolean }[]
}

void main()
