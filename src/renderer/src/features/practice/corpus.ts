/** Raw revision data of a collection, written in French for the question generators of core/. */
import type { PracticeCorpus, PracticeStrings } from '@core/practice'
import { formatDose } from '@renderer/features/recipes/model'
import { fr } from '@renderer/i18n/fr'
import { formatNumber } from '@renderer/lib/format'
import type { PracticeCorpusData } from '@shared/domain/workshop'

const r = fr.recipes

export const PRACTICE_STRINGS: PracticeStrings = fr.workshop.practice.prompts

function dose(line: PracticeCorpusData['recipes'][number]['lines'][number]): string | null {
  if (line.doseText !== null && line.doseText.trim() !== '') return line.doseText
  if (line.quantity === null || line.unit === 'top' || line.unit === 'to_taste') return null
  return formatDose({ quantity: line.quantity, unit: line.unit, topEstimateMl: null })
}

export function toPracticeCorpus(data: PracticeCorpusData): PracticeCorpus {
  return {
    recipes: data.recipes.map((recipe) => ({
      id: recipe.id,
      subjectType: recipe.subjectType,
      name: recipe.name,
      lines: recipe.lines.map((line) => ({ id: line.id, label: line.label, dose: dose(line) })),
      method: recipe.methodLabel ?? (recipe.method ? r.methods[recipe.method] : null),
      glass: recipe.glass,
      ice: recipe.ice,
      garnish: recipe.garnish,
      steps: recipe.steps,
      length: recipe.drinkLength ? r.lengths[recipe.drinkLength] : null,
      moment: recipe.servingMoment ? r.moments[recipe.servingMoment] : null,
      family: recipe.familyLabel ?? (recipe.family ? r.families[recipe.family] : null),
      statedAbv:
        recipe.statedAbvPct === null ? null : fr.workshop.practice.abv(formatNumber(recipe.statedAbvPct, 1)),
    })),
    sheets: data.sheets,
    rows: data.rows,
  }
}
