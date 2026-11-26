import type { ScreenId } from '@renderer/app/navigation'

const NBSP = String.fromCharCode(0xa0)
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`

export type GuidePageId = 'start' | ScreenId | 'detail' | 'editor' | 'prepare' | 'print'

type GuidePage = {
  title: string
  intro: string
  /** What can be done, in the order one does it. */
  points: readonly string[]
  keys: readonly { keys: string; does: string }[]
}

const pages: Record<GuidePageId, GuidePage> = {
  start: {
    title: 'Premiers pas',
    intro:
      'Shakery est un carnet de bar : les classiques, les créations, les ingrédients du bar et leur révision.',
    points: [
      'Une lettre tapée sur n’importe quel écran, ou Ctrl K, ouvre la recherche d’une fiche, d’un ingrédient, d’une bouteille, d’une note ou d’une dégustation.',
      'Ctrl K lance aussi les actions : ouvrir une fiche dans l’atelier, la comparer avec une autre, l’imprimer, noter une dégustation.',
      'Une faute de frappe n’empêche pas de trouver.',
      'Une idée se note dès qu’elle arrive, avec le bouton Idée rapide en haut ou Ctrl N. Un nom suffit, et le reste viendra dans l’atelier.',
      'Le bouton Aide, ou F1, explique chaque détail de l’écran affiché, même pendant une saisie.',
      'La barre latérale range les écrans en trois groupes, Création, Bar et Outils, avec les paramètres en bas. Elle se réduit aux icônes ou se ferme complètement, et le bouton Menu la rouvre.',
      'Le thème se règle dans les paramètres.',
      'La fenêtre se déplace en la tirant par les zones vides du haut.',
    ],
    keys: [
      { keys: 'Ctrl K', does: 'chercher' },
      { keys: 'Ctrl N', does: 'noter une idée' },
      { keys: 'F1', does: 'expliquer l’écran affiché' },
      { keys: 'Ctrl B', does: 'fermer ou rouvrir la barre latérale' },
      { keys: '?', does: 'voir tous les raccourcis' },
    ],
  },
  home: {
    title: 'Accueil',
    intro: 'L’accueil montre où en sont les créations, en un coup d’œil.',
    points: [
      'La création en focus montre son statut, sa version, sa dernière note et ses jauges de degré, de sucre et d’acidité.',
      `${quote('À retester')} reprend les prochaines étapes du journal pas encore testées.`,
      `${quote('En cours')} liste les cinq créations les plus récentes.`,
      `À droite, ${quote('Ce soir')} compte les fiches réalisables avec le bar, et ${quote('Préparations en cours')} rappelle les lots avec leur date limite.`,
    ],
    keys: [{ keys: 'Ctrl N', does: 'noter une idée' }],
  },
  recipes: {
    title: 'Fiches',
    intro:
      'Cet écran liste les cocktails et les préparations. Il s’ouvre sur les créations, et les classiques ont leur onglet.',
    points: [
      `Le sélecteur passe de ${quote('Créations')} à ${quote('Classiques')}, ${quote('Favoris')} et ${quote('Réalisables')}.`,
      `Le statut, la famille et le spiritueux restent en vue. ${quote('Plus de filtres')} déplie la méthode, le verre, le profil, la collection, les tags et les allergènes.`,
      'Entrée ou un double clic ouvre une fiche.',
      'Chaque enregistrement crée une version, sauf simple correction. Une variante garde le lien avec sa fiche de départ.',
      'Une variante permet de modifier un classique sans le perdre.',
      'Les valeurs marquées incomplètes attendent un degré, un sucre ou une acidité dans la fiche de l’ingrédient.',
    ],
    keys: [
      { keys: 'Ctrl Maj N', does: 'créer une fiche' },
      { keys: 'Ctrl E', does: 'ouvrir la fiche dans l’atelier' },
    ],
  },
  detail: {
    title: 'Une fiche',
    intro: 'La fiche réunit la recette, ses calculs, ses versions et ses dégustations.',
    points: [
      `Quatre actions restent en vue : Modifier, Atelier, Mode préparation et Noter une dégustation. Le menu ${quote('Plus')} range la variante, l’ajout à une collection, l’impression, le partage et la suppression.`,
      'Les doses s’affichent dans l’unité choisie dans les paramètres.',
      'La colonne de droite donne les calculs, les versions et les dégustations, et nomme ce qui reste à compléter.',
      'Une photo déposée est gardée sans créer de version.',
    ],
    keys: [
      { keys: 'Ctrl E', does: 'ouvrir dans l’atelier' },
      { keys: 'Ctrl J', does: 'noter une dégustation' },
      { keys: 'Ctrl P', does: 'imprimer' },
      { keys: 'F11', does: 'passer en mode préparation' },
    ],
  },
  editor: {
    title: 'Éditeur de fiche',
    intro: 'Cette page décrit chaque champ d’une fiche, du nom à la conservation.',
    points: [
      'Seuls le nom et l’ingrédient de chaque ligne sont obligatoires.',
      'Un ingrédient inconnu se crée sur place.',
      'Pour une faute de frappe, la case « Simple correction » évite de créer une version.',
    ],
    keys: [
      { keys: 'Ctrl B', does: 'mettre en gras dans un texte' },
      { keys: 'Alt ↑ ↓', does: 'déplacer une ligne' },
    ],
  },
  lab: {
    title: 'Atelier',
    intro: 'L’atelier règle une recette avant de prendre le shaker.',
    points: [
      'Une dose changée fait suivre aussitôt le degré, le sucre, l’acidité et le volume.',
      `La case ${quote('Dans le verre')} retire une ligne des calculs, pour voir le mélange sans elle.`,
      'La bande de chaque jauge est la zone habituelle de la famille, calculée sur les classiques et les fiches finales.',
      'Rien n’est écrit avant un enregistrement, en nouvelle version ou en variante.',
      `${quote('Comparer')} met jusqu’à trois versions côte à côte.`,
    ],
    keys: [
      { keys: 'Ctrl Z', does: 'annuler' },
      { keys: 'Ctrl Y', does: 'rétablir' },
    ],
  },
  journal: {
    title: 'Journal',
    intro: 'Le journal garde chaque essai noté, avec ce qu’il faut tester ensuite.',
    points: [
      'Une dégustation se note sur cinq étoiles et par critère, de trop peu à trop.',
      `La prochaine étape s’affiche sur l’accueil, sous ${quote('À retester')}, tant qu’elle n’est pas testée.`,
      'Le journal se filtre par fiche, par note ou par étapes à retester.',
    ],
    keys: [{ keys: 'Ctrl J', does: 'noter une dégustation' }],
  },
  notebook: {
    title: 'Notes',
    intro: 'Les notes gardent ce qui n’est pas encore une fiche.',
    points: [
      'Une note s’enregistre pendant la saisie.',
      'Le signe @ lie une fiche, un ingrédient ou une bouteille.',
      'Une note se transforme en idée de fiche en un clic.',
    ],
    keys: [{ keys: '@', does: 'insérer un lien' }],
  },
  bar: {
    title: 'Ingrédients',
    intro: 'Cet écran liste les ingrédients du carnet et ce que le bar permet de faire.',
    points: [
      `La case ${quote('Au bar')} de chaque ligne met à jour les fiches réalisables.`,
      `Le sélecteur ${quote('Tout')}, ${quote('Au bar')} ou ${quote('Manquants')} filtre la liste.`,
      'Sans ingrédient choisi, la colonne de droite donne les fiches réalisables ce soir et la liste d’achats.',
      'Dans une bouteille, un code-barres scanné puis Entrée reprend les champs d’Open Food Facts.',
      'Deux ingrédients en double se fusionnent, et les fiches suivent.',
    ],
    keys: [],
  },
  preps: {
    title: 'Préparations',
    intro: 'Cet écran rassemble sirops, cordiaux et autres fabrications maison.',
    points: [
      'Une préparation est une fiche qui sert aussi d’ingrédient.',
      'Chaque fabrication s’enregistre, et sa date limite se calcule avec la conservation fixée sur la fiche.',
      'Les préparations qui ont un lot en cours viennent en tête de la liste.',
      'Les lots en cours remontent sur l’accueil. Le délai d’alerte se règle dans les paramètres.',
    ],
    keys: [],
  },
  collections: {
    title: 'Collections',
    intro: 'Une collection réunit une carte, un concours ou un thème, dans l’ordre voulu.',
    points: [
      'Les fiches s’ajoutent, se rangent avec les flèches et reçoivent chacune un prix et une note.',
      `${quote('Exporter en PDF')} imprime la collection.`,
      `${quote('Préparer')} enchaîne ses fiches en mode préparation.`,
      `${quote('Partager')} crée un fichier .shakery pour un collègue.`,
      `L’onglet ${quote('Réviser')} pose des questions sur la collection.`,
    ],
    keys: [],
  },
  practice: {
    title: 'Révision',
    intro: 'La révision aide à connaître une carte par cœur. Elle est un onglet de chaque collection.',
    points: [
      'Le mode, le nombre de questions et leur ordre se choisissent avant de commencer.',
      'Les questions portent sur les doses, la méthode, le verre, la décoration et les fiches de culture importées.',
      'Les questions ratées peuvent revenir en tête de la séance suivante.',
    ],
    keys: [],
  },
  calculators: {
    title: 'Calculateurs',
    intro: 'Cet écran fait les calculs du bar, seuls ou à partir d’une fiche.',
    points: [
      'Le batch multiplie une recette, avec l’eau de dilution en option.',
      'Le frais reste hors de la bouteille, les bulles s’ajoutent au service.',
      'Les autres calculs portent sur le degré et la dilution d’un mélange, les unités et le coût.',
    ],
    keys: [],
  },
  prepare: {
    title: 'Mode préparation',
    intro: 'La fiche s’affiche en plein écran, lisible à un mètre, pendant la réalisation du cocktail.',
    points: [
      'L’écran ne se met pas en veille.',
      'Un clic sur une étape faite l’estompe.',
      'Les flèches passent d’une fiche à la suivante quand le mode s’ouvre par « Préparer » dans une collection.',
    ],
    keys: [
      { keys: 'F11', does: 'ouvrir depuis une fiche' },
      { keys: 'Échap', does: 'quitter' },
    ],
  },
  print: {
    title: 'Imprimer et partager',
    intro: 'Une fiche sort sur papier, en PDF, en image ou en texte.',
    points: [
      `${quote('Imprimer')} donne une fiche technique A4 ou A5, avec ou sans indicateurs.`,
      `${quote('Partager')} copie la fiche en Markdown, l’enregistre en image ou crée un fichier .shakery.`,
      'Les dégustations, les notes et les prix des bouteilles ne partent que si leur case est cochée.',
    ],
    keys: [{ keys: 'Ctrl P', does: 'imprimer la fiche affichée' }],
  },
  settings: {
    title: 'Paramètres',
    intro: 'Cet écran regroupe les réglages, les sauvegardes et les données, avec un sommaire à gauche.',
    points: [
      'Le thème, l’unité des doses, les animations et l’alerte des préparations se règlent ici.',
      'Le dossier des sauvegardes se choisit ici, et une sauvegarde se fait ou se restaure tout de suite. Le carnet actuel est sauvegardé avant chaque restauration.',
      'Le carnet entier s’exporte pour passer sur un autre ordinateur.',
      'Deux fonctions seulement utilisent Internet, Open Food Facts et la recherche des mises à jour. Chacune se coupe ici.',
    ],
    keys: [],
  },
}

/** The short user guide, one page per screen (section 13.4). */
export const guide = {
  title: 'Guide',
  subtitle: 'Une page par écran',
  detail: 'Dans le détail',
  contents: 'Pages du guide',
  keys: 'Au clavier',
  previous: 'Page précédente',
  next: 'Page suivante',
  open: 'Ouvrir cet écran',
  pages,
} as const
