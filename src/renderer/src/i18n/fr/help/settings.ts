/** Help of the settings and of the guide (D-048). */
import { recipes } from '../recipes'
import { settings as s } from '../settings'
import { item, section, topic } from './model'
import { methods, units } from './vocabulary'

const a = s.appearance
const c = s.calculation
const p = s.print
const b = s.backups
const m = s.maintenance
const about = s.about
const ex = s.export
const im = s.import

export const settings = topic(
  s.title,
  'Tes réglages, tes sauvegardes et tes données. Chaque changement est enregistré aussitôt.',
  section(
    a.title,
    item(a.theme, 'Sombre, ou clair couleur sable. La barre de titre suit.'),
    item(
      a.unit,
      'L’unité d’affichage des doses sur les fiches, en préparation, en comparaison et à l’impression. Les doses enregistrées ne changent pas, et l’éditeur comme l’atelier gardent l’unité de chaque ligne.',
    ),
    item(
      a.warning,
      'Combien de jours avant sa date limite une préparation passe en jaune et remonte dans la barre latérale. Deux au départ.',
    ),
    item(a.blur, 'Le flou derrière la palette et les fenêtres : fort, léger ou aucun.'),
    item(a.performance, 'Pour un PC modeste : retire flou, ombres, dessins de fond et animations.'),
    item(a.animations, 'Entrées d’écran et curseurs glissants. Windows peut aussi les couper.'),
  ),
  section(
    c.title,
    item(c.ounce, '30 ml, l’usage du bar, ou 29,57 ml, la valeur exacte.'),
    item(c.measures.dashMl, '0,25 ml au départ.'),
    item(c.measures.dropMl, '0,05 ml au départ.'),
    item(c.measures.barspoonMl, '5 ml au départ.'),
    item(c.measures.tspMl, '5 ml au départ.'),
    item(
      c.dilution,
      `L’eau de la glace pour chaque méthode (${Object.values(recipes.methods).join(', ')}). Au départ : 25 % au shaker, dry shake, swizzle et blender, 20 % au verre à mélange et throwing, 10 % au verre, 15 % sinon. Une fiche peut avoir la sienne.`,
    ),
    item(c.steps, 'De combien bouge une dose à chaque clic dans l’atelier.'),
    item(c.stepMl, 'Le pas des boutons, flèches et molette de l’atelier. En cl, il est divisé par dix.'),
    item(c.stepOz, 'Le même pas, pour les doses en onces.'),
    item(c.reset, 'Remet équivalences et dilutions d’origine. Les pas de l’atelier gardent ton choix.'),
  ),
  section(
    p.title,
    item(p.paper, 'A4 ou A5, proposé en premier à chaque impression de fiche.'),
    item(p.indicators, 'La case déjà cochée, ou non, à l’impression d’une fiche.'),
    item(p.label, 'Le format proposé en premier pour les étiquettes de bouteille.'),
  ),
  section(
    s.off.title,
    item(
      s.off.toggle,
      'La seule fonction qui utilise Internet : elle envoie à Open Food Facts le code-barres, avec le nom et la version de Shakery, rien d’autre. Éteinte, aucune requête ne part.',
    ),
  ),
  section(
    about.title,
    item(about.guide, 'Le guide complet, une page par écran.'),
    item(about.shortcuts, 'La liste des raccourcis.'),
    item(about.logs, 'Ouvre le dossier des journaux techniques, utile en cas de panne.'),
    item(about.licences, 'Les logiciels libres livrés avec Shakery.'),
    item('Les sources', 'D’où viennent les données de départ, et sous quelle licence.'),
  ),
  section(
    b.title,
    item('Quand', 'Au démarrage selon la fréquence, et à chaque fermeture. Les photos sont comprises.'),
    item('Le dossier', 'Son chemin est affiché en haut de la carte.'),
    item(
      b.create,
      'Une sauvegarde tout de suite. Les cinq dernières faites à la main sont toujours gardées.',
    ),
    item(b.choose, 'Choisis un autre dossier, de préférence sur un autre disque.'),
    item(b.useDefault, 'Revient au dossier de Shakery.'),
    item(b.frequency, 'L’âge maximal de la dernière sauvegarde avant d’en refaire une au démarrage.'),
    item(b.keepDaily, 'La plus récente de chacun de ces derniers jours de sauvegarde est gardée.'),
    item(b.keepWeekly, 'En plus, la plus récente de chacune de ces dernières semaines de sauvegarde.'),
    item(
      b.restore,
      'Les six plus récentes valides sont listées. Après confirmation, le carnet actuel est sauvegardé, puis remplacé par celui que tu as choisi.',
    ),
  ),
  section(
    'La raison de chaque sauvegarde',
    item(b.reasons.daily, 'Faite au démarrage, selon la fréquence.'),
    item(b.reasons.shutdown, 'Faite en fermant Shakery.'),
    item(b.reasons.manual, 'Faite avec « Sauvegarder maintenant ».'),
    item(b.reasons['pre-migration'], 'Faite avant qu’une nouvelle version adapte le carnet.'),
    item(b.reasons['pre-restore'], 'Faite avant de restaurer : elle permet de revenir.'),
    item(b.reasons['pre-purge'], 'Faite avant de vider la corbeille.'),
    item(b.reasons['pre-reset'], 'Faite avant une réinitialisation.'),
    item(b.confirmTitle, 'La fenêtre rappelle la date avant de remplacer le carnet.'),
  ),
  section(
    ex.title,
    item(ex.full, 'Tout le carnet dans un fichier .shakery, photos comprises.'),
    item(ex.csvTitle, 'Des fichiers pour un tableur, à séparateur point-virgule. Ils ne se réimportent pas.'),
    item(ex.csv.recipes, 'Un CSV : les fiches avec doses, méthode, verre, garniture, version.'),
    item(ex.csv.journal, 'Un CSV : les dégustations.'),
    item(ex.csv.ingredients, 'Un CSV : les ingrédients.'),
  ),
  section(
    im.title,
    item(im.choose, 'Lit un fichier .shakery et montre son contenu. Rien n’est encore écrit.'),
    item('Le tableau', 'Pour chaque type : dans le fichier, nouveaux, déjà présents.'),
    item(im.tableHead.table, 'Le type de contenu.'),
    item(im.tableHead.total, 'Le nombre dans le fichier.'),
    item(im.tableHead.added, 'Ceux qui seront ajoutés.'),
    item(im.tableHead.matched, 'Ceux que tu as déjà.'),
    item(im.strategyLabel, 'Demandé seulement si certains diffèrent des tiens.'),
    item(im.strategies.ignore, 'Ce qui diffère chez toi reste tel quel. C’est le choix par défaut.'),
    item(im.strategies.replace, 'Le fichier écrase ce qui existe déjà.'),
    item(im.strategies.duplicate, 'Les deux versions coexistent.'),
    item(im.apply, 'Sauvegarde le carnet, puis importe.'),
    item(im.cancel, 'Abandonne sans rien changer.'),
  ),
  section(
    m.title,
    item(
      m.rebuild,
      'Refait l’index, si la recherche paraît oublier quelque chose. Tes données ne changent pas.',
    ),
    item(m.trash, 'Tout ce que tu as supprimé, avec sa date.'),
    item(m.trashTitle, 'La fenêtre liste les plus récents et dit combien d’autres suivent.'),
    item(m.restore, 'Dans la corbeille : remet l’élément à sa place.'),
    item(
      m.empty,
      'Demande confirmation, sauvegarde, puis efface pour de bon, versions et dégustations des fiches comprises.',
    ),
    item(m.emptyNow, 'La confirmation. Après, seule la sauvegarde faite juste avant permet de revenir.'),
    item(
      m.reset,
      'Repart d’un carnet neuf avec les classiques. Il faut taper RÉINITIALISER. Le carnet actuel est sauvegardé avant.',
    ),
  ),
  section(
    m.resetTitle,
    item(m.resetField, 'Le mot exact, majuscules ou non. Le bouton reste grisé sans lui.'),
    item(m.resetNow, 'Sauvegarde, vérifie la copie, puis repart d’un carnet neuf.'),
    item(m.cancel, 'Ferme sans rien effacer.'),
  ),
  methods,
  units,
)

export const guideHelp = topic(
  'Guide',
  'Le mode d’emploi de Shakery, une page par écran : l’essentiel d’abord, puis chaque détail.',
  section(
    'Se repérer',
    item('Le sommaire', 'À gauche, une page par écran, plus les premiers pas et l’impression.'),
    item('Ouvrir cet écran', 'Va à l’écran que la page décrit.'),
    item('Page précédente', 'La page d’avant dans le sommaire.'),
    item('Page suivante', 'La page d’après.'),
    item('Aide', 'Sur n’importe quel écran, le bouton Aide ou F1 montre le même détail sans le quitter.'),
  ),
)
