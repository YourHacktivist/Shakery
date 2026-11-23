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
    intro: 'Shakery est ton carnet de bar : les classiques, tes créations, ton bar et tes révisions.',
    points: [
      'Tape une lettre sur n’importe quel écran, ou Ctrl K, pour chercher une fiche, un ingrédient, une bouteille ou une note du carnet et du journal.',
      'Ctrl K lance aussi les actions : ouvrir une fiche dans l’atelier, la comparer avec une autre, l’imprimer, noter une dégustation.',
      'Une faute de frappe n’empêche pas de trouver.',
      'Note une idée dès qu’elle arrive. Un nom suffit, et le reste viendra dans l’atelier.',
      'Le bouton soleil ou lune, en haut, change de thème.',
      'Le bouton Aide, ou F1, explique chaque détail de l’écran affiché, même pendant une saisie.',
      'La barre latérale se réduit aux icônes ou se ferme complètement. Le bouton Menu la rouvre.',
      'Déplace la fenêtre en la tirant par les zones vides du haut.',
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
    intro: 'L’accueil montre où en sont tes créations, en un coup d’œil.',
    points: [
      'Tes trois créations les plus récentes s’affichent avec la courbe de leurs notes.',
      `Bascule entre ${quote('En cours')} et ${quote('Favoris')}, ou filtre par famille.`,
      'La création en focus montre son degré, son sucre, son acidité et la prochaine étape à tester.',
    ],
    keys: [{ keys: 'Ctrl N', does: 'noter une idée' }],
  },
  recipes: {
    title: 'Fiches',
    intro: 'Cet écran liste tous les cocktails et toutes les préparations, les tiens et les classiques.',
    points: [
      'Filtre par statut, famille, origine, méthode, spiritueux, verre, profil, collection, tag ou allergène, et par favoris ou fiches réalisables.',
      'Ouvre une fiche avec Entrée ou un double clic.',
      'Chaque enregistrement crée une version, sauf simple correction. Une variante garde le lien avec sa fiche de départ.',
      'Pour modifier un classique sans le perdre, crée une variante.',
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
      'Les doses s’affichent dans l’unité choisie dans les paramètres.',
      'Le panneau Calculs donne degré, volume, sucre, acidité, coût et allergènes, et dit ce qui manque.',
      'Dépose une photo : elle est gardée sans créer de version.',
      'Depuis la fiche, ouvre l’atelier, le mode préparation, la dégustation, l’impression ou le partage.',
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
      'Pour une faute de frappe, coche « Simple correction » afin de ne pas créer de version.',
    ],
    keys: [
      { keys: 'Ctrl B', does: 'mettre en gras dans un texte' },
      { keys: 'Alt ↑ ↓', does: 'déplacer une ligne' },
    ],
  },
  lab: {
    title: 'Atelier',
    intro: 'Règle une recette avant de prendre le shaker.',
    points: [
      'Change une dose : degré, sucre, acidité et volume suivent aussitôt.',
      'Coupe une ligne avec son interrupteur pour voir le mélange sans elle.',
      'La bande de chaque jauge est la zone habituelle de la famille, calculée sur les classiques et tes fiches finales.',
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
    intro: 'Le journal garde chaque essai noté, avec ce qu’il faut tester ensuite.',
    points: [
      'Note sur cinq étoiles et par critère, de trop peu à trop.',
      'Écris la prochaine étape : elle s’affiche dans la barre latérale tant qu’elle n’est pas testée.',
      'Filtre par fiche, par note ou par étapes à retester.',
    ],
    keys: [{ keys: 'Ctrl J', does: 'noter une dégustation' }],
  },
  notebook: {
    title: 'Carnet',
    intro: 'Le carnet garde les notes libres qui ne sont pas encore des fiches.',
    points: [
      'La note s’enregistre pendant que tu écris.',
      'Tape @ pour lier une fiche, un ingrédient ou une bouteille.',
      'Transforme une note en idée de fiche en un clic.',
    ],
    keys: [{ keys: '@', does: 'insérer un lien' }],
  },
  bar: {
    title: 'Mon bar',
    intro: 'Cet écran montre tes bouteilles et ce que tu peux faire avec.',
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
    intro: 'Cet écran rassemble sirops, cordiaux et autres fabrications maison.',
    points: [
      'Une préparation est une fiche qui sert aussi d’ingrédient.',
      'Enregistre chaque fabrication : sa date limite se calcule avec la conservation que tu as fixée.',
      'Celles qui expirent bientôt remontent dans la barre latérale. Le délai se règle dans les paramètres.',
    ],
    keys: [],
  },
  collections: {
    title: 'Collections',
    intro: 'Une collection réunit une carte, un concours ou un thème, dans l’ordre que tu veux.',
    points: [
      'Ajoute des fiches, range-les avec les flèches, donne un prix et une note à chacune.',
      'Exporte la collection en PDF.',
      `${quote('Préparer')} enchaîne ses fiches en mode préparation.`,
      `${quote('Partager')} crée un fichier .shakery pour un collègue.`,
      `${quote('Réviser')} lance les questions sur la collection.`,
    ],
    keys: [],
  },
  practice: {
    title: 'Révision',
    intro: 'La révision t’aide à connaître une carte par cœur.',
    points: [
      'Choisis une collection et le type de séance.',
      'Les questions portent sur les doses, la méthode, le verre, la décoration et les fiches de culture importées.',
      'Les erreurs reviennent en tête de la séance suivante.',
    ],
    keys: [],
  },
  calculators: {
    title: 'Calculateurs',
    intro: 'Cet écran fait les calculs du bar, seuls ou à partir d’une fiche.',
    points: [
      'Batch : multiplie une recette et ajoute l’eau de dilution si tu veux.',
      'Le frais reste hors de la bouteille, les bulles s’ajoutent au service.',
      'Les autres calculs portent sur le degré et la dilution d’un mélange, les unités et le coût.',
    ],
    keys: [],
  },
  prepare: {
    title: 'Mode préparation',
    intro: 'La fiche s’affiche en plein écran, lisible à un mètre, pendant que tu réalises le cocktail.',
    points: [
      'L’écran ne se met pas en veille.',
      'Coche les étapes au fur et à mesure.',
      'Les flèches passent d’une fiche à la suivante quand tu es entré par « Préparer » dans une collection.',
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
    intro: 'Cet écran regroupe les réglages, les sauvegardes et tes données.',
    points: [
      'Règle le thème, l’unité des doses, les animations et l’alerte des préparations.',
      'Choisis le dossier des sauvegardes, sauvegarde tout de suite ou restaure. Le carnet actuel est sauvegardé avant chaque restauration.',
      'Exporte tout le carnet pour le passer sur un autre ordinateur.',
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
