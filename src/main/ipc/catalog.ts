import { recipeInputSchema } from '../../shared/domain/catalog'
import type { Db } from '../db/client'
import { systemIds } from '../db/client'
import { computeRecipe } from '../db/facts'
import type { DatabaseManager } from '../db/manager'
import { IngredientRepository } from '../db/repositories/ingredients'
import { ProductRepository } from '../db/repositories/products'
import { RecipeRepository } from '../db/repositories/recipes'
import { DomainError } from '../errors'
import type { IpcHandlers } from './dispatch'

type CatalogChannels = Extract<
  keyof IpcHandlers,
  `ingredients.${string}` | `products.${string}` | `recipes.${string}`
>

/** Ingredients, bottles and recipes (phase 3). Repositories are built on the ready database. */
export function createCatalogHandlers(manager: DatabaseManager): Pick<IpcHandlers, CatalogChannels> {
  const ids = systemIds()
  const db = (): Db => {
    if (manager.status !== 'ready') throw new DomainError('UNAVAILABLE', 'Database is not ready')
    return manager.db
  }
  const ingredientsRepo = () => new IngredientRepository(db(), ids)
  const productsRepo = () => new ProductRepository(db(), ids)
  const recipesRepo = () => new RecipeRepository(db(), ids, ingredientsRepo())

  return {
    'ingredients.list': () => ingredientsRepo().list(),
    'ingredients.get': ({ id }) => ingredientsRepo().get(id),
    'ingredients.create': (data) => ingredientsRepo().create(data),
    'ingredients.update': ({ id, data }) => ingredientsRepo().update(id, data),
    'ingredients.merge': ({ sourceId, targetId }) => ingredientsRepo().merge(sourceId, targetId),
    'ingredients.delete': ({ id }) => {
      ingredientsRepo().delete(id)
      return null
    },
    'ingredients.setFavorite': ({ id, favorite }) => {
      ingredientsRepo().setFavorite(id, favorite)
      return null
    },
    'products.listByIngredient': ({ ingredientId }) => productsRepo().listByIngredient(ingredientId),
    'products.create': (data) => productsRepo().create(data),
    'products.update': ({ id, data }) => productsRepo().update(id, data),
    'products.setOwned': ({ id, owned }) => productsRepo().setOwned(id, owned),
    'products.delete': ({ id }) => {
      productsRepo().delete(id)
      return null
    },
    'recipes.list': () => recipesRepo().list(),
    'recipes.get': ({ id }) => recipesRepo().get(id),
    'recipes.create': ({ data, label }) => recipesRepo().create(data, { label }),
    'recipes.update': ({ id, data, newVersion, label }) =>
      recipesRepo().update(id, data, { newVersion, label }),
    'recipes.setStatus': ({ id, status }) => recipesRepo().setStatus(id, status),
    'recipes.setFavorite': ({ id, favorite }) => recipesRepo().setFavorite(id, favorite),
    'recipes.createVariant': ({ id, name }) => recipesRepo().createVariant(id, name),
    'recipes.delete': ({ id }) => {
      recipesRepo().delete(id)
      return null
    },
    'recipes.restore': ({ id }) => recipesRepo().restore(id),
    'recipes.quickIdea': (data) => recipesRepo().quickIdea(data),
    'recipes.compute': ({ data }) =>
      computeRecipe(db(), { id: 'draft', data: recipeInputSchema.parse(data) }),
  }
}
