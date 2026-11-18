/**
 * Reference data shipped with the application, bundled into the main process at build
 * time from the reviewed JSON files of data/seed/ (section 9). Validated again by
 * `loadSeedData` before anything is written.
 */
import categories from '../../../data/seed/categories.json'
import glasses from '../../../data/seed/glasses.json'
import ice from '../../../data/seed/ice.json'
import ingredients from '../../../data/seed/ingredients.json'
import recipes from '../../../data/seed/recipes.json'
import type { SeedData } from './load'

export const BUNDLED_SEED: SeedData = {
  categories: categories as SeedData['categories'],
  glasses: glasses,
  ice: ice,
  ingredients: ingredients as SeedData['ingredients'],
  recipes: recipes as SeedData['recipes'],
}
