import { z } from 'zod'
import {
  BATCH_TARGETS,
  LABEL_FORMAT_VALUES,
  manualBatchSchema,
  MAX_LABELS,
  PRINT_TARGETS,
  RECIPE_PAPERS,
} from '../print'
import { ALLERGEN_CODES } from '../domain/allergens'
import { settingChangeSchema, settingsValuesSchema } from '../settings'
import { BACKUP_ID_PATTERN, backupSummarySchema, databaseHealthSchema } from '../domain/health'
import {
  ingredientDetailSchema,
  ingredientInputSchema,
  ingredientSummarySchema,
  productInputSchema,
  productSchema,
  quickIdeaSchema,
  recipeComputationSchema,
  recipeDetailSchema,
  recipeInputSchema,
  recipeSummarySchema,
  STATUS_VALUES,
} from '../domain/catalog'
import { categorySchema, glassSchema, iceTypeSchema } from '../domain/reference'
import { noteHitSchema, searchHitSchema, SEARCH_ENTITIES } from '../domain/search'
import { recipeFacetsSchema } from '../domain/facets'
import { PHOTO_OWNERS, photoContentSchema, photoPathSchema, storedPhotoPathSchema } from '../domain/photos'
import { TRASH_KINDS, trashSchema } from '../domain/trash'
import { referenceZonesSchema } from '../domain/zones'
import { updateStateSchema, VERSION_PATTERN } from '../domain/updates'
import {
  notebookEntrySchema,
  notebookInputSchema,
  tastingInputSchema,
  tastingNoteSchema,
} from '../domain/journal'
import {
  BATCH_STATUSES,
  batchInputSchema,
  batchSchema,
  collectionDetailSchema,
  collectionInputSchema,
  collectionItemInputSchema,
  collectionSummarySchema,
  practiceCorpusSchema,
  practiceFinishSchema,
  practiceSessionSchema,
  prepOverviewSchema,
} from '../domain/workshop'
import type { IpcChannel } from './channels'

/**
 * Single IPC contract. Each operation declares its input schema (validated in the main
 * process before anything touches the database or the disk) and its output schema.
 *
 * Rules for every schema added here:
 * - strings carry a `.max()`, arrays a `.max()`;
 * - objects are `.strict()` so unknown keys are refused;
 * - operations without input use `noInput`.
 */
export const noInput = z.undefined()

export const appVersionSchema = z
  .object({
    version: z.string().max(64),
  })
  .strict()

const idInput = z.object({ id: z.string().min(1).max(36) }).strict()
const done = z.null()

const savedSchema = z.object({ saved: z.boolean() }).strict()

const backupDirectorySchema = z.object({ directory: z.string().max(1024), isDefault: z.boolean() }).strict()

const recipePrintInput = z
  .object({ id: z.string().min(1).max(36), paper: z.enum(RECIPE_PAPERS), indicators: z.boolean() })
  .strict()

const batchPrintInput = z
  .object({
    id: z.string().min(1).max(36),
    to: z.enum(PRINT_TARGETS),
    target: z.enum(BATCH_TARGETS),
    amount: z.number().positive().max(100_000),
    stepMl: z.number().positive().max(1000),
    water: z.boolean(),
    garnish: z.boolean(),
    /** With MANUAL_BATCH_ID as id: the batch written by hand. */
    manual: manualBatchSchema.optional(),
  })
  .strict()

const labelPrintInput = z
  .object({
    id: z.string().min(1).max(36),
    batchId: z.string().min(1).max(36),
    to: z.enum(PRINT_TARGETS),
    format: z.enum(LABEL_FORMAT_VALUES),
    count: z.number().int().min(1).max(MAX_LABELS),
    skip: z.number().int().min(0).max(40),
    allergens: z.boolean(),
  })
  .strict()

const offProductSchema = z
  .object({
    barcode: z.string().max(14),
    name: z.string().max(120).nullable(),
    brand: z.string().max(120).nullable(),
    volumeMl: z.number().int().positive().nullable(),
    abv: z.number().min(0).max(100).nullable(),
    allergens: z.array(z.enum(ALLERGEN_CODES)).max(14),
  })
  .strict()

const tablePreviewSchema = z
  .object({
    table: z.string().max(64),
    total: z.number().int(),
    added: z.number().int(),
    matched: z.number().int(),
    conflicts: z.number().int(),
  })
  .strict()

export type ContractEntry = {
  readonly input: z.ZodType
  readonly output: z.ZodType
}

export const ipcContract = {
  'app.getVersion': { input: noInput, output: appVersionSchema },
  'database.getHealth': { input: noInput, output: databaseHealthSchema },
  'backups.list': { input: noInput, output: z.array(backupSummarySchema).max(1000) },
  'backups.create': { input: noInput, output: backupSummarySchema },
  'backups.restore': {
    input: z.object({ id: z.string().max(64).regex(BACKUP_ID_PATTERN) }).strict(),
    output: backupSummarySchema,
  },
  'reference.listGlasses': { input: noInput, output: z.array(glassSchema).max(500) },
  'reference.listIceTypes': { input: noInput, output: z.array(iceTypeSchema).max(200) },
  'reference.listCategories': { input: noInput, output: z.array(categorySchema).max(2000) },
  'ingredients.list': { input: noInput, output: z.array(ingredientSummarySchema).max(20_000) },
  'ingredients.get': { input: idInput, output: ingredientDetailSchema },
  'ingredients.create': { input: ingredientInputSchema, output: ingredientSummarySchema },
  'ingredients.update': {
    input: z.object({ id: z.string().min(1).max(36), data: ingredientInputSchema }).strict(),
    output: ingredientSummarySchema,
  },
  'ingredients.merge': {
    input: z.object({ sourceId: z.string().min(1).max(36), targetId: z.string().min(1).max(36) }).strict(),
    output: ingredientSummarySchema,
  },
  'ingredients.delete': { input: idInput, output: done },
  'ingredients.setFavorite': {
    input: z.object({ id: z.string().min(1).max(36), favorite: z.boolean() }).strict(),
    output: done,
  },
  'products.listByIngredient': {
    input: z.object({ ingredientId: z.string().min(1).max(36) }).strict(),
    output: z.array(productSchema).max(5000),
  },
  'products.create': { input: productInputSchema, output: productSchema },
  'products.update': {
    input: z.object({ id: z.string().min(1).max(36), data: productInputSchema }).strict(),
    output: productSchema,
  },
  'products.setOwned': {
    input: z.object({ id: z.string().min(1).max(36), owned: z.boolean() }).strict(),
    output: productSchema,
  },
  'products.delete': { input: idInput, output: done },
  'recipes.list': { input: noInput, output: z.array(recipeSummarySchema).max(50_000) },
  'recipes.get': { input: idInput, output: recipeDetailSchema },
  'recipes.create': {
    input: z
      .object({ data: recipeInputSchema, label: z.string().max(120).nullable().default(null) })
      .strict(),
    output: recipeDetailSchema,
  },
  'recipes.update': {
    input: z
      .object({
        id: z.string().min(1).max(36),
        data: recipeInputSchema,
        newVersion: z.boolean().default(true),
        label: z.string().max(120).nullable().default(null),
      })
      .strict(),
    output: recipeDetailSchema,
  },
  'recipes.setStatus': {
    input: z.object({ id: z.string().min(1).max(36), status: z.enum(STATUS_VALUES) }).strict(),
    output: recipeSummarySchema,
  },
  'recipes.setFavorite': {
    input: z.object({ id: z.string().min(1).max(36), favorite: z.boolean() }).strict(),
    output: recipeSummarySchema,
  },
  'recipes.createVariant': {
    input: z.object({ id: z.string().min(1).max(36), name: z.string().trim().min(1).max(120) }).strict(),
    output: recipeDetailSchema,
  },
  'recipes.delete': { input: idInput, output: done },
  'recipes.restore': { input: idInput, output: recipeDetailSchema },
  'recipes.quickIdea': { input: quickIdeaSchema, output: recipeDetailSchema },
  'recipes.compute': {
    input: z.object({ data: recipeInputSchema }).strict(),
    output: recipeComputationSchema,
  },
  /** Opens the file dialog in the main process; the renderer never handles a path. */
  'import.choose': {
    input: noInput,
    output: z
      .object({
        token: z.string().max(64),
        label: z.string().max(200).nullable(),
        tables: z.array(tablePreviewSchema).max(64),
      })
      .strict()
      .nullable(),
  },
  'import.apply': {
    input: z
      .object({
        token: z.string().min(1).max(64),
        strategy: z.enum(['ignore', 'replace', 'duplicate']),
      })
      .strict(),
    output: z
      .object({ inserted: z.number().int(), updated: z.number().int(), skipped: z.number().int() })
      .strict(),
  },
  /** Full archive, or a few recipes to share (section 12.4); the main asks where to save. */
  'export.notebook': {
    input: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('full') }).strict(),
      z
        .object({
          kind: z.literal('partial'),
          recipeIds: z.array(z.string().min(1).max(36)).min(1).max(10_000),
          includePrivate: z.boolean(),
          collectionId: z.string().min(1).max(36).nullable().default(null),
          label: z.string().trim().min(1).max(120).nullable().default(null),
        })
        .strict(),
    ]),
    output: savedSchema,
  },
  'export.csv': {
    input: z.object({ table: z.enum(['recipes', 'journal', 'ingredients']) }).strict(),
    output: savedSchema,
  },
  /** A recipe as Markdown text or as a PNG image (base64), saved where the user chooses. */
  'export.saveFile': {
    input: z
      .object({
        kind: z.enum(['markdown', 'png']),
        name: z.string().trim().min(1).max(120),
        content: z.string().min(1).max(14_000_000),
      })
      .strict(),
    output: savedSchema,
  },
  /** Text to the clipboard: the session refuses the clipboard permission to the renderer. */
  'export.copyText': { input: z.object({ text: z.string().min(1).max(200_000) }).strict(), output: done },
  /** The technical sheet of a recipe (section 12.2), as a PDF or through the system print dialog. */
  'export.recipePdf': { input: recipePrintInput, output: savedSchema },
  'export.printRecipe': { input: recipePrintInput, output: z.object({ printed: z.boolean() }).strict() },
  'export.batch': { input: batchPrintInput, output: z.object({ done: z.boolean() }).strict() },
  'export.labels': { input: labelPrintInput, output: z.object({ done: z.boolean() }).strict() },
  /** GitHub releases (D-051): the main owns the state, the renderer asks for the next step. */
  'updates.status': { input: noInput, output: updateStateSchema },
  'updates.check': { input: noInput, output: updateStateSchema },
  'updates.download': { input: noInput, output: updateStateSchema },
  /** Backs the notebook up, then quits and installs; a failed backup is in the state. */
  'updates.install': { input: noInput, output: updateStateSchema },
  /** A portable copy: opens the page of the release on GitHub (D-055). */
  'updates.openRelease': { input: noInput, output: updateStateSchema },
  'updates.skip': {
    input: z.object({ version: z.string().regex(VERSION_PATTERN) }).strict(),
    output: updateStateSchema,
  },
  'off.status': { input: noInput, output: z.object({ enabled: z.boolean() }).strict() },
  'off.setEnabled': { input: z.object({ enabled: z.boolean() }).strict(), output: done },
  /** Bottle lookup by barcode on Open Food Facts (section 9); refused when turned off. */
  'off.lookup': {
    input: z
      .object({
        barcode: z.string().regex(/^\d{6,14}$/),
      })
      .strict(),
    output: z.object({ product: offProductSchema.nullable() }).strict(),
  },
  /** Ctrl+K search over recipes, ingredients and bottles (section 12.1). */
  'search.query': {
    input: z
      .object({ text: z.string().max(200), limit: z.number().int().min(1).max(50).default(20) })
      .strict(),
    output: z.array(searchHitSchema).max(50),
  },
  'search.notes': {
    input: z
      .object({ text: z.string().max(200), limit: z.number().int().min(1).max(20).default(6) })
      .strict(),
    output: z.array(noteHitSchema).max(20),
  },
  'search.rebuild': { input: noInput, output: z.object({ count: z.number().int() }).strict() },
  'photos.get': {
    input: z.object({ owner: z.enum(PHOTO_OWNERS), id: z.string().min(1).max(36) }).strict(),
    output: z.object({ path: storedPhotoPathSchema }).strict(),
  },
  'photos.set': {
    input: z
      .object({
        owner: z.enum(PHOTO_OWNERS),
        id: z.string().min(1).max(36),
        content: photoContentSchema.nullable(),
      })
      .strict(),
    output: z.object({ previous: storedPhotoPathSchema, path: storedPhotoPathSchema }).strict(),
  },
  'photos.restore': {
    input: z
      .object({ owner: z.enum(PHOTO_OWNERS), id: z.string().min(1).max(36), path: photoPathSchema })
      .strict(),
    output: done,
  },
  'trash.list': { input: noInput, output: trashSchema },
  'trash.restore': {
    input: z.object({ kind: z.enum(TRASH_KINDS), id: z.string().min(1).max(36) }).strict(),
    output: done,
  },
  'trash.empty': { input: noInput, output: z.object({ removed: z.number().int() }).strict() },
  'database.reset': {
    input: z.object({ confirm: z.literal('reset') }).strict(),
    output: backupSummarySchema,
  },
  'recentViews.record': {
    input: z.object({ entityType: z.enum(SEARCH_ENTITIES), entityId: z.string().min(1).max(36) }).strict(),
    output: done,
  },
  /** Preparation mode (section 10.12): full screen and screen kept awake, or back to normal. */
  'app.setPrepMode': { input: z.object({ active: z.boolean() }).strict(), output: done },
  /** Opens the folder of the local logs (section 13.3, « À propos »). */
  'app.openLogs': { input: noInput, output: done },
  'settings.getAll': { input: noInput, output: settingsValuesSchema },
  'settings.set': { input: settingChangeSchema, output: done },
  'backups.directory': { input: noInput, output: backupDirectorySchema },
  /** Folder dialog of the main; null when the user cancels. */
  'backups.chooseDirectory': { input: noInput, output: backupDirectorySchema.nullable() },
  'backups.useDefaultDirectory': { input: noInput, output: backupDirectorySchema },
  /** Snapshot of a past version, for the lab comparison (section 10.5). */
  'recipes.getVersion': {
    input: z
      .object({ id: z.string().min(1).max(36), version: z.number().int().min(1).max(100_000) })
      .strict(),
    output: recipeDetailSchema,
  },
  /** Reference zones of each family (section 8), cached until a recipe or an ingredient changes. */
  'recipes.referenceZones': { input: noInput, output: referenceZonesSchema },
  'recipes.facets': { input: noInput, output: z.array(recipeFacetsSchema).max(50_000) },
  /** Tasting journal (section 10.6). */
  'tastingNotes.list': {
    input: z
      .object({ recipeId: z.string().min(1).max(36).optional(), toRetest: z.boolean().optional() })
      .strict()
      .default({}),
    output: z.array(tastingNoteSchema).max(100_000),
  },
  'tastingNotes.create': { input: tastingInputSchema, output: tastingNoteSchema },
  'tastingNotes.update': {
    input: z.object({ id: z.string().min(1).max(36), data: tastingInputSchema }).strict(),
    output: tastingNoteSchema,
  },
  'tastingNotes.setNextStepDone': {
    input: z.object({ id: z.string().min(1).max(36), done: z.boolean() }).strict(),
    output: tastingNoteSchema,
  },
  'tastingNotes.delete': { input: idInput, output: done },
  /** Notebook (section 10.7). */
  'notebook.list': { input: noInput, output: z.array(notebookEntrySchema).max(100_000) },
  'notebook.create': { input: notebookInputSchema, output: notebookEntrySchema },
  'notebook.update': {
    input: z.object({ id: z.string().min(1).max(36), data: notebookInputSchema }).strict(),
    output: notebookEntrySchema,
  },
  'notebook.delete': { input: idInput, output: done },
  /** Homemade preparations and their batches (section 10.9). */
  'preps.list': { input: noInput, output: z.array(prepOverviewSchema).max(5000) },
  'batches.create': { input: batchInputSchema, output: batchSchema },
  'batches.setStatus': {
    input: z.object({ id: z.string().min(1).max(36), status: z.enum(BATCH_STATUSES) }).strict(),
    output: batchSchema,
  },
  'batches.delete': { input: idInput, output: done },
  /** Collections (section 10.10). */
  'collections.list': { input: noInput, output: z.array(collectionSummarySchema).max(5000) },
  'collections.get': { input: idInput, output: collectionDetailSchema },
  'collections.create': { input: collectionInputSchema, output: collectionSummarySchema },
  'collections.update': {
    input: z.object({ id: z.string().min(1).max(36), data: collectionInputSchema }).strict(),
    output: collectionSummarySchema,
  },
  'collections.delete': { input: idInput, output: done },
  'collections.restore': { input: idInput, output: collectionSummarySchema },
  'collections.addRecipes': {
    input: z
      .object({
        id: z.string().min(1).max(36),
        recipeIds: z.array(z.string().min(1).max(36)).min(1).max(500),
      })
      .strict(),
    output: collectionSummarySchema,
  },
  'collections.updateItem': { input: collectionItemInputSchema, output: done },
  'collections.removeItem': { input: idInput, output: done },
  'collections.restoreItem': { input: idInput, output: done },
  'collections.reorder': {
    input: z
      .object({ id: z.string().min(1).max(36), itemIds: z.array(z.string().min(1).max(36)).max(5000) })
      .strict(),
    output: done,
  },
  /** Asks where to save, then writes the PDF; false when the user cancels. */
  'collections.exportPdf': { input: idInput, output: z.boolean() },
  /** Revision (section 10.11). */
  'practice.corpus': { input: idInput, output: practiceCorpusSchema },
  'practice.weakKeys': { input: noInput, output: z.array(z.string().max(200)).max(100_000) },
  'practice.finish': { input: practiceFinishSchema, output: practiceSessionSchema },
  'practice.history': { input: noInput, output: z.array(practiceSessionSchema).max(10_000) },
} as const satisfies Record<IpcChannel, ContractEntry>

export type IpcContract = typeof ipcContract
export type IpcInput<C extends IpcChannel> = z.input<IpcContract[C]['input']>
export type IpcParsedInput<C extends IpcChannel> = z.output<IpcContract[C]['input']>
export type IpcOutput<C extends IpcChannel> = z.output<IpcContract[C]['output']>
