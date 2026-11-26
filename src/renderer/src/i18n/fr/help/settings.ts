/** Help of the settings and of the guide (D-048, D-057). */
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
const g = s.groups

export const settings = topic(
  s.title,
  'Les réglages, les sauvegardes et les données du carnet. Chaque changement est enregistré aussitôt.',
  section(
    s.toc.label,
    item('Le sommaire', 'À gauche, il mène à chaque bloc. Le trait cuivré suit le bloc affiché en haut.'),
    item(s.toc.appearance, 'Mène au thème, à l’unité des doses et à l’alerte des préparations.'),
    item(s.toc.backups, 'Mène aux sauvegardes, à la corbeille et à la réinitialisation.'),
    item(s.toc.transfer, 'Mène à l’export et à l’import du carnet.'),
    item(s.toc.barcode, 'Mène à la recherche par code-barres.'),
  ),
  section(
    a.title,
    item(g.display, 'Ce groupe réunit le thème, l’effet de verre, les animations et le mode performance.'),
    item(
      a.theme,
      'Le thème est sombre, ou clair couleur sable. La barre de titre suit. Il se règle ici, ou par une action de la palette.',
    ),
    item(a.performance, 'Retire flou, ombres, dessins de fond et animations, pour un PC modeste.'),
    item(a.animations, 'Anime les entrées d’écran et les curseurs glissants. Windows peut aussi les couper.'),
    item(g.reminders, 'Ce groupe réunit l’unité des doses et l’alerte des préparations.'),
    item(
      a.unit,
      'L’unité d’affichage des doses sur les fiches, en préparation, en comparaison et à l’impression. Les doses enregistrées ne changent pas, et l’éditeur comme l’atelier gardent l’unité de chaque ligne.',
    ),
    item(
      a.warning,
      'Fixe combien de jours avant sa date limite une préparation passe en jaune. Il y en a deux au départ.',
    ),
  ),
  section(
    b.title,
    item(
      b.manual,
      'La date de la dernière sauvegarde s’affiche dessous. Le bouton de la ligne en fait une tout de suite.',
    ),
    item(
      b.create,
      'Fait une sauvegarde tout de suite. Les cinq dernières faites à la main sont toujours gardées.',
    ),
    item(b.folder, 'Son chemin s’affiche sur cette ligne.'),
    item(b.choose, 'Ouvre le choix d’un autre dossier, de préférence sur un autre disque.'),
    item(b.useDefault, 'Revient au dossier de Shakery.'),
    item(
      g.automatic,
      'Shakery sauvegarde au démarrage selon la fréquence, et à chaque fermeture. Les photos sont comprises.',
    ),
    item(b.frequency, 'Fixe l’âge maximal de la dernière sauvegarde avant d’en refaire une au démarrage.'),
    item(b.keepDaily, 'La plus récente de chacun de ces derniers jours de sauvegarde est gardée.'),
    item(
      b.keepWeekly,
      'En plus, la plus récente de chacune de ces dernières semaines de sauvegarde est gardée.',
    ),
    item(g.recent, 'Les six plus récentes valides sont listées, chacune avec sa raison.'),
    item(
      b.restore,
      'Après confirmation, le carnet actuel est sauvegardé, puis remplacé par la sauvegarde choisie.',
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
    m.title,
    item(m.trashTitle, 'Cette ligne ouvre la corbeille.'),
    item(m.trash, 'Liste tout ce qui a été supprimé, avec sa date.'),
    item(m.restore, 'Remet l’élément de la corbeille à sa place.'),
    item(
      m.empty,
      'Demande confirmation, sauvegarde, puis efface pour de bon, versions et dégustations des fiches comprises.',
    ),
    item(
      m.emptyNow,
      'Confirme l’effacement. Après, seule la sauvegarde faite juste avant permet de revenir.',
    ),
    item(m.search, 'Cette ligne reconstruit l’index de la recherche.'),
    item(
      m.rebuild,
      'Refait l’index, si la recherche paraît oublier quelque chose. Les données ne changent pas.',
    ),
    item(
      m.reset,
      'Repart d’un carnet neuf avec les classiques. Le mot RÉINITIALISER doit être saisi. Le carnet actuel est sauvegardé avant.',
    ),
  ),
  section(
    m.resetTitle,
    item(m.resetField, 'Attend le mot exact, en majuscules ou non. Le bouton reste grisé sans lui.'),
    item(m.resetNow, 'Sauvegarde, vérifie la copie, puis repart d’un carnet neuf.'),
    item(m.cancel, 'Ferme sans rien effacer.'),
  ),
  section(
    s.transfer.title,
    item(g.whole, 'Ce groupe exporte tout le carnet ou en importe un autre.'),
    item(ex.title, 'Cette ligne exporte le carnet entier, pour le passer sur un autre ordinateur.'),
    item(ex.full, 'Exporte tout le carnet dans un fichier .shakery, photos comprises.'),
    item(
      ex.csvLabel,
      'Exporte des fichiers CSV pour un tableur, à séparateur point-virgule. Ils ne se réimportent pas.',
    ),
    item(ex.csvTitle, 'Ce sont les fichiers de cette ligne : fiches, journal ou ingrédients.'),
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
    item(im.tableHead.matched, 'Compte ceux qui sont déjà dans le carnet.'),
    item(im.strategyLabel, 'Ce choix n’est demandé que si certains diffèrent de ceux du carnet.'),
    item(im.strategies.ignore, 'Ce qui diffère dans le carnet reste tel quel. C’est le choix par défaut.'),
    item(im.strategies.replace, 'Le fichier écrase ce qui existe déjà.'),
    item(im.strategies.duplicate, 'Les deux versions coexistent.'),
    item(im.apply, 'Sauvegarde le carnet, puis importe.'),
    item(im.cancel, 'Abandonne sans rien changer.'),
  ),
  section(
    c.title,
    item(
      g.equivalences,
      'Ce groupe donne la valeur en ml de l’once, du trait, de la goutte et des cuillères.',
    ),
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
    item(c.rounding, 'Au-dessus garde la marge entière. Au plus proche peut la réduire un peu.'),
    item(c.roundings.up, 'Arrondit au multiple supérieur. C’est le choix de départ.'),
    item(c.roundings.nearest, 'Arrondit au multiple le plus proche.'),
    item(
      c.reset,
      'Remet équivalences, dilutions et prix conseillé d’origine. Les pas de l’atelier restent tels quels.',
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
      'À chaque lancement, Shakery demande à GitHub la dernière version publiée. Rien du carnet ne part. Quand elle est éteinte, aucune requête ne part au lancement.',
    ),
    item(
      s.updates.installed,
      'Cette ligne donne le numéro de la version installée, avec l’état de la dernière recherche.',
    ),
    item(s.updates.check, 'Lance la recherche tout de suite, même si la recherche au lancement est éteinte.'),
    item(s.updates.show, 'Rouvre la fenêtre de la nouvelle version, même ignorée.'),
  ),
  section(
    about.title,
    item(g.help, 'Ce groupe réunit le guide, les raccourcis, les journaux et les licences.'),
    item(about.tools, 'Cette ligne porte les quatre boutons du groupe.'),
    item(about.guide, 'Ouvre le guide complet, qui compte une page par écran.'),
    item(about.shortcuts, 'Ouvre la liste des raccourcis.'),
    item(about.logs, 'Ouvre le dossier des journaux techniques, utile en cas de panne.'),
    item(about.licences, 'Liste les logiciels libres livrés avec Shakery.'),
    item(g.credits, 'Indique d’où viennent les données de départ, et sous quelle licence.'),
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
