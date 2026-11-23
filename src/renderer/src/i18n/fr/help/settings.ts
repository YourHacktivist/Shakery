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
    item(a.theme, 'Le thème est sombre, ou clair couleur sable. La barre de titre suit.'),
    item(
      a.unit,
      'L’unité d’affichage des doses sur les fiches, en préparation, en comparaison et à l’impression. Les doses enregistrées ne changent pas, et l’éditeur comme l’atelier gardent l’unité de chaque ligne.',
    ),
    item(
      a.warning,
      'Fixe combien de jours avant sa date limite une préparation passe en jaune et remonte dans la barre latérale. Il y en a deux au départ.',
    ),
    item(a.blur, 'Règle le flou derrière la palette et les fenêtres : fort, léger ou aucun.'),
    item(a.performance, 'Retire flou, ombres, dessins de fond et animations, pour un PC modeste.'),
    item(a.animations, 'Anime les entrées d’écran et les curseurs glissants. Windows peut aussi les couper.'),
  ),
  section(
    c.title,
    item(c.ounce, 'Elle vaut 30 ml selon l’usage du bar, ou 29,57 ml en valeur exacte.'),
    item(c.measures.dashMl, 'Il vaut 0,25 ml au départ.'),
    item(c.measures.dropMl, 'Elle vaut 0,05 ml au départ.'),
    item(c.measures.barspoonMl, 'Elle vaut 5 ml au départ.'),
    item(c.measures.tspMl, 'Elle vaut 5 ml au départ.'),
    item(
      c.dilution,
      `Fixe l’eau de la glace pour chaque méthode (${Object.values(recipes.methods).join(', ')}). Au départ, elle vaut 25 % au shaker, dry shake, swizzle et blender, 20 % au verre à mélange et throwing, 10 % au verre, 15 % sinon. Une fiche peut avoir la sienne.`,
    ),
    item(c.steps, 'Règle de combien une dose bouge à chaque clic dans l’atelier.'),
    item(
      c.stepMl,
      'Règle le pas des boutons, flèches et molette de l’atelier. En cl, il est divisé par dix.',
    ),
    item(c.stepOz, 'Règle le même pas pour les doses en onces.'),
    item(c.pricing, 'Fixe les règles du prix de vente conseillé du calculateur de coût.'),
    item(c.multiplier, 'Le coût HT est multiplié par lui. Il vaut 5 au départ.'),
    item(c.vat, 'Elle s’ajoute au prix conseillé et se retire d’un coût TTC. Elle vaut 20 % au départ.'),
    item(c.step, 'Le prix conseillé tombe sur un multiple de 0,10, 0,50 ou 1 €. Il vaut 0,50 € au départ.'),
    item(c.rounding, 'Au-dessus garde ta marge. Au plus proche peut la réduire un peu.'),
    item(c.roundings.up, 'Arrondit au multiple supérieur. C’est le choix de départ.'),
    item(c.roundings.nearest, 'Arrondit au multiple le plus proche.'),
    item(
      c.reset,
      'Remet équivalences, dilutions et prix conseillé d’origine. Les pas de l’atelier gardent ton choix.',
    ),
  ),
  section(
    p.title,
    item(p.paper, 'Le papier choisi, A4 ou A5, est proposé en premier à chaque impression de fiche.'),
    item(p.indicators, 'Décide si la case est déjà cochée à l’impression d’une fiche.'),
    item(p.label, 'Fixe le format proposé en premier pour les étiquettes de bouteille.'),
  ),
  section(
    s.off.title,
    item(
      s.off.toggle,
      'Elle utilise Internet. Elle envoie à Open Food Facts le code-barres, avec le nom et la version de Shakery, et rien d’autre. Éteinte, aucune requête ne part.',
    ),
  ),
  section(
    s.updates.title,
    item(
      s.updates.toggle,
      'À chaque lancement, Shakery demande à GitHub la dernière version publiée. Rien de ton carnet ne part. Quand elle est éteinte, aucune requête ne part au lancement.',
    ),
    item(s.updates.check, 'Lance la recherche tout de suite, même si la recherche au lancement est éteinte.'),
    item(s.updates.show, 'Rouvre la fenêtre de la nouvelle version, même si tu l’avais ignorée.'),
  ),
  section(
    about.title,
    item(about.guide, 'Ouvre le guide complet, qui compte une page par écran.'),
    item(about.shortcuts, 'Ouvre la liste des raccourcis.'),
    item(about.logs, 'Ouvre le dossier des journaux techniques, utile en cas de panne.'),
    item(about.licences, 'Liste les logiciels libres livrés avec Shakery.'),
    item('Les sources', 'Indique d’où viennent les données de départ, et sous quelle licence.'),
  ),
  section(
    b.title,
    item(
      'Quand',
      'Shakery sauvegarde au démarrage selon la fréquence, et à chaque fermeture. Les photos sont comprises.',
    ),
    item('Le dossier', 'Son chemin est affiché en haut de la carte.'),
    item(
      b.create,
      'Fait une sauvegarde tout de suite. Les cinq dernières faites à la main sont toujours gardées.',
    ),
    item(b.choose, 'Choisis un autre dossier, de préférence sur un autre disque.'),
    item(b.useDefault, 'Revient au dossier de Shakery.'),
    item(b.frequency, 'Fixe l’âge maximal de la dernière sauvegarde avant d’en refaire une au démarrage.'),
    item(b.keepDaily, 'La plus récente de chacun de ces derniers jours de sauvegarde est gardée.'),
    item(
      b.keepWeekly,
      'En plus, la plus récente de chacune de ces dernières semaines de sauvegarde est gardée.',
    ),
    item(
      b.restore,
      'Les six plus récentes valides sont listées. Après confirmation, le carnet actuel est sauvegardé, puis remplacé par celui que tu as choisi.',
    ),
  ),
  section(
    'La raison de chaque sauvegarde',
    item(b.reasons.daily, 'Elle est faite au démarrage, selon la fréquence.'),
    item(b.reasons.shutdown, 'Elle est faite en fermant Shakery.'),
    item(b.reasons.manual, 'Elle est faite avec « Sauvegarder maintenant ».'),
    item(b.reasons['pre-migration'], 'Elle est faite avant qu’une nouvelle version adapte le carnet.'),
    item(b.reasons['pre-restore'], 'Elle est faite avant de restaurer et permet de revenir.'),
    item(b.reasons['pre-purge'], 'Elle est faite avant de vider la corbeille.'),
    item(b.reasons['pre-reset'], 'Elle est faite avant une réinitialisation.'),
    item(b.reasons['pre-update'], 'Elle est faite juste avant d’installer une nouvelle version de Shakery.'),
    item(b.confirmTitle, 'La fenêtre rappelle la date avant de remplacer le carnet.'),
  ),
  section(
    ex.title,
    item(ex.full, 'Exporte tout le carnet dans un fichier .shakery, photos comprises.'),
    item(
      ex.csvTitle,
      'Exporte des fichiers pour un tableur, à séparateur point-virgule. Ils ne se réimportent pas.',
    ),
    item(ex.csv.recipes, 'Exporte en CSV les fiches avec doses, méthode, verre, garniture et version.'),
    item(ex.csv.journal, 'Exporte en CSV les dégustations.'),
    item(ex.csv.ingredients, 'Exporte en CSV les ingrédients.'),
  ),
  section(
    im.title,
    item(im.choose, 'Lit un fichier .shakery et montre son contenu. Rien n’est encore écrit.'),
    item(
      'Le tableau',
      'Il compte pour chaque type les éléments du fichier, les nouveaux et ceux déjà présents.',
    ),
    item(im.tableHead.table, 'Indique le type de contenu.'),
    item(im.tableHead.total, 'Donne le nombre dans le fichier.'),
    item(im.tableHead.added, 'Compte ceux qui seront ajoutés.'),
    item(im.tableHead.matched, 'Compte ceux que tu as déjà.'),
    item(im.strategyLabel, 'Ce choix est demandé seulement si certains diffèrent des tiens.'),
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
    item(m.trash, 'Liste tout ce que tu as supprimé, avec sa date.'),
    item(m.trashTitle, 'La fenêtre liste les plus récents et dit combien d’autres suivent.'),
    item(m.restore, 'Remet l’élément de la corbeille à sa place.'),
    item(
      m.empty,
      'Demande confirmation, sauvegarde, puis efface pour de bon, versions et dégustations des fiches comprises.',
    ),
    item(
      m.emptyNow,
      'Confirme l’effacement. Après, seule la sauvegarde faite juste avant permet de revenir.',
    ),
    item(
      m.reset,
      'Repart d’un carnet neuf avec les classiques. Il faut taper RÉINITIALISER. Le carnet actuel est sauvegardé avant.',
    ),
  ),
  section(
    m.resetTitle,
    item(m.resetField, 'Attend le mot exact, en majuscules ou non. Le bouton reste grisé sans lui.'),
    item(m.resetNow, 'Sauvegarde, vérifie la copie, puis repart d’un carnet neuf.'),
    item(m.cancel, 'Ferme sans rien effacer.'),
  ),
  methods,
  units,
)

export const guideHelp = topic(
  'Guide',
  'Le mode d’emploi de Shakery compte une page par écran. Chaque page commence par le principal, puis entre dans le détail.',
  section(
    'Se repérer',
    item('Le sommaire', 'Il liste à gauche une page par écran, plus les premiers pas et l’impression.'),
    item('Ouvrir cet écran', 'Va à l’écran que la page décrit.'),
    item('Page précédente', 'Ouvre la page d’avant dans le sommaire.'),
    item('Page suivante', 'Ouvre la page d’après.'),
    item('Aide', 'Sur n’importe quel écran, le bouton Aide ou F1 montre le même détail sans le quitter.'),
  ),
)
