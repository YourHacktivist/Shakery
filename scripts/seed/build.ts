/**
 * Last step of the seed pipeline: merges the reviewed sources into data/seed/ingredients.json.
 *
 * - Wikidata candidates kept by review/decisions.json (source wikidata, QID in external_ref);
 * - hand-written ingredients of hand-ingredients.json (source seed);
 * - sugar and acid from review/ciqual-values.json (composition_source ciqual);
 * - water, sugars and honey from hand-compositions.json, with their density (D-031);
 * - reference degrees of abv.json, each with its source (D-039);
 * - allergens of allergens.json and flavour profile of profiles.ts (D-040);
 * then data/seed/recipes.json: the classic preparations of preps.json, then the IBA cocktails
 * (review/iba-raw.json read through iba-map.json, French texts of iba-fr.json);
 * then resources/seed/classics.json, read by the application at start-up: the extra classics (D-036, cached export read
 * through classics-map.json, garnishes of classics-garnish-fr.json, new ingredients of classics-ingredients.json),
 * one compact recipe per line, with the family and the standard steps of classics.ts (D-039).
 *
 * Fails on an unknown category, a duplicate normalised name in a category, an alias that is
 * the name of another ingredient, a decision that matches no candidate, or `needs_review`.
 *
 * Usage: npx tsx scripts/seed/build.ts
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Method } from '../../src/core/model'
import { normalizeName } from '../../src/core/normalize'
import { TYPICAL_STEPS_CREDIT } from '../../src/shared/classics'
import type { CiqualValue } from './ciqual'
import {
  computeRecipe,
  convert,
  type CompositionEntry,
  type CompositionTable,
  type Facts,
} from './compositions'
import { familyOf, typicalSteps, type Classic } from './classics'
import { buildExtraClassics, EXPORT_CACHE, type ClassicsMap, readExport, slugOf } from './extra-classics'
import type { IbaCocktail } from './iba'
import { CACHE_DIR, DATA_DIR, readJson, REVIEW_DIR, SEED_DIR, slugify, writeJson } from './lib'
import { flavorTagsOf } from './profiles'
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

/** abv.json: ingredients without alcohol by nature, then degrees grouped by their source. */
type AbvTable = {
  noAlcohol: { categories: string[]; ingredients: string[]; except: string[] }
  sources: Array<{ id: string; title: string; url: string; values: Record<string, number> }>
}

/** allergens.json: by category, then by name. */
type AllergenTable = { categories: Record<string, string[]>; ingredients: Record<string, string[]> }

export type IngredientSeed = {
  seed_key: string
  name: string
  category: string
  aliases: string[]
  default_abv: number | null
  sugar_g_per_l: number | null
  acid_g_per_l: number | null
  composition_source: CompositionEntry['source'] | null
  composition_confidence: 'sourced' | 'estimated' | null
  density_g_per_ml: number | null
  allergens: string[]
  flavor_tags?: string[]
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

  // Ingredients created for the labels of the extra classics (D-036) follow the same rules.
  const { ingredients: extra24 } = await readJson<{ ingredients: HandIngredient[] }>(
    path.join(SEED_DIR, 'classics-ingredients.json'),
  )
  for (const item of [...hand, ...extra24]) {
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

  addReferenceDegrees(out, await readJson<AbvTable>(path.join(SEED_DIR, 'abv.json')))

  // Ciqual gives grams per 100 g, kept ×10 in ciqual-values.json: the density of the drink,
  // computed from its sugar, acid and degree, turns them into grams per litre (D-061).
  for (const [name, value] of Object.entries(ciqual)) {
    const target = out.find((ingredient) => ingredient.name === name)
    if (!target) throw new Error(`Ciqual value for an unknown ingredient: ${name}`)
    if (value.sugar_g_per_l === null && value.acid_g_per_l === null) continue
    const converted = convert(
      {
        sugar: value.sugar_g_per_l === null ? null : { value: value.sugar_g_per_l / 10, unit: 'g/100g' },
        acid:
          value.acid_g_per_l === null
            ? null
            : { value: value.acid_g_per_l / 10, unit: 'g/100g', as: 'organic_acids_total' },
        density_g_per_ml: null,
      },
      target.default_abv ?? 0,
    )
    target.sugar_g_per_l = converted.sugar
    target.acid_g_per_l = converted.acid
    target.composition_source = 'ciqual'
    target.composition_confidence = 'sourced'
  }

  const { preps } = await readJson<{ preps: PrepEntry[] }>(path.join(SEED_DIR, 'preps.json'))
  addCompositions(out, await readJson<CompositionTable>(path.join(SEED_DIR, 'compositions.json')), preps)

  addAllergens(out, await readJson<AllergenTable>(path.join(SEED_DIR, 'allergens.json')))
  for (const ingredient of out) {
    const tags = flavorTagsOf(ingredient.name, ingredient.category)
    if (tags.length > 0) ingredient.flavor_tags = tags
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
    `${out.length} ingredients written, ${out.filter((i) => i.sugar_g_per_l !== null && i.acid_g_per_l !== null).length} with sugar and acid`,
  )

  // Recipes: preparations first, each one becoming an ingredient the next ones can use.
  const byName = new Map(out.map((ingredient) => [normalizeName(ingredient.name), ingredient.seed_key]))
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

  const rawClassics = readExport(await readFile(path.join(CACHE_DIR, EXPORT_CACHE), 'utf8'))
  const classicsMap = await readJson<ClassicsMap>(path.join(SEED_DIR, 'classics-map.json'))
  const classicsGarnish = await readJson<Record<string, string>>(
    path.join(SEED_DIR, 'classics-garnish-fr.json'),
  )
  const reserved = new Set(recipes.map((recipe) => normalizeName(recipe.name)))
  const extra = buildExtraClassics(rawClassics, classicsMap, classicsGarnish, byName, reserved)
  if (extra.problems.length > 0) {
    throw new Error(
      `Extra classics: ${extra.problems.length} problems\n${extra.problems.slice(0, 80).join('\n')}`,
    )
  }
  describeClassics(
    extra.recipes,
    new Map(rawClassics.map((item) => [`classic.${slugOf(item.url)}`, item.method] as const)),
    out,
    recipes,
  )
  // Compact, one recipe per line: about 7 000 entries stay readable in a diff.
  const sortedClassics = extra.recipes.sort((a, b) => a.seed_key.localeCompare(b.seed_key))
  await writeFile(
    path.resolve(DATA_DIR, '..', '..', 'resources', 'seed', 'classics.json'),
    `[\n${sortedClassics.map((recipe) => JSON.stringify(recipe)).join(',\n')}\n]\n`,
    'utf8',
  )
  console.log(
    `${sortedClassics.length} extra classics written, ${extra.skipped.length} left out as IBA names: ${extra.skipped.join(', ')}`,
  )
}

type PrepEntry = {
  name: string
  category: string
  steps: string[]
  notes?: string
  lines: { ingredient: string; quantity: number | null; unit: SeedUnit; note?: string; optional?: boolean }[]
}

void main()

/** Fills the missing degrees only: a value already read from Wikidata or by hand stays. */
function addReferenceDegrees(ingredients: IngredientSeed[], table: AbvTable): void {
  const { categories, ingredients: named, except } = table.noAlcohol
  for (const ingredient of ingredients) {
    if (ingredient.default_abv !== null || except.includes(ingredient.name)) continue
    if (categories.includes(ingredient.category) || named.includes(ingredient.name))
      ingredient.default_abv = 0
  }
  const byName = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient] as const))
  for (const source of table.sources) {
    for (const [name, abv] of Object.entries(source.values)) {
      const target = byName.get(name)
      if (!target) throw new Error(`${source.id}: degree of an unknown ingredient ${name}`)
      if (target.default_abv !== null) throw new Error(`${source.id}: ${name} already has a degree`)
      target.default_abv = abv
    }
  }
}

/**
 * Sugar and acid of compositions.json (D-061), after the degrees: a value per 100 g needs the
 * degree for its density. A homemade preparation is computed from its standard recipe once
 * every ingredient of that recipe has its own values; a preparation of preps.json can serve.
 */
function addCompositions(
  ingredients: IngredientSeed[],
  table: CompositionTable,
  preps: readonly PrepEntry[],
): void {
  const byName = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient] as const))
  const pending = new Map<string, CompositionEntry>()
  for (const [name, entry] of Object.entries(table.values)) {
    const target = byName.get(name)
    if (!target) throw new Error(`compositions.json: unknown ingredient ${name}`)
    if (entry.refs.length === 0) throw new Error(`compositions.json: ${name} has no source`)
    if (entry.recipe !== null) {
      if (entry.sugar !== null || entry.acid !== null || entry.source !== 'computed')
        throw new Error(`compositions.json: ${name} has a recipe and values`)
      pending.set(name, entry)
      continue
    }
    if (entry.sugar === null && entry.acid === null)
      throw new Error(`compositions.json: ${name} has no value`)
    const converted = convert(entry, target.default_abv ?? 0)
    target.sugar_g_per_l = converted.sugar
    target.acid_g_per_l = converted.acid
    target.composition_source = entry.source
    target.composition_confidence = entry.confidence
    if (entry.density_g_per_ml !== null) target.density_g_per_ml = entry.density_g_per_ml
  }

  const prepFacts = new Map<string, Facts>()
  const facts = (name: string): Facts | undefined => {
    const ingredient = byName.get(name)
    if (ingredient) {
      return {
        sugar: ingredient.sugar_g_per_l,
        acid: ingredient.acid_g_per_l,
        density: ingredient.density_g_per_ml,
      }
    }
    const prep = preps.find((candidate) => candidate.name === name)
    if (!prep) return undefined
    const known = prepFacts.get(name)
    if (known) return known
    const parts = prep.lines.flatMap((line) =>
      !line.optional && line.quantity !== null && (line.unit === 'g' || line.unit === 'ml')
        ? [{ ingredient: line.ingredient, quantity: line.quantity, unit: line.unit }]
        : [],
    )
    const computed = computeRecipe(parts, facts)
    prepFacts.set(name, computed)
    return computed
  }
  while (pending.size > 0) {
    const ready = [...pending].filter(([, entry]) =>
      entry.recipe?.every((part) => !pending.has(part.ingredient)),
    )
    if (ready.length === 0)
      throw new Error(`compositions.json: recipes that need each other: ${[...pending.keys()].join(', ')}`)
    for (const [name, entry] of ready) {
      const target = byName.get(name)
      if (!target || !entry.recipe) continue
      const computed = computeRecipe(entry.recipe, facts)
      target.sugar_g_per_l = computed.sugar
      target.acid_g_per_l = computed.acid
      target.composition_source = 'computed'
      target.composition_confidence = entry.confidence
      pending.delete(name)
    }
  }
}

/** Union with what the hand-written lists already declare. */
function addAllergens(ingredients: IngredientSeed[], table: AllergenTable): void {
  for (const name of Object.keys(table.ingredients)) {
    if (!ingredients.some((ingredient) => ingredient.name === name)) {
      throw new Error(`allergens.json: unknown ingredient ${name}`)
    }
  }
  for (const category of Object.keys(table.categories)) {
    if (!ingredients.some((ingredient) => ingredient.category === category)) {
      throw new Error(`allergens.json: unknown category ${category}`)
    }
  }
  for (const ingredient of ingredients) {
    const added = [
      ...(table.categories[ingredient.category] ?? []),
      ...(table.ingredients[ingredient.name] ?? []),
    ]
    if (added.length > 0) ingredient.allergens = [...new Set([...ingredient.allergens, ...added])].sort()
  }
}

/** Family and standard steps of the classics whose source gives none. */
function describeClassics(
  classics: RecipeSeed[],
  sourceMethods: ReadonlyMap<string, string>,
  ingredients: readonly IngredientSeed[],
  bundled: readonly RecipeSeed[],
): void {
  const facts = new Map(
    ingredients.map((item) => [
      item.seed_key,
      { name: item.name, category: item.category, abv: item.default_abv },
    ]),
  )
  for (const prep of bundled) {
    if (prep.kind !== 'prep' || prep.ingredient_key === null || prep.category === null) continue
    // Only « none at all » matters to the rules: the exact degree of a preparation is computed.
    const free = prep.lines.every((line) => facts.get(line.ingredient)?.abv === 0)
    facts.set(prep.ingredient_key, { name: prep.name, category: prep.category, abv: free ? 0 : null })
  }
  for (const recipe of classics) {
    const classic: Classic = {
      name: recipe.name,
      method: recipe.method as Method | null,
      sourceMethod: sourceMethods.get(recipe.seed_key),
      glass: recipe.glass,
      garnish: recipe.garnish,
      lines: recipe.lines.map((line) => {
        const fact = facts.get(line.ingredient)
        if (!fact) throw new Error(`${recipe.seed_key}: unknown ingredient ${line.ingredient}`)
        return {
          ...fact,
          quantity: line.quantity,
          unit: line.unit,
          note: line.note,
          isGarnish: line.is_garnish,
          isOptional: line.is_optional,
        }
      }),
    }
    recipe.family = familyOf(classic)
    recipe.steps = typicalSteps(classic)
    if (recipe.steps.length > 0) recipe.credit = TYPICAL_STEPS_CREDIT
  }
}
