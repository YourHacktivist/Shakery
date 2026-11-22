import type { ScreenId } from '@renderer/app/navigation'

const NBSP = String.fromCharCode(0xa0)
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`

export type GuidePageId = 'start' | ScreenId | 'prepare' | 'print'

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
    intro: 'Shakery est ton carnet de bar : les classiques, tes créations, ton bar et tes révisions.',
    points: [
      'Tape une lettre sur n’importe quel écran, ou Ctrl K, pour chercher une fiche, un ingrédient, une bouteille ou une note du carnet et du journal.',
      'Ctrl K lance aussi les actions : ouvrir une fiche dans l’atelier, la comparer avec une autre, l’imprimer, noter une dégustation.',
      'Une faute de frappe n’empêche pas de trouver.',
      'Note une idée dès qu’elle arrive : un nom suffit, le reste viendra dans l’atelier.',
      'Le bouton soleil ou lune, en haut, change de thème.',
      'Déplace la fenêtre en la tirant par les zones vides du haut.',
    ],
    keys: [
      { keys: 'Ctrl K', does: 'chercher' },
      { keys: 'Ctrl N', does: 'noter une idée' },
      { keys: '?', does: 'voir tous les raccourcis' },
    ],
  },
  home: {
    title: 'Accueil',
    intro: 'Où en sont tes créations, en un coup d’œil.',
    points: [
      'Tes trois créations les plus récentes, avec la courbe de leurs notes.',
      `Bascule entre ${quote('En cours')} et ${quote('Favoris')}, ou filtre par famille.`,
      'La création en focus montre son degré, son sucre, son acidité et la prochaine étape à tester.',
    ],
    keys: [{ keys: 'Ctrl N', does: 'noter une idée' }],
  },
  recipes: {
    title: 'Fiches',
    intro: 'Tous les cocktails et toutes les préparations, les tiens et les classiques.',
    points: [
      'Filtre par statut, famille, origine, méthode, favoris ou fiches réalisables avec ton bar.',
      'Ouvre une fiche avec Entrée ou un double clic.',
      'Chaque modification crée une version, que tu peux comparer. Une variante garde le lien avec sa fiche de départ.',
      'Pour modifier un classique sans le perdre, crée une variante.',
      'Les valeurs marquées incomplètes attendent un degré, un sucre ou une acidité dans la fiche de l’ingrédient.',
    ],
    keys: [
      { keys: 'Ctrl Maj N', does: 'créer une fiche' },
      { keys: 'Ctrl E', does: 'ouvrir la fiche dans l’atelier' },
    ],
  },
  lab: {
    title: 'Atelier',
    intro: 'Règle une recette avant de prendre le shaker.',
    points: [
      'Change une dose : degré, sucre, acidité et volume suivent aussitôt.',
      'Coupe une ligne avec son interrupteur pour voir le mélange sans elle.',
      'La bande de chaque jauge est la zone habituelle de la famille, calculée sur tes fiches complètes.',
      'Enregistre en nouvelle version ou en variante. Rien n’est écrit avant.',
      `${quote('Comparer')} met jusqu’à trois versions côte à côte.`,
    ],
    keys: [
      { keys: 'Ctrl Z', does: 'annuler' },
      { keys: 'Ctrl Y', does: 'rétablir' },
    ],
  },
  journal: {
    title: 'Journal',
    intro: 'Chaque essai noté, avec ce qu’il faut tester ensuite.',
    points: [
      'Note sur cinq étoiles et par critère, de trop peu à trop.',
      'Écris la prochaine étape : elle s’affiche dans la barre latérale tant qu’elle n’est pas testée.',
      'Filtre par fiche, par note ou par étapes à retester.',
    ],
    keys: [{ keys: 'Ctrl J', does: 'noter une dégustation' }],
  },
  notebook: {
    title: 'Carnet',
    intro: 'Les notes libres qui ne sont pas encore des fiches.',
    points: [
      'La note s’enregistre pendant que tu écris.',
      'Tape @ pour lier une fiche, un ingrédient ou une bouteille.',
      'Transforme une note en idée de fiche en un clic.',
    ],
    keys: [{ keys: '@', does: 'insérer un lien' }],
  },
  bar: {
    title: 'Mon bar',
    intro: 'Tes bouteilles, et ce que tu peux faire avec.',
    points: [
      `Coche ${quote('Je l’ai')} : les fiches réalisables se mettent à jour.`,
      'La liste d’achats classe les ingrédients qui débloquent le plus de fiches.',
      'Dans une bouteille, scanne le code-barres puis Entrée pour reprendre les champs d’Open Food Facts.',
      'Fusionne deux ingrédients en double : les fiches suivent.',
    ],
    keys: [],
  },
  preps: {
    title: 'Préparations',
    intro: 'Sirops, cordiaux et autres fabrications maison.',
    points: [
      'Une préparation est une fiche qui sert aussi d’ingrédient.',
      'Enregistre chaque fabrication : sa date limite se calcule avec la conservation que tu as fixée.',
      'Celles qui expirent bientôt remontent dans la barre latérale. Le délai se règle dans les paramètres.',
    ],
    keys: [],
  },
  collections: {
    title: 'Collections',
    intro: 'Une carte, un concours ou un thème, dans l’ordre que tu veux.',
    points: [
      'Ajoute des fiches, range-les avec les flèches, donne un prix et une note à chacune.',
      'Exporte la collection en PDF.',
      `${quote('Partager')} crée un fichier .shakery pour un collègue.`,
      `${quote('Réviser')} lance les questions sur la collection.`,
    ],
    keys: [],
  },
  practice: {
    title: 'Révision',
    intro: 'Connaître une carte par cœur.',
    points: [
      'Choisis une collection et le type de séance.',
      'Les questions portent sur les doses, la méthode, le verre, la décoration et tes fiches de culture.',
      'Les erreurs reviennent dans la séance des points à revoir.',
    ],
    keys: [],
  },
  calculators: {
    title: 'Calculateurs',
    intro: 'Les calculs du bar, seuls ou à partir d’une fiche.',
    points: [
      'Batch : multiplie une recette et ajoute l’eau de dilution si tu veux.',
      'Les ingrédients gazeux ou frais sont signalés à ajouter au service.',
      'Degré et dilution d’un mélange, conversion d’unités et coût.',
    ],
    keys: [],
  },
  prepare: {
    title: 'Mode préparation',
    intro: 'La fiche en plein écran, lisible à un mètre, pendant que tu réalises le cocktail.',
    points: [
      'L’écran ne se met pas en veille.',
      'Coche les étapes au fur et à mesure.',
      'Les flèches passent d’une fiche à la suivante quand tu viens d’une collection.',
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
      'Tes dégustations, tes notes et les prix de tes bouteilles ne partent que si tu coches la case.',
    ],
    keys: [{ keys: 'Ctrl P', does: 'imprimer la fiche affichée' }],
  },
  settings: {
    title: 'Paramètres',
    intro: 'Les réglages, les sauvegardes et tes données.',
    points: [
      'Thème, unité des doses, animations et alerte des préparations.',
      'Choisis le dossier des sauvegardes, sauvegarde tout de suite ou restaure. Le carnet actuel est sauvegardé avant chaque restauration.',
      'Exporte tout le carnet pour le passer sur un autre ordinateur.',
      'Open Food Facts est la seule fonction qui utilise Internet, et elle se coupe ici.',
    ],
    keys: [],
  },
}

/** The short user guide, one page per screen (section 13.4). */
export const guide = {
  title: 'Guide',
  subtitle: 'Une page par écran',
  contents: 'Pages du guide',
  keys: 'Au clavier',
  previous: 'Page précédente',
  next: 'Page suivante',
  open: 'Ouvrir cet écran',
  pages,
} as const
