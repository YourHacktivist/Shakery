/**
 * SQLite schema, section 7 of docs/SPEC.md. Identifiers in English, one Drizzle table per
 * spec table. The MAF extension (decision D-003) is added in its own section at the end
 * once validated.
 *
 * Conventions:
 * - every business table has id (UUIDv7), created_at, updated_at, deleted_at (soft delete);
 * - dates are epoch milliseconds (UTC), amounts are integer cents;
 * - enumerations are TEXT columns with a CHECK constraint;
 * - JSON columns hold arrays or objects validated by Zod in the repositories;
 * - a missing value is NULL, never 0.
 */
import { sql, type SQL } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core'

function commonColumns() {
  return {
    id: text('id').primaryKey(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  }
}

function inList(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} IN (${sql.join(
    values.map((v) => sql.raw(`'${v.replace(/'/g, "''")}'`)),
    sql`, `,
  )})`
}

const bool = (name: string) => integer(name, { mode: 'boolean' }).notNull().default(false)
const live = (table: { deletedAt: AnySQLiteColumn }): SQL => sql`${table.deletedAt} IS NULL`

export const BATCH_HINTS = ['ok', 'add_at_service', 'fresh'] as const
export const COMPOSITION_SOURCES = ['ciqual', 'computed', 'label', 'reference', 'user'] as const
export const COMPOSITION_CONFIDENCES = ['sourced', 'estimated'] as const
export const INGREDIENT_SOURCES = ['seed', 'wikidata', 'user'] as const
export const PRODUCT_SOURCES = ['user', 'off'] as const
export const RECIPE_KINDS = ['cocktail', 'prep'] as const
export const RECIPE_STATUSES = ['idea', 'draft', 'testing', 'final', 'archived'] as const
export const RECIPE_ORIGINS = ['mine', 'classic', 'other'] as const
export const RECIPE_FAMILIES = [
  'sour',
  'spirit_forward',
  'highball',
  'fizz',
  'flip',
  'tiki',
  'punch',
  'shot',
  'non_alcoholic',
  'other',
] as const
export const RECIPE_METHODS = [
  'shake',
  'dry_shake',
  'stir',
  'build',
  'throw',
  'blend',
  'swizzle',
  'other',
] as const
export const RECIPE_SOURCES = ['seed_iba', 'seed', 'user'] as const
export const UNITS = [
  'ml',
  'cl',
  'oz',
  'dash',
  'drop',
  'barspoon',
  'tsp',
  'g',
  'piece',
  'leaf',
  'slice',
  'wedge',
  'top',
  'to_taste',
] as const
export const NOTEBOOK_ENTITY_TYPES = ['recipe', 'ingredient', 'product', 'sheet'] as const
export const RECENT_ENTITY_TYPES = [
  'recipe',
  'ingredient',
  'product',
  'sheet',
  'notebook_entry',
  'collection',
] as const
export const PREP_BATCH_STATUSES = ['active', 'finished', 'discarded'] as const
export const COLLECTION_KINDS = ['menu', 'competition', 'theme', 'other'] as const

// MAF extension (D-016 to D-020, docs/proposals/2026-11-17-modele-donnees-maf.md)
export const DRINK_LENGTHS = ['short', 'long'] as const
export const SERVING_MOMENTS = ['before_dinner', 'all_day', 'after_dinner'] as const
export const PACK_UNITS = ['piece', 'leaf', 'slice', 'wedge', 'barspoon', 'tsp', 'g', 'serving'] as const
export const PRICE_BASES = ['ht', 'ttc'] as const
export const PRACTICE_MODES = ['quiz', 'flashcards', 'calc'] as const
export const STUDY_GUIDE_KINDS = ['cocktails', 'products', 'other'] as const
export const MENU_ROUNDINGS = ['up', 'nearest'] as const
export const ABV_METHODS = ['served', 'socle'] as const
export const REFERENCE_SPEC_KINDS = ['socle', 'iba', 'other'] as const
export const SHEET_KINDS = ['recipe', 'category', 'guide'] as const
export const SECTION_KEYS = [
  // recipe sheets
  'technique',
  'pro_tips',
  'history',
  'variants',
  'products',
  'jury',
  // category sheets
  'fabrication',
  'regulation',
  'types_styles',
  'tasting',
  'service',
  'cocktails_jury',
  'brands',
  'brand_directory',
  'other',
  // guide pages
  'method',
  'synthesis',
  'reference_products',
  'directory_legend',
  'owner_groups',
] as const
export const ITEM_KINDS = [
  'text',
  'bullet',
  'labeled',
  'event',
  'origin',
  'qa',
  'variant',
  'brand',
  'list',
] as const
export const DATE_KINDS = [
  'year',
  'circa',
  'range',
  'decade',
  'century',
  'after',
  'before',
  'alternatives',
  'relative',
  'undated',
] as const
export const ORIGIN_DOCS = ['notebook', 'mind_map', 'mind_map_short', 'user'] as const
export const LINK_ROLES = ['about', 'mentions', 'brand_of', 'lists'] as const
export const PRACTICE_SUBJECT_TYPES = ['recipe', 'reference_spec', 'sheet', 'item', 'table_row'] as const

// ---------------------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------------------

export const categories = sqliteTable(
  'categories',
  {
    ...commonColumns(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => categories.id),
    sortOrder: integer('sort_order').notNull().default(0),
    batchHint: text('batch_hint', { enum: BATCH_HINTS }).notNull().default('ok'),
    seedKey: text('seed_key').unique(),
  },
  (t) => [
    index('categories_parent_idx').on(t.parentId),
    uniqueIndex('categories_slug_live_uq').on(t.slug).where(live(t)),
    check('categories_batch_hint_ck', inList(t.batchHint, BATCH_HINTS)),
  ],
)

export const glasses = sqliteTable('glasses', {
  ...commonColumns(),
  name: text('name').notNull(),
  capacityMl: integer('capacity_ml'),
  sortOrder: integer('sort_order').notNull().default(0),
  seedKey: text('seed_key').unique(),
})

export const iceTypes = sqliteTable('ice_types', {
  ...commonColumns(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  seedKey: text('seed_key').unique(),
})

// ---------------------------------------------------------------------------------------
// Ingredients and bottles
// ---------------------------------------------------------------------------------------

export const ingredients = sqliteTable(
  'ingredients',
  {
    ...commonColumns(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    defaultAbv: real('default_abv'),
    sugarGPerL: real('sugar_g_per_l'),
    acidGPerL: real('acid_g_per_l'),
    compositionSource: text('composition_source', { enum: COMPOSITION_SOURCES }),
    compositionConfidence: text('composition_confidence', { enum: COMPOSITION_CONFIDENCES }),
    /** g/ml, so a line in grams counts as a volume (D-031). */
    densityGPerMl: real('density_g_per_ml'),
    flavorTags: text('flavor_tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    description: text('description'),
    allergens: text('allergens', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    prepRecipeId: text('prep_recipe_id').references((): AnySQLiteColumn => recipes.id),
    isStaple: bool('is_staple'),
    isFavorite: bool('is_favorite'),
    source: text('source', { enum: INGREDIENT_SOURCES }).notNull().default('user'),
    externalRef: text('external_ref'),
    seedKey: text('seed_key').unique(),
  },
  (t) => [
    index('ingredients_category_idx').on(t.categoryId),
    index('ingredients_prep_recipe_idx').on(t.prepRecipeId),
    index('ingredients_name_normalized_idx').on(t.nameNormalized),
    uniqueIndex('ingredients_name_category_live_uq').on(t.nameNormalized, t.categoryId).where(live(t)),
    check(
      'ingredients_abv_ck',
      sql`${t.defaultAbv} IS NULL OR (${t.defaultAbv} >= 0 AND ${t.defaultAbv} <= 100)`,
    ),
    check('ingredients_sugar_ck', sql`${t.sugarGPerL} IS NULL OR ${t.sugarGPerL} >= 0`),
    check('ingredients_acid_ck', sql`${t.acidGPerL} IS NULL OR ${t.acidGPerL} >= 0`),
    check(
      'ingredients_density_ck',
      sql`${t.densityGPerMl} IS NULL OR (${t.densityGPerMl} > 0 AND ${t.densityGPerMl} <= 5)`,
    ),
    check(
      'ingredients_composition_source_ck',
      sql`${t.compositionSource} IS NULL OR ${inList(t.compositionSource, COMPOSITION_SOURCES)}`,
    ),
    check(
      'ingredients_composition_confidence_ck',
      sql`${t.compositionConfidence} IS NULL OR ${inList(t.compositionConfidence, COMPOSITION_CONFIDENCES)}`,
    ),
    check('ingredients_source_ck', inList(t.source, INGREDIENT_SOURCES)),
  ],
)

export const ingredientAliases = sqliteTable(
  'ingredient_aliases',
  {
    ...commonColumns(),
    ingredientId: text('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    aliasNormalized: text('alias_normalized').notNull(),
  },
  (t) => [
    index('ingredient_aliases_ingredient_idx').on(t.ingredientId),
    index('ingredient_aliases_normalized_idx').on(t.aliasNormalized),
  ],
)

export const products = sqliteTable(
  'products',
  {
    ...commonColumns(),
    ingredientId: text('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    brand: text('brand'),
    name: text('name').notNull(),
    abv: real('abv'),
    volumeMl: integer('volume_ml'),
    sugarGPerL: real('sugar_g_per_l'),
    acidGPerL: real('acid_g_per_l'),
    barcode: text('barcode').unique(),
    purchasePriceCents: integer('purchase_price_cents'),
    owned: bool('owned'),
    personalNotes: text('personal_notes'),
    allergens: text('allergens', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    imagePath: text('image_path'),
    source: text('source', { enum: PRODUCT_SOURCES }).notNull().default('user'),
    // D-016, D-017: counted articles, purchase price basis, reference product of a study guide.
    packQuantity: real('pack_quantity'),
    packUnit: text('pack_unit', { enum: PACK_UNITS }),
    purchasePriceBasis: text('purchase_price_basis', { enum: PRICE_BASES }),
    referenceGuideId: text('reference_guide_id').references((): AnySQLiteColumn => studyGuides.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('products_ingredient_idx').on(t.ingredientId),
    index('products_owned_idx').on(t.owned),
    index('products_reference_guide_idx').on(t.referenceGuideId),
    check('products_abv_ck', sql`${t.abv} IS NULL OR (${t.abv} >= 0 AND ${t.abv} <= 100)`),
    check('products_volume_ck', sql`${t.volumeMl} IS NULL OR ${t.volumeMl} > 0`),
    check('products_price_ck', sql`${t.purchasePriceCents} IS NULL OR ${t.purchasePriceCents} >= 0`),
    check('products_source_ck', inList(t.source, PRODUCT_SOURCES)),
    check('products_pack_pair_ck', sql`(${t.packQuantity} IS NULL) = (${t.packUnit} IS NULL)`),
    check('products_pack_quantity_ck', sql`${t.packQuantity} IS NULL OR ${t.packQuantity} > 0`),
    check('products_pack_unit_ck', sql`${t.packUnit} IS NULL OR ${inList(t.packUnit, PACK_UNITS)}`),
    check('products_volume_or_pack_ck', sql`${t.volumeMl} IS NULL OR ${t.packQuantity} IS NULL`),
    check(
      'products_price_basis_ck',
      sql`${t.purchasePriceCents} IS NULL OR ${t.purchasePriceBasis} IS NOT NULL`,
    ),
    check(
      'products_price_basis_value_ck',
      sql`${t.purchasePriceBasis} IS NULL OR ${inList(t.purchasePriceBasis, PRICE_BASES)}`,
    ),
  ],
)

/** Raw Open Food Facts answers, kept apart because of their ODbL licence. Not a business table. */
export const offCache = sqliteTable('off_cache', {
  barcode: text('barcode').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
})

// ---------------------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------------------

export const recipes = sqliteTable(
  'recipes',
  {
    ...commonColumns(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    kind: text('kind', { enum: RECIPE_KINDS }).notNull().default('cocktail'),
    status: text('status', { enum: RECIPE_STATUSES }).notNull().default('idea'),
    origin: text('origin', { enum: RECIPE_ORIGINS }).notNull().default('mine'),
    credit: text('credit'),
    family: text('family', { enum: RECIPE_FAMILIES }),
    method: text('method', { enum: RECIPE_METHODS }),
    glassId: text('glass_id').references(() => glasses.id),
    iceId: text('ice_id').references(() => iceTypes.id),
    garnish: text('garnish'),
    steps: text('steps', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    notes: text('notes'),
    photoPath: text('photo_path'),
    tags: text('tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    dilutionOverridePct: real('dilution_override_pct'),
    parentRecipeId: text('parent_recipe_id').references((): AnySQLiteColumn => recipes.id),
    yieldMl: integer('yield_ml'),
    shelfLifeDays: integer('shelf_life_days'),
    storageNotes: text('storage_notes'),
    isFavorite: bool('is_favorite'),
    version: integer('version').notNull().default(1),
    source: text('source', { enum: RECIPE_SOURCES }).notNull().default('user'),
    seedKey: text('seed_key').unique(),
    // D-016: data declared by the MAF socle, also useful for the user's own creations.
    drinkLength: text('drink_length', { enum: DRINK_LENGTHS }),
    servingMoment: text('serving_moment', { enum: SERVING_MOMENTS }),
    profile: text('profile'),
    garnishCostHtCents: integer('garnish_cost_ht_cents'),
  },
  (t) => [
    check(
      'recipes_drink_length_ck',
      sql`${t.drinkLength} IS NULL OR ${inList(t.drinkLength, DRINK_LENGTHS)}`,
    ),
    check(
      'recipes_serving_moment_ck',
      sql`${t.servingMoment} IS NULL OR ${inList(t.servingMoment, SERVING_MOMENTS)}`,
    ),
    check('recipes_garnish_cost_ck', sql`${t.garnishCostHtCents} IS NULL OR ${t.garnishCostHtCents} >= 0`),
    index('recipes_status_updated_idx').on(t.status, t.updatedAt),
    index('recipes_name_normalized_idx').on(t.nameNormalized),
    index('recipes_glass_idx').on(t.glassId),
    index('recipes_ice_idx').on(t.iceId),
    index('recipes_parent_idx').on(t.parentRecipeId),
    check('recipes_kind_ck', inList(t.kind, RECIPE_KINDS)),
    check('recipes_status_ck', inList(t.status, RECIPE_STATUSES)),
    check('recipes_origin_ck', inList(t.origin, RECIPE_ORIGINS)),
    check('recipes_family_ck', sql`${t.family} IS NULL OR ${inList(t.family, RECIPE_FAMILIES)}`),
    check('recipes_method_ck', sql`${t.method} IS NULL OR ${inList(t.method, RECIPE_METHODS)}`),
    check('recipes_source_ck', inList(t.source, RECIPE_SOURCES)),
    check('recipes_version_ck', sql`${t.version} >= 1`),
    check('recipes_yield_ck', sql`${t.yieldMl} IS NULL OR ${t.yieldMl} > 0`),
    check('recipes_shelf_life_ck', sql`${t.shelfLifeDays} IS NULL OR ${t.shelfLifeDays} >= 0`),
    check('recipes_not_own_parent_ck', sql`${t.parentRecipeId} IS NULL OR ${t.parentRecipeId} <> ${t.id}`),
  ],
)

export const recipeLines = sqliteTable(
  'recipe_lines',
  {
    ...commonColumns(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    ingredientId: text('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    preferredProductId: text('preferred_product_id').references(() => products.id),
    quantity: real('quantity'),
    unit: text('unit', { enum: UNITS }).notNull(),
    topEstimateMl: real('top_estimate_ml'),
    isOptional: bool('is_optional'),
    isGarnish: bool('is_garnish'),
    sortOrder: integer('sort_order').notNull().default(0),
    note: text('note'),
  },
  (t) => [
    index('recipe_lines_recipe_idx').on(t.recipeId, t.sortOrder),
    index('recipe_lines_ingredient_idx').on(t.ingredientId),
    index('recipe_lines_product_idx').on(t.preferredProductId),
    check('recipe_lines_unit_ck', inList(t.unit, UNITS)),
    check('recipe_lines_quantity_ck', sql`${t.quantity} IS NULL OR ${t.quantity} >= 0`),
    check('recipe_lines_top_ck', sql`${t.topEstimateMl} IS NULL OR ${t.topEstimateMl} >= 0`),
  ],
)

export const recipeHistory = sqliteTable(
  'recipe_history',
  {
    ...commonColumns(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshot: text('snapshot', { mode: 'json' }).$type<unknown>().notNull(),
    label: text('label'),
  },
  (t) => [uniqueIndex('recipe_history_recipe_version_uq').on(t.recipeId, t.version)],
)

export const tastingNotes = sqliteTable(
  'tasting_notes',
  {
    ...commonColumns(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    recipeVersion: integer('recipe_version').notNull(),
    tastedAt: integer('tasted_at').notNull(),
    overall: integer('overall'),
    scores: text('scores', { mode: 'json' })
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'`),
    comment: text('comment'),
    nextStep: text('next_step'),
    nextStepDone: bool('next_step_done'),
    context: text('context'),
    photoPath: text('photo_path'),
  },
  (t) => [
    index('tasting_notes_recipe_tasted_idx').on(t.recipeId, t.tastedAt),
    check('tasting_notes_overall_ck', sql`${t.overall} IS NULL OR (${t.overall} BETWEEN 1 AND 5)`),
  ],
)

// ---------------------------------------------------------------------------------------
// Notebook, preparations, collections, practice
// ---------------------------------------------------------------------------------------

export const notebookEntries = sqliteTable('notebook_entries', {
  ...commonColumns(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  tags: text('tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  isPinned: bool('is_pinned'),
})

export const notebookLinks = sqliteTable(
  'notebook_links',
  {
    ...commonColumns(),
    entryId: text('entry_id')
      .notNull()
      .references(() => notebookEntries.id, { onDelete: 'cascade' }),
    entityType: text('entity_type', { enum: NOTEBOOK_ENTITY_TYPES }).notNull(),
    entityId: text('entity_id').notNull(),
  },
  (t) => [
    index('notebook_links_entry_idx').on(t.entryId),
    index('notebook_links_entity_idx').on(t.entityType, t.entityId),
    check('notebook_links_entity_type_ck', inList(t.entityType, NOTEBOOK_ENTITY_TYPES)),
  ],
)

export const prepBatches = sqliteTable(
  'prep_batches',
  {
    ...commonColumns(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    madeAt: integer('made_at').notNull(),
    quantityMl: integer('quantity_ml'),
    bestBefore: integer('best_before'),
    status: text('status', { enum: PREP_BATCH_STATUSES }).notNull().default('active'),
    notes: text('notes'),
  },
  (t) => [
    index('prep_batches_recipe_idx').on(t.recipeId),
    index('prep_batches_status_best_before_idx').on(t.status, t.bestBefore),
    check('prep_batches_status_ck', inList(t.status, PREP_BATCH_STATUSES)),
    check('prep_batches_quantity_ck', sql`${t.quantityMl} IS NULL OR ${t.quantityMl} > 0`),
  ],
)

export const collections = sqliteTable(
  'collections',
  {
    ...commonColumns(),
    name: text('name').notNull(),
    description: text('description'),
    kind: text('kind', { enum: COLLECTION_KINDS }).notNull().default('other'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [check('collections_kind_ck', inList(t.kind, COLLECTION_KINDS))],
)

export const collectionItems = sqliteTable(
  'collection_items',
  {
    ...commonColumns(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    // D-016: an item is either a recipe or a culture sheet (exactly one of the two).
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
    sheetId: text('sheet_id').references((): AnySQLiteColumn => knowledgeSheets.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    note: text('note'),
    /** Menu price including VAT (D-017). */
    salePriceCents: integer('sale_price_cents'),
    /** VAT rate in basis points (2000 = 20 %) overriding the setting, e.g. for a non-alcoholic drink. */
    vatRateBp: integer('vat_rate_bp'),
  },
  (t) => [
    index('collection_items_collection_idx').on(t.collectionId, t.sortOrder),
    index('collection_items_recipe_idx').on(t.recipeId),
    index('collection_items_sheet_idx').on(t.sheetId),
    check('collection_items_price_ck', sql`${t.salePriceCents} IS NULL OR ${t.salePriceCents} >= 0`),
    check('collection_items_target_ck', sql`(${t.recipeId} IS NULL) <> (${t.sheetId} IS NULL)`),
    check('collection_items_vat_ck', sql`${t.vatRateBp} IS NULL OR (${t.vatRateBp} BETWEEN 0 AND 10000)`),
  ],
)

export const practiceSessions = sqliteTable(
  'practice_sessions',
  {
    ...commonColumns(),
    collectionId: text('collection_id').references(() => collections.id, { onDelete: 'set null' }),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    mistakes: text('mistakes', { mode: 'json' })
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'`),
    finishedAt: integer('finished_at').notNull(),
    // D-016: kind of session and question generators used; answers are in practice_answers.
    mode: text('mode', { enum: PRACTICE_MODES }).notNull().default('quiz'),
    questionTypes: text('question_types', { mode: 'json' }).$type<string[]>(),
  },
  (t) => [
    index('practice_sessions_collection_idx').on(t.collectionId),
    check('practice_sessions_score_ck', sql`${t.score} >= 0 AND ${t.score} <= ${t.total}`),
    check('practice_sessions_mode_ck', inList(t.mode, PRACTICE_MODES)),
  ],
)

export const recentViews = sqliteTable(
  'recent_views',
  {
    ...commonColumns(),
    entityType: text('entity_type', { enum: RECENT_ENTITY_TYPES }).notNull(),
    entityId: text('entity_id').notNull(),
    viewedAt: integer('viewed_at').notNull(),
  },
  (t) => [
    index('recent_views_viewed_idx').on(t.viewedAt),
    index('recent_views_entity_idx').on(t.entityType, t.entityId),
    check('recent_views_entity_type_ck', inList(t.entityType, RECENT_ENTITY_TYPES)),
  ],
)

/** Application settings, one JSON value per key. Not a business table. */
export const settings = sqliteTable(
  'settings',
  {
    key: text('key').notNull(),
    value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.key] })],
)

// ---------------------------------------------------------------------------------------
// MAF extension (D-016 to D-020): study guides, frozen reference specs, culture sheets,
// study tables and the practice journal. See docs/proposals/2026-11-17-modele-donnees-maf.md.
// ---------------------------------------------------------------------------------------

/** An imported notebook: provenance, numbered sources and its own calculation rules. */
export const studyGuides = sqliteTable(
  'study_guides',
  {
    ...commonColumns(),
    title: text('title').notNull(),
    kind: text('kind', { enum: STUDY_GUIDE_KINDS }).notNull(),
    editionLabel: text('edition_label'),
    editionYear: integer('edition_year'),
    sourcesIntro: text('sources_intro'),
    sourcesLimits: text('sources_limits'),
    priceMultiplier: real('price_multiplier'),
    vatRateBp: integer('vat_rate_bp'),
    menuRoundingStepCents: integer('menu_rounding_step_cents'),
    menuRounding: text('menu_rounding', { enum: MENU_ROUNDINGS }),
    dashMl: real('dash_ml'),
    abvMethod: text('abv_method', { enum: ABV_METHODS }),
    importKey: text('import_key'),
  },
  (t) => [
    uniqueIndex('study_guides_import_key_uq')
      .on(t.importKey)
      .where(sql`${t.deletedAt} IS NULL AND ${t.importKey} IS NOT NULL`),
    check('study_guides_kind_ck', inList(t.kind, STUDY_GUIDE_KINDS)),
    check(
      'study_guides_menu_rounding_ck',
      sql`${t.menuRounding} IS NULL OR ${inList(t.menuRounding, MENU_ROUNDINGS)}`,
    ),
    check('study_guides_abv_method_ck', sql`${t.abvMethod} IS NULL OR ${inList(t.abvMethod, ABV_METHODS)}`),
    check('study_guides_multiplier_ck', sql`${t.priceMultiplier} IS NULL OR ${t.priceMultiplier} > 0`),
    check('study_guides_vat_ck', sql`${t.vatRateBp} IS NULL OR (${t.vatRateBp} BETWEEN 0 AND 10000)`),
    check(
      'study_guides_rounding_step_ck',
      sql`${t.menuRoundingStepCents} IS NULL OR ${t.menuRoundingStepCents} > 0`,
    ),
    check('study_guides_dash_ck', sql`${t.dashMl} IS NULL OR ${t.dashMl} > 0`),
  ],
)

/** Numbered sources of one notebook: [5] in the cocktails notebook is not [5] in the products one. */
export const guideSources = sqliteTable(
  'guide_sources',
  {
    ...commonColumns(),
    guideId: text('guide_id')
      .notNull()
      .references(() => studyGuides.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    text: text('text').notNull(),
  },
  (t) => [
    index('guide_sources_guide_idx').on(t.guideId),
    uniqueIndex('guide_sources_number_uq').on(t.guideId, t.number).where(live(t)),
    check('guide_sources_number_ck', sql`${t.number} >= 1`),
  ],
)

/** Published version of a cocktail (socle, IBA, book), frozen next to the working recipe. */
export const referenceSpecs = sqliteTable(
  'reference_specs',
  {
    ...commonColumns(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    guideId: text('guide_id').references(() => studyGuides.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: REFERENCE_SPEC_KINDS }).notNull(),
    label: text('label').notNull(),
    specText: text('spec_text'),
    note: text('note'),
    linkedRecipeId: text('linked_recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    familyLabel: text('family_label'),
    familyShortLabel: text('family_short_label'),
    methodLabel: text('method_label'),
    glassLabel: text('glass_label'),
    garnish: text('garnish'),
    steps: text('steps', { mode: 'json' }).$type<string[]>(),
    statedAbvPct: real('stated_abv_pct'),
    abvGapExplanation: text('abv_gap_explanation'),
    abvGapSummary: text('abv_gap_summary'),
    garnishCostHtCents: integer('garnish_cost_ht_cents'),
    materialCostHtCents: integer('material_cost_ht_cents'),
    salePriceTtcCents: integer('sale_price_ttc_cents'),
    costRatioPct: real('cost_ratio_pct'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('reference_specs_recipe_kind_idx').on(t.recipeId, t.kind),
    index('reference_specs_guide_idx').on(t.guideId),
    index('reference_specs_linked_recipe_idx').on(t.linkedRecipeId),
    uniqueIndex('reference_specs_recipe_guide_kind_uq').on(t.recipeId, t.guideId, t.kind).where(live(t)),
    check('reference_specs_kind_ck', inList(t.kind, REFERENCE_SPEC_KINDS)),
    check(
      'reference_specs_abv_ck',
      sql`${t.statedAbvPct} IS NULL OR (${t.statedAbvPct} >= 0 AND ${t.statedAbvPct} <= 100)`,
    ),
    check(
      'reference_specs_costs_ck',
      sql`(${t.garnishCostHtCents} IS NULL OR ${t.garnishCostHtCents} >= 0) AND (${t.materialCostHtCents} IS NULL OR ${t.materialCostHtCents} >= 0) AND (${t.salePriceTtcCents} IS NULL OR ${t.salePriceTtcCents} >= 0)`,
    ),
  ],
)

/** One printed line of a reference spec: labels, dose, retained ABV and printed cost. */
export const referenceSpecLines = sqliteTable(
  'reference_spec_lines',
  {
    ...commonColumns(),
    specId: text('spec_id')
      .notNull()
      .references(() => referenceSpecs.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    shortLabel: text('short_label'),
    doseText: text('dose_text'),
    quantity: real('quantity'),
    unit: text('unit', { enum: UNITS }).notNull(),
    ingredientId: text('ingredient_id').references(() => ingredients.id),
    productId: text('product_id').references(() => products.id),
    referenceLabel: text('reference_label'),
    abvPct: real('abv_pct'),
    countedInAbv: bool('counted_in_abv'),
    costHtCents: integer('cost_ht_cents'),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('reference_spec_lines_spec_idx').on(t.specId, t.sortOrder),
    index('reference_spec_lines_ingredient_idx').on(t.ingredientId),
    index('reference_spec_lines_product_idx').on(t.productId),
    check('reference_spec_lines_unit_ck', inList(t.unit, UNITS)),
    check('reference_spec_lines_quantity_ck', sql`${t.quantity} IS NULL OR ${t.quantity} >= 0`),
    check(
      'reference_spec_lines_abv_ck',
      sql`${t.abvPct} IS NULL OR (${t.abvPct} >= 0 AND ${t.abvPct} <= 100)`,
    ),
    check('reference_spec_lines_cost_ck', sql`${t.costHtCents} IS NULL OR ${t.costHtCents} >= 0`),
  ],
)

/** Culture sheet: about a cocktail, a category of drinks, or a page of a notebook. */
export const knowledgeSheets = sqliteTable(
  'knowledge_sheets',
  {
    ...commonColumns(),
    guideId: text('guide_id').references(() => studyGuides.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: SHEET_KINDS }).notNull(),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
    number: integer('number'),
    title: text('title'),
    titleNormalized: text('title_normalized'),
    subtitle: text('subtitle'),
    groupKey: text('group_key'),
    subgroupLabel: text('subgroup_label'),
    classLabel: text('class_label'),
    minAbvLabel: text('min_abv_label'),
    minAbvPct: real('min_abv_pct'),
    originLabel: text('origin_label'),
    centerLabel: text('center_label'),
    glassId: text('glass_id').references(() => glasses.id),
    headerBadges: text('header_badges', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    keyTakeaway: text('key_takeaway'),
  },
  (t) => [
    index('knowledge_sheets_guide_idx').on(t.guideId),
    index('knowledge_sheets_recipe_idx').on(t.recipeId),
    index('knowledge_sheets_glass_idx').on(t.glassId),
    index('knowledge_sheets_title_idx').on(t.titleNormalized),
    uniqueIndex('knowledge_sheets_guide_number_uq').on(t.guideId, t.number).where(live(t)),
    uniqueIndex('knowledge_sheets_guide_recipe_uq').on(t.guideId, t.recipeId).where(live(t)),
    check('knowledge_sheets_kind_ck', inList(t.kind, SHEET_KINDS)),
    check('knowledge_sheets_recipe_ck', sql`(${t.kind} = 'recipe') = (${t.recipeId} IS NOT NULL)`),
    check('knowledge_sheets_title_ck', sql`${t.kind} = 'recipe' OR ${t.title} IS NOT NULL`),
    check(
      'knowledge_sheets_min_abv_ck',
      sql`${t.minAbvPct} IS NULL OR (${t.minAbvPct} >= 0 AND ${t.minAbvPct} <= 100)`,
    ),
  ],
)

/** One block of a sheet (history, regulation, jury...), with its printed title. */
export const knowledgeSections = sqliteTable(
  'knowledge_sections',
  {
    ...commonColumns(),
    sheetId: text('sheet_id')
      .notNull()
      .references(() => knowledgeSheets.id, { onDelete: 'cascade' }),
    key: text('key', { enum: SECTION_KEYS }).notNull(),
    title: text('title'),
    isOrdered: bool('is_ordered'),
    sourceCode: text('source_code'),
    sourceTitle: text('source_title'),
    sourcePage: integer('source_page'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('knowledge_sections_sheet_idx').on(t.sheetId, t.sortOrder),
    check('knowledge_sections_key_ck', inList(t.key, SECTION_KEYS)),
  ],
)

/** One fact, bullet or question: the unit of revision, search and sync. */
export const knowledgeItems = sqliteTable(
  'knowledge_items',
  {
    ...commonColumns(),
    sectionId: text('section_id')
      .notNull()
      .references(() => knowledgeSections.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ITEM_KINDS }).notNull(),
    attr: text('attr'),
    label: text('label'),
    prompt: text('prompt'),
    body: text('body'),
    actor: text('actor'),
    place: text('place'),
    dateKind: text('date_kind', { enum: DATE_KINDS }),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    listValues: text('list_values', { mode: 'json' }).$type<string[]>(),
    linkedRecipeId: text('linked_recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
    originDoc: text('origin_doc', { enum: ORIGIN_DOCS }),
    inSocle: bool('in_socle'),
    rawText: text('raw_text'),
    reviewNote: text('review_note'),
    reviewResolution: text('review_resolution'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('knowledge_items_section_idx').on(t.sectionId, t.sortOrder),
    index('knowledge_items_linked_recipe_idx').on(t.linkedRecipeId),
    check('knowledge_items_kind_ck', inList(t.kind, ITEM_KINDS)),
    check('knowledge_items_date_kind_ck', sql`${t.dateKind} IS NULL OR ${inList(t.dateKind, DATE_KINDS)}`),
    check(
      'knowledge_items_origin_doc_ck',
      sql`${t.originDoc} IS NULL OR ${inList(t.originDoc, ORIGIN_DOCS)}`,
    ),
    check(
      'knowledge_items_qa_ck',
      sql`${t.kind} <> 'qa' OR (${t.prompt} IS NOT NULL AND ${t.body} IS NOT NULL)`,
    ),
    check(
      'knowledge_items_event_ck',
      sql`${t.kind} NOT IN ('event', 'origin') OR (${t.label} IS NOT NULL AND ${t.dateKind} IS NOT NULL)`,
    ),
    check(
      'knowledge_items_date_only_events_ck',
      sql`${t.dateKind} IS NULL OR ${t.kind} IN ('event', 'origin')`,
    ),
    check(
      'knowledge_items_list_ck',
      sql`${t.kind} <> 'list' OR (${t.label} IS NOT NULL AND ${t.listValues} IS NOT NULL)`,
    ),
    check(
      'knowledge_items_brand_ck',
      sql`${t.kind} <> 'brand' OR (${t.label} IS NOT NULL AND ${t.rawText} IS NOT NULL)`,
    ),
    check('knowledge_items_variant_link_ck', sql`${t.linkedRecipeId} IS NULL OR ${t.kind} = 'variant'`),
    check(
      'knowledge_items_years_ck',
      sql`${t.yearFrom} IS NULL OR ${t.yearTo} IS NULL OR ${t.yearTo} >= ${t.yearFrom}`,
    ),
  ],
)

/** Links from a sheet to the rest of the notebook, with real foreign keys (one target per row). */
export const knowledgeLinks = sqliteTable(
  'knowledge_links',
  {
    ...commonColumns(),
    sheetId: text('sheet_id')
      .notNull()
      .references(() => knowledgeSheets.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => knowledgeItems.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    ingredientId: text('ingredient_id').references(() => ingredients.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
    role: text('role', { enum: LINK_ROLES }).notNull(),
    isSuggested: bool('is_suggested'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('knowledge_links_sheet_idx').on(t.sheetId),
    index('knowledge_links_item_idx').on(t.itemId),
    index('knowledge_links_recipe_idx').on(t.recipeId),
    index('knowledge_links_category_idx').on(t.categoryId),
    index('knowledge_links_ingredient_idx').on(t.ingredientId),
    index('knowledge_links_product_idx').on(t.productId),
    uniqueIndex('knowledge_links_recipe_uq')
      .on(t.sheetId, t.role, t.recipeId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.recipeId} IS NOT NULL`),
    uniqueIndex('knowledge_links_category_uq')
      .on(t.sheetId, t.role, t.categoryId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.categoryId} IS NOT NULL`),
    uniqueIndex('knowledge_links_ingredient_uq')
      .on(t.sheetId, t.role, t.ingredientId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.ingredientId} IS NOT NULL`),
    uniqueIndex('knowledge_links_product_uq')
      .on(t.sheetId, t.role, t.productId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.productId} IS NOT NULL`),
    check('knowledge_links_role_ck', inList(t.role, LINK_ROLES)),
    check(
      'knowledge_links_one_target_ck',
      sql`(${t.recipeId} IS NOT NULL) + (${t.categoryId} IS NOT NULL) + (${t.ingredientId} IS NOT NULL) + (${t.productId} IS NOT NULL) = 1`,
    ),
  ],
)

/** Summary tables to learn by heart. */
export const studyTables = sqliteTable(
  'study_tables',
  {
    ...commonColumns(),
    guideId: text('guide_id')
      .notNull()
      .references(() => studyGuides.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    columns: text('columns', { mode: 'json' }).$type<string[]>().notNull(),
    quizColumns: text('quiz_columns', { mode: 'json' }).$type<number[]>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('study_tables_guide_idx').on(t.guideId)],
)

export const studyTableRows = sqliteTable(
  'study_table_rows',
  {
    ...commonColumns(),
    tableId: text('table_id')
      .notNull()
      .references(() => studyTables.id, { onDelete: 'cascade' }),
    cells: text('cells', { mode: 'json' }).$type<Array<string | null>>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('study_table_rows_table_idx').on(t.tableId, t.sortOrder)],
)

/** A sheet or a table row cites a source of its own notebook, in printed order. */
export const sourceCitations = sqliteTable(
  'source_citations',
  {
    ...commonColumns(),
    sourceId: text('source_id')
      .notNull()
      .references(() => guideSources.id, { onDelete: 'cascade' }),
    sheetId: text('sheet_id').references(() => knowledgeSheets.id, { onDelete: 'cascade' }),
    tableRowId: text('table_row_id').references(() => studyTableRows.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('source_citations_source_idx').on(t.sourceId),
    index('source_citations_sheet_idx').on(t.sheetId),
    index('source_citations_table_row_idx').on(t.tableRowId),
    uniqueIndex('source_citations_sheet_uq')
      .on(t.sourceId, t.sheetId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.sheetId} IS NOT NULL`),
    uniqueIndex('source_citations_table_row_uq')
      .on(t.sourceId, t.tableRowId)
      .where(sql`${t.deletedAt} IS NULL AND ${t.tableRowId} IS NOT NULL`),
    check('source_citations_one_target_ck', sql`(${t.sheetId} IS NULL) <> (${t.tableRowId} IS NULL)`),
  ],
)

/**
 * Practice journal, append only: merging two devices is a union. The subject reference is
 * polymorphic on purpose: `expected` keeps the answer readable even if the subject is purged.
 */
export const practiceAnswers = sqliteTable(
  'practice_answers',
  {
    ...commonColumns(),
    sessionId: text('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade' }),
    questionKey: text('question_key').notNull(),
    generator: text('generator').notNull(),
    subjectType: text('subject_type', { enum: PRACTICE_SUBJECT_TYPES }).notNull(),
    subjectId: text('subject_id').notNull(),
    expected: text('expected').notNull(),
    response: text('response'),
    isCorrect: integer('is_correct', { mode: 'boolean' }),
    selfGraded: bool('self_graded'),
    answeredAt: integer('answered_at').notNull(),
  },
  (t) => [
    index('practice_answers_session_idx').on(t.sessionId),
    index('practice_answers_question_idx').on(t.questionKey, t.answeredAt),
    index('practice_answers_subject_idx').on(t.subjectType, t.subjectId),
    check('practice_answers_subject_type_ck', inList(t.subjectType, PRACTICE_SUBJECT_TYPES)),
  ],
)
