import { z } from 'zod'
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
} as const satisfies Record<IpcChannel, ContractEntry>

export type IpcContract = typeof ipcContract
export type IpcInput<C extends IpcChannel> = z.input<IpcContract[C]['input']>
export type IpcParsedInput<C extends IpcChannel> = z.output<IpcContract[C]['input']>
export type IpcOutput<C extends IpcChannel> = z.output<IpcContract[C]['output']>
