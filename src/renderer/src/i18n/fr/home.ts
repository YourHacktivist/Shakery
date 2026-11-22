/** Strings of the home screen (section 10.3). */
const NBSP = String.fromCharCode(0xa0)

export const home = {
  caption: 'Aucune création en cours',
  count: (count: number) =>
    count === 0
      ? 'Aucune création en cours'
      : count === 1
        ? '1 création en cours'
        : `${count} créations en cours`,
  favoritesCount: (count: number) =>
    count === 0 ? 'Aucun favori' : count === 1 ? '1 favori' : `${count} favoris`,
  families: 'Familles',
  allFamilies: 'Toutes familles',
  noMatch: 'Aucune création ne correspond à ce filtre.',
  noFavorite: {
    title: 'Aucun favori',
    description: 'Marque une fiche d’une étoile pour la retrouver ici.',
  },
  card: {
    open: (name: string) => `Ouvrir ${name}`,
    lastRating: 'Dernière note',
    outOf: '/5',
    noRating: 'Pas encore goûtée',
    curve: 'Note moyenne au fil des versions',
  },
  title: 'Mes créations',
  views: { current: 'En cours', favorites: 'Favoris' },
  viewsLabel: 'Créations affichées',
  empty: {
    title: 'Ton carnet est vide',
    description: `Note une idée en quelques secondes${NBSP}: un nom, deux ingrédients, c’est tout. Tu la travailleras ensuite dans l’atelier.`,
    firstIdea: 'Noter une première idée',
    classics: 'Parcourir les classiques',
  },
  hero: {
    title: 'Atelier',
    description: 'Pars d’une page blanche ou d’un classique et ajuste les doses en direct.',
    openLab: 'Ouvrir l’atelier',
    noteIdea: 'Noter une idée',
  },
  focus: {
    eyebrow: 'Création en focus',
    lastTasting: (when: string) => `Dernière dégustation ${when}`,
    neverTasted: 'Pas encore goûtée',
    nextStep: 'Prochaine étape',
    nextStepFrom: (version: number) => `Notée après la dégustation de la v${version}`,
    noNextStep: `Aucune prochaine étape${NBSP}: note une dégustation pour en fixer une.`,
    lab: 'Atelier',
    taste: 'Noter une dégustation',
    zone: (family: string, from: string, to: string) => `Zone ${family}${NBSP}: ${from} à ${to}`,
    empty: 'Tes indicateurs apparaîtront ici dès que tu auras goûté une première version.',
    abv: 'Degré',
    sugar: 'Sucre',
    acid: 'Acidité',
    ratio: 'Rapport sucre / acide',
    units: { abv: '% vol.', sugar: 'g / 100 ml', acid: 'g / 100 ml', ratio: 'ratio' },
    zoneNote: `Zone de référence${NBSP}: disponible à partir de 5 fiches complètes`,
  },
} as const
