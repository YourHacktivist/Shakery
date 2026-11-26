/**
 * The detailed help (D-048): one topic for each screen, read by the Aide button and by the guide.
 * A screen without its topic does not compile (app/help.ts maps every scene to one).
 */
import { general } from './general'
import type { HelpTopic } from './model'
import { home, notebook, tastings } from './notes'
import { lab, prepare, print, recipeDetail, recipeEditor, recipes } from './recipes'
import { guideHelp, settings } from './settings'
import { bar, calculators, collections, practice, preps } from './workshop'

export type { HelpItem, HelpSection, HelpTopic } from './model'

const topics = {
  home,
  recipes,
  detail: recipeDetail,
  editor: recipeEditor,
  lab,
  journal: tastings,
  notebook,
  bar,
  preps,
  collections,
  practice,
  calculators,
  settings,
  guide: guideHelp,
  prepare,
  print,
  general,
} satisfies Record<string, HelpTopic>

export type HelpTopicId = keyof typeof topics

export const help = {
  title: 'Aide',
  description:
    'L’aide explique chaque champ, bouton, calcul et raccourci. Échap revient à l’écran en cours, sans rien perdre.',
  topic: 'Écran expliqué',
  search: 'Chercher dans toute l’aide',
  searchPlaceholder: 'Par exemple, dilution, allergène, corbeille',
  contents: 'Sections de cette aide',
  everywhere: 'Résultats dans toute l’aide',
  none: 'Rien dans l’aide pour ces mots.',
  found: (count: number) => (count === 1 ? '1 réponse' : `${count} réponses`),
  topics,
} as const
