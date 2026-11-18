/**
 * Closed list of IPC operations, named `domain.operation`.
 *
 * This file has no dependency on purpose: the sandboxed preload imports it to build
 * `window.shakery`, and must stay free of third-party code. The Zod schemas of each
 * operation live in `contract.ts`, which is checked to cover exactly this list.
 */
export const IPC_CHANNELS = [
  'app.getVersion',
  'database.getHealth',
  'backups.list',
  'backups.create',
  'backups.restore',
  'reference.listGlasses',
  'reference.listIceTypes',
  'reference.listCategories',
  'ingredients.list',
  'ingredients.get',
  'ingredients.create',
  'ingredients.update',
  'ingredients.merge',
  'ingredients.delete',
  'ingredients.setFavorite',
  'products.listByIngredient',
  'products.create',
  'products.update',
  'products.setOwned',
  'products.delete',
  'recipes.list',
  'recipes.get',
  'recipes.create',
  'recipes.update',
  'recipes.setStatus',
  'recipes.setFavorite',
  'recipes.createVariant',
  'recipes.delete',
  'recipes.restore',
  'recipes.quickIdea',
  'recipes.compute',
  'import.choose',
  'import.apply',
] as const

export type IpcChannel = (typeof IPC_CHANNELS)[number]

export const IPC_CHANNEL_PATTERN = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/

export function isIpcChannel(value: unknown): value is IpcChannel {
  return typeof value === 'string' && (IPC_CHANNELS as readonly string[]).includes(value)
}
