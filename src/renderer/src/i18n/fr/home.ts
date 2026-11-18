/** Strings of the home screen (section 10.3). */
const NBSP = String.fromCharCode(0xa0)

export const home = {
  caption: 'Aucune création en cours',
  title: 'Mes créations',
  views: { current: 'En cours', favorites: 'Favoris' },
  viewsLabel: 'Créations affichées',
  empty: {
    title: 'Ton carnet est vide',
    description: `Note une idée en quelques secondes${NBSP}: un nom, deux ingrédients, c’est tout. Tu la travailleras ensuite dans l’atelier.`,
    firstIdea: 'Noter une première idée',
    classics: 'Parcourir les classiques IBA',
  },
  hero: {
    title: 'Atelier',
    description: 'Pars d’une page blanche ou d’un classique et ajuste les doses en direct.',
    openLab: 'Ouvrir l’atelier',
    noteIdea: 'Noter une idée',
  },
  focus: {
    eyebrow: 'Création en focus',
    empty: 'Tes indicateurs apparaîtront ici dès que tu auras goûté une première version.',
    abv: 'Degré',
    sugar: 'Sucre',
    acid: 'Acidité',
    ratio: 'Rapport sucre / acide',
    units: { abv: '% vol.', sugar: 'g / 100 ml', acid: 'g / 100 ml', ratio: 'ratio' },
    zoneNote: `Zone de référence${NBSP}: disponible à partir de 5 fiches complètes`,
  },
} as const
