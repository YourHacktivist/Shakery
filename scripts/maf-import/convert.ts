/**
 * Converts the MAF notebooks (imports/maf/*.json, personal data kept out of the repository)
 * into a .shakery archive, imported from the settings like any other archive (D-004, D-018).
 * Development tool, not shipped with the application.
 *
 * Mapping: docs/proposals/2026-11-17-modele-donnees-maf.md (section 2) and docs/maf-mapping.md.
 * The notebook is built in a temporary database through the repositories, then exported; the
 * archive is checked by importing it into a fresh notebook before being written.
 *
 * Identifiers are deterministic (fixed edition date, SHA-256 stream): converting the same
 * files again gives the same archive, so a second import finds the same rows.
 *
 * Usage: npx tsx scripts/maf-import/convert.ts [input folder] [output file]
 */
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { normalizeName } from '../../src/core/normalize'
import { createUuidV7Generator } from '../../src/core/uuid'
import { createDb, type Db, type Ids } from '../../src/main/db/client'
import { openDatabase } from '../../src/main/db/connection'
import { runMigrations } from '../../src/main/db/migrate'
import { IngredientRepository } from '../../src/main/db/repositories/ingredients'
import { ProductRepository } from '../../src/main/db/repositories/products'
import { RecipeRepository } from '../../src/main/db/repositories/recipes'
import { BUNDLED_SEED } from '../../src/main/seed/bundled'
import { loadSeedData } from '../../src/main/seed/load'
import { readArchive, writeArchive } from '../../src/main/services/archive'
import {
  applyImport,
  IMPORT_TABLE_NAMES,
  previewImport,
  validateImportData,
} from '../../src/main/services/import'
import { ingredientInputSchema, productInputSchema, recipeInputSchema } from '../../src/shared/domain/catalog'
import { parseDateLabel } from './dates'
import {
  COCKTAIL_GLASSES,
  FAMILIES,
  LINE_NAMES,
  METHODS,
  REFERENCE_CATEGORIES,
  SHEET_CATEGORIES,
  SHEET_GLASSES,
  type ReferenceCategory,
} from './mapping'

/** Run from the repository root. */
const ROOT = process.cwd()
const INPUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'imports/maf'))
const OUTPUT = path.resolve(process.argv[3] ?? path.join(INPUT, 'maf-2025.shakery'))
const MIGRATIONS = path.join(ROOT, 'resources/migrations')
/** Edition date of the archive: every row carries it, every identifier starts with it. */
const EDITION_MS = Date.UTC(2026, 10, 17)
const SOCLE_CREDIT = 'Socle des cocktails de référence, édition 2025'

// ---------------------------------------------------------------------------------------
// Source files (shapes of the notebooks, see README_cocktails.md and README_products.md)
// ---------------------------------------------------------------------------------------

type Line = {
  name: string
  card_label: string | null
  raw_dose: string | null
  quantity: number | null
  unit: string
  reference_product: string | null
  abv_pct: number | null
  counted_in_abv: boolean
  cost_ht_cents: number | null
  note: string | null
}
type Dated = { date_label: string; text: string; review_note?: string; review_resolution?: string }
type Cocktail = {
  number: number
  name: string
  name_socle: string
  needs_review: boolean
  profile: string | null
  size: 'short' | 'long' | null
  moment: 'before_dinner' | 'all_day' | 'after_dinner' | null
  family_label: string
  family_short: string
  method_label: string
  glass: string
  garnish: string | null
  garnish_cost_ht_cents: number | null
  ingredients: Line[]
  total_counted_volume_ml: number
  total_volume_x_abv: number
  abv: { computed_pct: number; socle_pct: number; explanation: string | null }
  cost: {
    material_ht_cents: number
    sale_ttc_coef5_cents: number
    menu_price_cents: number
    cost_ratio_pct: number
  }
  technique_points: string | null
  jury_questions: { question: string; answer: string; source: string }[]
  history_text: string | null
  history_timeline: Dated[]
  history_quick: { date_label: string; who: string | null; where: string | null; text: string } | null
  variants: { name: string; description: string }[]
  variants_text: string | null
  products_notes: string | null
  products_card: string[]
  iba_spec: string | null
  iba_note: string | null
  socle_steps: string[]
  pro_tips: string[]
  key_takeaway: string | null
  sources: number[]
}
type ReferenceProduct = {
  category: string
  reference: string
  abv_pct: number | null
  volume_ml: number | null
  price_ht_cents: number | null
  note: string | null
}
type Source = { number: number; text: string }
type CocktailSources = {
  referential: string
  sources_intro: string
  sources: Source[]
  limits: string
  synthesis: {
    title: string
    note: string[]
    rows: {
      number: number
      cocktail: string
      socle_pct: number
      computed_pct: number
      explanation: string | null
    }[]
  }
  method_notes: { title: string; paragraphs: string[] }[]
}
type Reviewed = { review_note?: string; review_resolution?: string }
type ProductSheet = {
  number: number
  name: string
  subtitle: string | null
  family: string | null
  footer_category: string | null
  class_label: string | null
  min_abv_label: string | null
  min_abv_pct: number | null
  origin: string | null
  center_label: string | null
  glass_label: string | null
  header_badges: string[]
  section_titles: Record<string, string | null>
  sections: {
    fabrication: string[]
    history_timeline: Dated[]
    regulation: string[]
    types_styles: { label: string; text: string }[]
    tasting: { eye: string; nose: string; mouth: string } | null
    service: string[]
    cocktails: {
      in_socle: string | null
      other_classics: string | null
      extra: { label: string; text: string }[]
    }
    jury_questions: { question: string; answer: string }[]
    brands: ({ group: string; names: string[] } & Reviewed)[]
    other_blocks: { title: string; items: string[] }[]
  }
  key_takeaway: string | null
  sources: number[]
}
type BrandDirectory = {
  legend: string
  pages: { code: string; title: string; page: number; fiches: number[] }[]
  by_product: {
    fiche: number
    directory_title: string
    page_code: string
    page: number
    brands: ({
      name: string
      origin: string | null
      owner: string | null
      details_raw: string | null
      note: string | null
      in_socle: boolean
    } & Reviewed)[]
  }[]
  owner_groups: {
    title: string
    subtitle: string | null
    jury_note?: string | null
    groups: { name: string; country: string | null; brands: string[] }[]
  }
}
type SummaryTable = {
  title: string
  description: string | null
  columns: string[]
  rows: (string | null)[][]
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(INPUT, file), 'utf8')) as T
}

function fail(message: string): never {
  throw new Error(message)
}

/** Any `needs_review: true` left in a file blocks the conversion. */
function assertReviewed(value: unknown, where: string): void {
  if (Array.isArray(value))
    value.forEach((v, i) => {
      assertReviewed(v, `${where}[${i}]`)
    })
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'needs_review' && child === true) fail(`Unreviewed value at ${where}`)
      assertReviewed(child, `${where}.${key}`)
    }
  }
}

// ---------------------------------------------------------------------------------------
// Temporary notebook
// ---------------------------------------------------------------------------------------

function deterministicIds(): Ids {
  let counter = 0
  const fill = (bytes: Uint8Array): Uint8Array => {
    const digest = createHash('sha256').update(`maf-2025/${counter}`).digest()
    counter += 1
    bytes.set(digest.subarray(0, bytes.length))
    return bytes
  }
  return { now: () => EDITION_MS, newId: createUuidV7Generator(() => EDITION_MS, fill) }
}

function freshNotebook(ids: Ids): Db {
  const sqlite = openDatabase(':memory:')
  runMigrations(sqlite, MIGRATIONS)
  const db = createDb(sqlite)
  loadSeedData(db, ids, BUNDLED_SEED)
  return db
}

type Value = string | number | boolean | null | undefined | readonly unknown[]

class Writer {
  constructor(
    readonly db: Db,
    readonly ids: Ids,
  ) {}

  insert(table: string, row: Record<string, Value>): string {
    const id = this.ids.newId()
    const now = this.ids.now()
    const full: Record<string, string | number | null> = { id, created_at: now, updated_at: now }
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined) continue
      full[key] =
        typeof value === 'boolean'
          ? value
            ? 1
            : 0
          : Array.isArray(value)
            ? JSON.stringify(value)
            : (value as string | number | null)
    }
    const columns = Object.keys(full)
    this.db.$client
      .prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => `@${c}`).join(', ')})`,
      )
      .run(full)
    return id
  }

  seedId(table: 'categories' | 'glasses' | 'ice_types', key: string): string {
    const row = this.db.$client.prepare(`SELECT id FROM ${table} WHERE seed_key = ?`).get(key) as
      { id: string } | undefined
    return row?.id ?? fail(`Unknown seed key ${key}`)
  }
}

/** Sections and items of a sheet, in printed order. */
class SheetBuilder {
  private sectionOrder = 0

  constructor(
    private readonly w: Writer,
    readonly sheetId: string,
  ) {}

  section(key: string, title: string | null, extra: Record<string, Value> = {}): SectionBuilder {
    const id = this.w.insert('knowledge_sections', {
      sheet_id: this.sheetId,
      key,
      title,
      sort_order: this.sectionOrder++,
      ...extra,
    })
    return new SectionBuilder(this.w, id)
  }
}

class SectionBuilder {
  private itemOrder = 0

  constructor(
    private readonly w: Writer,
    readonly id: string,
  ) {}

  item(kind: string, fields: Record<string, Value>): string {
    return this.w.insert('knowledge_items', {
      section_id: this.id,
      kind,
      sort_order: this.itemOrder++,
      ...fields,
    })
  }

  text(body: string | null, extra: Record<string, Value> = {}): void {
    if (body && body.trim()) this.item('text', { body, ...extra })
  }

  bullets(values: readonly string[], extra: Record<string, Value> = {}): void {
    for (const body of values) if (body.trim()) this.item('bullet', { body, ...extra })
  }

  event(entry: Dated, originDoc: string | null): void {
    const date = parseDateLabel(entry.date_label)
    this.item('event', {
      label: entry.date_label,
      body: entry.text,
      date_kind: date.dateKind,
      year_from: date.yearFrom,
      year_to: date.yearTo,
      origin_doc: originDoc,
      review_note: entry.review_note ?? null,
      review_resolution: entry.review_resolution ?? null,
    })
  }
}

// ---------------------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------------------

const key = (value: string) => normalizeName(value)

function mapped<T>(table: Readonly<Record<string, T>>, label: string, what: string): T {
  const found = Object.entries(table).find(([k]) => key(k) === key(label))
  return found ? found[1] : fail(`No ${what} for « ${label} »`)
}

function citationNumbers(cell: string | null): number[] {
  return [...(cell ?? '').matchAll(/\d+/g)].map((m) => Number(m[0]))
}

async function convert(): Promise<void> {
  const cocktails = await json<Cocktail[]>('cocktails.json')
  const reference = await json<{ source: string; intro: string[]; products: ReferenceProduct[] }>(
    'reference_products.json',
  )
  const cocktailSources = await json<CocktailSources>('cocktail_sources.json')
  const sheets = await json<ProductSheet[]>('products.json')
  const productSources = await json<Source[]>('product_sources.json')
  const directory = await json<BrandDirectory>('brand_directory.json')
  const tables = await json<SummaryTable[]>('product_summary_tables.json')
  const readmeProducts = await readFile(path.join(INPUT, 'README_products.md'), 'utf8')
  for (const [name, value] of Object.entries({ cocktails, sheets, directory, reference })) {
    assertReviewed(value, name)
  }

  const ids = deterministicIds()
  const db = freshNotebook(ids)
  const w = new Writer(db, ids)
  const ingredientsRepo = new IngredientRepository(db, ids)
  const productsRepo = new ProductRepository(db, ids)
  const recipesRepo = new RecipeRepository(db, ids, ingredientsRepo)

  // Study guides and their numbered sources --------------------------------------------
  const cocktailsGuide = w.insert('study_guides', {
    title: 'MAF 2025 : socle des cocktails',
    kind: 'cocktails',
    edition_label: cocktailSources.referential.replace(/^Référentiel\s*:\s*/, ''),
    edition_year: 2025,
    sources_intro: cocktailSources.sources_intro,
    sources_limits: cocktailSources.limits,
    price_multiplier: 5,
    vat_rate_bp: 2000,
    menu_rounding_step_cents: 50,
    menu_rounding: 'up',
    dash_ml: 0.25,
    abv_method: 'socle',
    import_key: 'maf-2025/cocktails',
  })
  const productsIntro =
    /Phrase d'introduction de la liste dans le carnet : « (.+?) »/.exec(readmeProducts)?.[1] ?? null
  const productsLimits = /^> (Limites\..+)$/m.exec(readmeProducts)?.[1] ?? null
  const productsGuide = w.insert('study_guides', {
    title: 'MAF 2025 : fiches produits',
    kind: 'products',
    edition_year: 2025,
    sources_intro: productsIntro,
    sources_limits: productsLimits,
    import_key: 'maf-2025/products',
  })
  const sourceIds = (guide: string, list: Source[]) =>
    new Map(
      list.map((s) => [
        s.number,
        w.insert('guide_sources', { guide_id: guide, number: s.number, text: s.text }),
      ]),
    )
  const cocktailSourceIds = sourceIds(cocktailsGuide, cocktailSources.sources)
  const productSourceIds = sourceIds(productsGuide, productSources)
  const cite = (
    sources: Map<number, string>,
    numbers: number[],
    target: { sheet_id?: string; table_row_id?: string },
  ) => {
    ;[...new Set(numbers)].forEach((n, i) => {
      w.insert('source_citations', {
        source_id: sources.get(n) ?? fail(`Unknown source [${n}]`),
        ...target,
        sort_order: i,
      })
    })
  }

  // Ingredients and reference products ---------------------------------------------------
  const categoryOf = new Map<string, ReferenceCategory>(REFERENCE_CATEGORIES.map((c) => [key(c.label), c]))
  const ingredientIds = new Map<string, string>()
  const productByLabel = new Map<string, { id: string; abv: number | null }>()
  const listedProducts: string[] = []
  for (const product of reference.products) {
    const mapping = categoryOf.get(key(product.category)) ?? fail(`Unmapped category ${product.category}`)
    let ingredientId = ingredientIds.get(key(mapping.ingredient))
    const aliases = [mapping.label, ...(mapping.aliases ?? [])].filter(
      (a) => key(a) !== key(mapping.ingredient),
    )
    if (!ingredientId) {
      ingredientId = ingredientsRepo.create(
        ingredientInputSchema.parse({
          name: mapping.ingredient,
          categoryId: w.seedId('categories', mapping.category),
          defaultAbv: product.abv_pct ?? mapping.abv ?? null,
          allergens: mapping.allergens ?? [],
          aliases,
        }),
      ).id
      ingredientIds.set(key(mapping.ingredient), ingredientId)
    } else {
      // A second label for the same ingredient (the two bourbons): keep it as an alias.
      const current = ingredientsRepo.get(ingredientId)
      ingredientsRepo.update(
        ingredientId,
        ingredientInputSchema.parse({
          name: current.name,
          categoryId: current.categoryId,
          defaultAbv: current.defaultAbv,
          allergens: current.allergens,
          aliases: [...new Set([...current.aliases, ...aliases])],
        }),
      )
    }
    const created = productsRepo.create(
      productInputSchema.parse({
        ingredientId,
        name: product.reference,
        abv: product.abv_pct,
        volumeMl: mapping.pack ? null : product.volume_ml,
        purchasePriceCents: product.price_ht_cents,
        purchasePriceBasis: product.price_ht_cents === null ? null : 'ht',
        packQuantity: mapping.pack?.[0] ?? null,
        packUnit: mapping.pack?.[1] ?? null,
        personalNotes: product.note,
        allergens: mapping.allergens ?? [],
      }),
    )
    db.$client
      .prepare('UPDATE products SET reference_guide_id = ? WHERE id = ?')
      .run(cocktailsGuide, created.id)
    productByLabel.set(key(product.category), { id: created.id, abv: product.abv_pct })
    listedProducts.push(created.id)
  }
  // « Blanc d'œuf (ou aquafaba) »: the aquafaba is its own ingredient, without the egg allergen.
  ingredientsRepo.create(
    ingredientInputSchema.parse({
      name: 'Aquafaba',
      categoryId: w.seedId('categories', 'cat.dairy.emulsifiers'),
    }),
  )
  /** A line of a cocktail: its base produits label, then the ingredient and the product. */
  function resolveLine(line: Line): { label: string; note: string | null } {
    const special = Object.entries(LINE_NAMES).find(([k]) => key(k) === key(line.name))?.[1]
    if (special) return { label: special.label, note: special.note ?? null }
    if (categoryOf.has(key(line.name))) return { label: line.name, note: null }
    const byReference = reference.products.filter(
      (p) => line.reference_product !== null && key(p.reference) === key(line.reference_product),
    )
    if (byReference.length === 1 && byReference[0]) return { label: byReference[0].category, note: null }
    return fail(`Cannot resolve the line « ${line.name} » (${line.reference_product ?? 'no reference'})`)
  }

  // Cocktails ----------------------------------------------------------------------------
  const synthesis = new Map(cocktailSources.synthesis.rows.map((r) => [r.number, r]))
  const recipeIds = new Map<string, string>()
  const socleCollection = w.insert('collections', {
    name: 'MAF 2025 : socle des cocktails',
    description:
      'Les 36 cocktails du socle de référence 2025, dans son ordre (18 short drinks puis 18 long drinks).',
    kind: 'competition',
    sort_order: 0,
  })
  const pendingVariants: { sectionItem: string; name: string }[] = []

  for (const c of cocktails) {
    const row = synthesis.get(c.number) ?? fail(`No synthesis row for ${c.name}`)
    if (row.socle_pct !== c.abv.socle_pct || row.computed_pct !== c.abv.computed_pct) {
      fail(`Synthesis and sheet disagree for ${c.name}`)
    }
    if (c.name_socle !== c.name_socle.toUpperCase() || key(c.name_socle) !== key(c.name)) {
      fail(`Socle name differs for ${c.name}`)
    }
    const computed = Math.round((c.total_volume_x_abv / c.total_counted_volume_ml) * 10) / 10
    if (Math.abs(computed - c.abv.computed_pct) > 0.051) fail(`Computed ABV differs for ${c.name}`)

    const resolved = c.ingredients.map((line) => {
      const { label, note } = resolveLine(line)
      const mapping = categoryOf.get(key(label)) ?? fail(`Unmapped ${label}`)
      const product = productByLabel.get(key(label)) ?? fail(`No product for ${label}`)
      const ingredientId =
        ingredientIds.get(key(mapping.ingredient)) ?? fail(`No ingredient ${mapping.ingredient}`)
      if (line.abv_pct !== null && product.abv !== null && line.abv_pct !== product.abv) {
        fail(`ABV of ${line.name} in ${c.name} differs from its reference product`)
      }
      return {
        line,
        ingredientId,
        productId: product.id,
        note: [note, line.note].filter(Boolean).join(' ; ') || null,
      }
    })

    const method = METHODS.find(([prefix]) => key(c.method_label).startsWith(key(prefix)))?.[1] ?? null
    if (!method) fail(`Unmapped method ${c.method_label}`)
    const crushed = /glace pilée/i.test(c.glass) || /glace pilée/i.test(c.method_label)
    const lines = resolved.map((r) => ({
      ingredientId: r.ingredientId,
      preferredProductId: r.productId,
      quantity: r.line.quantity,
      unit: r.line.unit,
      note: r.note,
    }))
    // The salt rim stays in the garnish text and the garnish cost; the champagne shot of the
    // Pornstar Martini has no dose in the notebook and stays in the steps (docs/maf-mapping.md).
    const recipe = recipesRepo.create(
      recipeInputSchema.parse({
        name: c.name,
        status: 'final',
        origin: 'classic',
        credit: SOCLE_CREDIT,
        family: mapped(FAMILIES, c.family_short, 'family'),
        method,
        glassId: w.seedId('glasses', mapped(COCKTAIL_GLASSES, c.glass, 'glass')),
        iceId: crushed ? w.seedId('ice_types', 'ice.crushed') : null,
        garnish: c.garnish,
        steps: c.socle_steps,
        drinkLength: c.size,
        servingMoment: c.moment,
        profile: c.profile,
        garnishCostHtCents: c.garnish_cost_ht_cents,
        lines,
      }),
      { label: 'Import MAF 2025' },
    )
    recipeIds.set(key(c.name), recipe.id)

    // Frozen socle version, then the IBA one.
    const spec = w.insert('reference_specs', {
      recipe_id: recipe.id,
      guide_id: cocktailsGuide,
      kind: 'socle',
      label: 'Socle 2025',
      family_label: c.family_label,
      family_short_label: c.family_short,
      method_label: c.method_label,
      glass_label: c.glass,
      garnish: c.garnish,
      steps: c.socle_steps,
      stated_abv_pct: c.abv.socle_pct,
      abv_gap_explanation: c.abv.explanation,
      abv_gap_summary: row.explanation,
      garnish_cost_ht_cents: c.garnish_cost_ht_cents,
      material_cost_ht_cents: c.cost.material_ht_cents,
      sale_price_ttc_cents: c.cost.sale_ttc_coef5_cents,
      cost_ratio_pct: c.cost.cost_ratio_pct,
      sort_order: 0,
    })
    resolved.forEach((r, i) => {
      w.insert('reference_spec_lines', {
        spec_id: spec,
        label: r.line.name,
        short_label: r.line.card_label,
        dose_text: r.line.raw_dose,
        quantity: r.line.quantity,
        unit: r.line.unit,
        ingredient_id: r.ingredientId,
        product_id: r.productId,
        reference_label: r.line.reference_product,
        abv_pct: r.line.abv_pct,
        counted_in_abv: r.line.counted_in_abv,
        cost_ht_cents: r.line.cost_ht_cents,
        note: r.line.note,
        sort_order: i,
      })
    })
    if (c.iba_spec || c.iba_note) {
      w.insert('reference_specs', {
        recipe_id: recipe.id,
        guide_id: cocktailsGuide,
        kind: 'iba',
        label: 'IBA',
        spec_text: c.iba_spec,
        note: c.iba_note,
        sort_order: 1,
      })
    }

    // Culture sheet of the cocktail.
    const sheetId = w.insert('knowledge_sheets', {
      guide_id: cocktailsGuide,
      kind: 'recipe',
      recipe_id: recipe.id,
      number: c.number,
      key_takeaway: c.key_takeaway,
    })
    const sheet = new SheetBuilder(w, sheetId)
    sheet.section('technique', null).text(c.technique_points, { origin_doc: 'notebook' })
    sheet.section('pro_tips', null).bullets(c.pro_tips)
    const history = sheet.section('history', null)
    history.text(c.history_text, { origin_doc: 'notebook' })
    for (const entry of c.history_timeline) history.event(entry, 'mind_map')
    if (c.history_quick) {
      const date = parseDateLabel(c.history_quick.date_label)
      history.item('origin', {
        label: c.history_quick.date_label,
        actor: c.history_quick.who,
        place: c.history_quick.where,
        body: c.history_quick.text,
        date_kind: date.dateKind,
        year_from: date.yearFrom,
        year_to: date.yearTo,
        origin_doc: 'mind_map_short',
      })
    }
    const variants = sheet.section('variants', null)
    for (const v of c.variants) {
      const item = variants.item('variant', {
        label: v.name,
        body: v.description,
        attr: /^(version|sans |au |aux |à la |autre )/i.test(v.name) ? 'version' : null,
      })
      pendingVariants.push({ sectionItem: item, name: v.name })
    }
    variants.text(c.variants_text, { origin_doc: 'notebook' })
    const productsSection = sheet.section('products', null)
    productsSection.text(c.products_notes, { origin_doc: 'notebook' })
    productsSection.bullets(c.products_card, { origin_doc: 'mind_map_short' })
    const jury = sheet.section('jury', null)
    for (const q of c.jury_questions) {
      jury.item('qa', {
        prompt: q.question,
        body: q.answer,
        origin_doc: q.source === 'carte_mentale' ? 'mind_map' : 'notebook',
      })
    }
    cite(cocktailSourceIds, c.sources, { sheet_id: sheetId })
    w.insert('collection_items', {
      collection_id: socleCollection,
      recipe_id: recipe.id,
      sort_order: c.number,
      sale_price_cents: c.cost.menu_price_cents,
    })
  }
  // Variants that are sheets of the socle point to them (Mojito, Negroni, French 75...).
  for (const v of pendingVariants) {
    const target = recipeIds.get(key(v.name))
    if (target)
      db.$client
        .prepare('UPDATE knowledge_items SET linked_recipe_id = ? WHERE id = ?')
        .run(target, v.sectionItem)
  }

  // Pages of the cocktails notebook: base produits, ABV synthesis, method -----------------
  const cocktailsPage = new SheetBuilder(
    w,
    w.insert('knowledge_sheets', {
      guide_id: cocktailsGuide,
      kind: 'guide',
      title: 'Base produits, synthèse des TAV et méthode',
      title_normalized: key('Base produits, synthèse des TAV et méthode'),
    }),
  )
  const referenceSection = cocktailsPage.section('reference_products', reference.source)
  for (const paragraph of reference.intro) referenceSection.text(paragraph)
  const synthesisSection = cocktailsPage.section('synthesis', cocktailSources.synthesis.title)
  for (const note of cocktailSources.synthesis.note) synthesisSection.text(note)
  for (const note of cocktailSources.method_notes) {
    const section = cocktailsPage.section('method', note.title)
    for (const paragraph of note.paragraphs) section.text(paragraph)
  }
  listedProducts.forEach((productId, i) => {
    w.insert('knowledge_links', {
      sheet_id: cocktailsPage.sheetId,
      product_id: productId,
      role: 'lists',
      sort_order: i,
    })
  })

  // Product cards --------------------------------------------------------------------------
  const productsCollection = w.insert('collections', {
    name: 'MAF 2025 : fiches produits',
    description: 'Les 48 fiches produits du carnet, avec le répertoire des marques.',
    kind: 'competition',
    sort_order: 1,
  })
  const pages = new Map(directory.pages.map((p) => [p.code, p]))
  const directoryBySheet = new Map(directory.by_product.map((d) => [d.fiche, d]))
  for (const p of sheets) {
    const glassKey = p.glass_label ? mapped(SHEET_GLASSES, p.glass_label, 'glass') : null
    const sheetId = w.insert('knowledge_sheets', {
      guide_id: productsGuide,
      kind: 'category',
      number: p.number,
      title: p.name,
      title_normalized: key(p.name),
      subtitle: p.subtitle,
      group_key: p.family,
      subgroup_label: p.footer_category,
      class_label: p.class_label,
      min_abv_label: p.min_abv_label,
      min_abv_pct: p.min_abv_pct,
      origin_label: p.origin,
      center_label: p.center_label,
      glass_id: glassKey ? w.seedId('glasses', glassKey) : null,
      header_badges: p.header_badges,
      key_takeaway: p.key_takeaway,
    })
    const sheet = new SheetBuilder(w, sheetId)
    const t = p.section_titles
    const s = p.sections
    sheet.section('fabrication', t['fabrication'] ?? null, { is_ordered: true }).bullets(s.fabrication)
    const history = sheet.section('history', t['history_timeline'] ?? null)
    for (const entry of s.history_timeline) history.event(entry, 'mind_map')
    sheet.section('regulation', t['regulation'] ?? null).bullets(s.regulation)
    const types = sheet.section('types_styles', t['types_styles'] ?? null)
    for (const entry of s.types_styles) types.item('labeled', { label: entry.label, body: entry.text })
    if (t['tasting'] && s.tasting) {
      const tasting = sheet.section('tasting', t['tasting'])
      tasting.item('labeled', { attr: 'eye', label: 'Œil', body: s.tasting.eye })
      tasting.item('labeled', { attr: 'nose', label: 'Nez', body: s.tasting.nose })
      tasting.item('labeled', { attr: 'mouth', label: 'Bouche', body: s.tasting.mouth })
    }
    sheet.section('service', t['service'] ?? null).bullets(s.service)
    const jury = sheet.section('cocktails_jury', t['cocktails'] ?? null)
    if (s.cocktails.in_socle)
      jury.item('labeled', { attr: 'in_socle', label: 'Au socle', body: s.cocktails.in_socle })
    if (s.cocktails.other_classics) {
      jury.item('labeled', {
        attr: 'other_classics',
        label: 'Autres classiques',
        body: s.cocktails.other_classics,
      })
    }
    for (const extra of s.cocktails.extra) jury.item('labeled', { label: extra.label, body: extra.text })
    for (const q of s.jury_questions)
      jury.item('qa', { prompt: q.question, body: q.answer, origin_doc: 'mind_map' })
    const brands = sheet.section('brands', t['brands'] ?? null)
    for (const group of s.brands) {
      brands.item('list', {
        label: group.group,
        list_values: group.names,
        review_note: group.review_note ?? null,
        review_resolution: group.review_resolution ?? null,
      })
    }
    for (const block of s.other_blocks) sheet.section('other', block.title).bullets(block.items)
    const entry = directoryBySheet.get(p.number)
    if (entry) {
      const page = pages.get(entry.page_code)
      const section = sheet.section('brand_directory', entry.directory_title, {
        source_code: entry.page_code,
        source_title: page?.title ?? null,
        source_page: entry.page,
      })
      for (const brand of entry.brands) {
        section.item('brand', {
          label: brand.name,
          place: brand.origin,
          actor: brand.owner,
          body: brand.note,
          raw_text: brand.details_raw ?? brand.name,
          in_socle: brand.in_socle,
          review_note: brand.review_note ?? null,
          review_resolution: brand.review_resolution ?? null,
        })
      }
    }
    cite(productSourceIds, p.sources, { sheet_id: sheetId })
    ;(SHEET_CATEGORIES[p.number] ?? fail(`No categories for card ${p.number}`)).forEach((category, i) => {
      w.insert('knowledge_links', {
        sheet_id: sheetId,
        category_id: w.seedId('categories', category),
        role: 'about',
        sort_order: i,
      })
    })
    // Socle cocktails named in « Au socle »: suggested links, confirmed by the user.
    const inSocle = key(s.cocktails.in_socle ?? '')
    let mention = 0
    for (const [name, recipeId] of recipeIds) {
      if (
        new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(inSocle)
      ) {
        w.insert('knowledge_links', {
          sheet_id: sheetId,
          recipe_id: recipeId,
          role: 'mentions',
          is_suggested: true,
          sort_order: mention++,
        })
      }
    }
    w.insert('collection_items', {
      collection_id: productsCollection,
      sheet_id: sheetId,
      sort_order: p.number,
    })
  }

  // Page of the products notebook: legend and owner groups -------------------------------
  const productsPage = new SheetBuilder(
    w,
    w.insert('knowledge_sheets', {
      guide_id: productsGuide,
      kind: 'guide',
      title: 'Répertoire des marques',
      title_normalized: key('Répertoire des marques'),
    }),
  )
  productsPage.section('directory_legend', null).text(directory.legend)
  const ownerPage = directory.pages.find((p) => p.fiches.length === 0)
  const owners = productsPage.section('owner_groups', directory.owner_groups.title, {
    source_code: ownerPage?.code ?? null,
    source_title: ownerPage?.title ?? null,
    source_page: ownerPage?.page ?? null,
  })
  owners.text(directory.owner_groups.subtitle, { attr: 'subtitle' })
  owners.text(directory.owner_groups.jury_note ?? null, { attr: 'jury_note' })
  for (const group of directory.owner_groups.groups) {
    owners.item('list', { label: group.name, place: group.country, list_values: group.brands })
  }

  // Summary tables ---------------------------------------------------------------------------
  tables.forEach((table, i) => {
    const refColumn = table.columns.findIndex((c) => key(c) === key('Réf.'))
    const tableId = w.insert('study_tables', {
      guide_id: productsGuide,
      title: table.title,
      description: table.description,
      columns: table.columns,
      quiz_columns: table.columns.map((_, n) => n).filter((n) => n !== refColumn),
      sort_order: i,
    })
    table.rows.forEach((cells, n) => {
      const rowId = w.insert('study_table_rows', { table_id: tableId, cells, sort_order: n })
      if (refColumn >= 0)
        cite(productSourceIds, citationNumbers(cells[refColumn] ?? null), { table_row_id: rowId })
    })
  })

  // Export, then a full import into a fresh notebook before writing --------------------------
  const exported: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  for (const table of IMPORT_TABLE_NAMES) {
    const rows = db.$client.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NULL`).all()
    if (rows.length === 0) continue
    exported[table] = rows
    counts[table] = rows.length
  }
  db.$client.close()
  const data = { formatVersion: 1, tables: exported }
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')) as { version: string }
  await writeArchive(OUTPUT, {
    manifest: {
      format: 'shakery',
      formatVersion: 1,
      appVersion: pkg.version,
      createdAt: EDITION_MS,
      kind: 'partial',
      label: 'Carnets MAF 2025',
      counts,
    },
    data,
  })

  const archive = await readArchive(OUTPUT)
  const checked = validateImportData(archive.data)
  const targetIds: Ids = { now: Date.now, newId: createUuidV7Generator(Date.now, (b) => b.fill(7)) }
  const target = freshNotebook(targetIds)
  const preview = previewImport(target, checked, targetIds)
  const scratch = await mkdtemp(path.join(tmpdir(), 'shakery-maf-'))
  try {
    const applied = await applyImport(
      target,
      { data: checked, media: archive.media },
      { strategy: 'ignore', ids: targetIds, mediaRoot: scratch },
    )
    const again = await applyImport(
      target,
      { data: checked, media: archive.media },
      { strategy: 'ignore', ids: targetIds, mediaRoot: scratch },
    )
    if (again.inserted !== 0) fail('A second import of the same archive inserted rows')
    console.log(`Archive: ${OUTPUT}`)
    console.table(counts)
    console.log(
      `Check import: ${applied.inserted} inserted, ${applied.skipped} matched; preview of ${preview.length} tables; second import: ${again.skipped} skipped.`,
    )
    const undated = target.$client
      .prepare(
        "SELECT DISTINCT label FROM knowledge_items WHERE date_kind IN ('undated', 'relative') ORDER BY label",
      )
      .all() as { label: string }[]
    console.log(`Labels without a year: ${undated.map((r) => r.label).join(' | ')}`)
  } finally {
    target.$client.close()
    await rm(scratch, { recursive: true, force: true })
  }
}

convert().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
