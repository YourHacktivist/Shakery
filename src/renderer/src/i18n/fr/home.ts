/**
 * Strings of the home screen (section 10.3, D-057). No text addresses the reader (D-058): the
 * actions are infinitives, the states impersonal sentences.
 */
const plural = (count: number, one: string, many: string) => (Math.abs(count) < 2 ? one : many)

/** « le sucre et l’acidité », « le degré, le sucre et l’acidité ». */
function listOf(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names.at(-1) ?? ''}`
}

export const home = {
  title: 'Créations',
  count: (count: number) =>
    count === 0
      ? 'Aucune création en cours'
      : `${count} ${plural(count, 'création en cours', 'créations en cours')}`,
  empty: {
    title: 'Aucune création pour l’instant',
    description:
      'Une idée se note en quelques secondes, avec un nom et deux ingrédients, puis se travaille dans l’atelier.',
    firstIdea: 'Noter une première idée',
  },
  hero: {
    title: 'Atelier',
    description: 'Une création part d’une page blanche ou d’un classique, et ses doses s’ajustent en direct.',
    openLab: 'Ouvrir l’atelier',
    fromClassic: 'Partir d’un classique',
  },
  focus: {
    title: 'Création en focus',
    lastTasting: (when: string, isDate: boolean) =>
      isDate ? `Dernière dégustation le ${when}` : `Dernière dégustation ${when}`,
    neverTasted: 'Pas encore goûtée',
    meta: { status: 'Statut', version: 'Version', rating: 'Dernière note' },
    outOf: '/5',
    lab: 'Atelier',
    taste: 'Noter une dégustation',
    abv: 'Degré',
    sugar: 'Sucre',
    acid: 'Acidité',
    ratio: 'Rapport sucre / acide',
    units: { abv: '% vol.', sugar: 'g / 100 ml', acid: 'g / 100 ml', ratio: 'ratio' },
    zone: (family: string, from: string, to: string) => `Zone ${family} : ${from} à ${to}`,
    noZone: 'La zone de référence apparaît à partir de 5 fiches complètes de la même famille.',
    /** Indicators still unknown, named in the sentence under the gauges. */
    unknown: { abv: 'le degré', sugar: 'le sucre', acid: 'l’acidité' },
    missing: (names: readonly string[]) => {
      const list = listOf(names)
      const verb = names.length < 2 ? 's’affichera' : 's’afficheront'
      return `${list.charAt(0).toLocaleUpperCase('fr')}${list.slice(1)} ${verb} quand les ingrédients de la fiche auront leurs teneurs.`
    },
  },
  retest: {
    title: 'À retester',
    journal: 'Ouvrir le journal',
    empty: 'Rien à retester pour l’instant.',
    from: (version: number) => `Notée après la dégustation de la v${version}`,
    action: 'Retester',
    actionLabel: (name: string) => `Retester ${name}`,
  },
  inProgress: {
    title: 'En cours',
    all: 'Toutes les créations',
    label: 'Créations en cours',
    columns: {
      status: 'Statut',
      name: 'Nom',
      family: 'Famille',
      rating: 'Dernière note',
      activity: 'Dernière activité',
    },
  },
  tonight: {
    title: 'Ce soir',
    makeable: (count: number) =>
      plural(count, 'fiche réalisable avec le bar', 'fiches réalisables avec le bar'),
    none: 'Aucune fiche réalisable avec le bar pour l’instant.',
    firstToBuy: 'À acheter en premier',
    unlocks: (count: number) => `${count} ${plural(count, 'fiche de plus', 'fiches de plus')}`,
    empty: 'Cocher les bouteilles présentes au bar pour voir les fiches réalisables.',
    action: 'Ouvrir les ingrédients',
  },
  preps: {
    title: 'Préparations en cours',
    empty: 'Aucune préparation en cours.',
    hint: 'Les sirops et cordiaux en cours s’afficheront ici avec leur date limite.',
    action: 'Ouvrir les préparations',
  },
} as const
