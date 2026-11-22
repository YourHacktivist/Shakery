/** Help of what is on every screen (D-048): the window, the search, the two quick dialogs, the fields. */
import { componentsDisplay as display } from '../components-display'
import { componentsForms as forms } from '../components-forms'
import { journal } from '../journal'
import { onboarding } from '../onboarding'
import { shell } from '../shell'
import { item, section, topic } from './model'

const keys = shell.shortcuts.items
const dialog = journal.dialog
const idea = shell.quickIdea
const palette = shell.palette

export const general = topic(
  'Partout dans Shakery',
  'Ce qui marche de la même façon sur tous les écrans : la fenêtre, la recherche, les saisies et le clavier.',
  section(
    'La barre du haut',
    item(
      shell.topbar.search,
      'Ouvre la palette de recherche. Ctrl K fait pareil, et taper une lettre hors d’un champ aussi.',
    ),
    item(shell.topbar.quickIdea, 'Note un cocktail à creuser, sans quitter l’écran où tu es.'),
    item(
      shell.topbar.help,
      'Explique l’écran affiché. F1 fait pareil, même par-dessus une fenêtre ouverte, sans rien perdre de ta saisie.',
    ),
    item(shell.topbar.theme.light, 'Le bouton soleil passe au thème clair, qui est couleur sable.'),
    item(shell.topbar.theme.dark, 'Le bouton lune revient au thème sombre.'),
    item(shell.topbar.settings, 'L’engrenage ouvre les réglages, les sauvegardes et tes données.'),
    item(
      'Déplacer la fenêtre',
      'Tire-la par les zones vides du haut. Sa taille minimale est de 1 100 × 700 pixels.',
    ),
  ),
  section(
    shell.sidebar.label,
    item(
      shell.nav.label,
      'Les onze écrans. Le trait cuivré suit celui qui est affiché. En icônes, le nom apparaît au survol.',
    ),
    item(
      shell.sidebar.close,
      'La barre disparaît entièrement et l’écran prend toute la largeur. Ctrl B la ferme et la rouvre.',
    ),
    item(
      shell.sidebar.menu,
      'Ce bouton, avec le logo, remplace la barre fermée et la rouvre telle qu’elle était.',
    ),
    item(shell.sidebar.open, 'Ce que fait le bouton Menu, comme l’indique sa bulle au survol.'),
    item(shell.sidebar.collapse, 'Ne garde que les icônes.'),
    item(shell.sidebar.expand, 'Remet les noms et les blocs. Ton choix est gardé au prochain lancement.'),
    item(
      shell.side.retest.title,
      'Les trois dernières prochaines étapes du journal pas encore testées. Clique pour ouvrir la fiche.',
    ),
    item(journal.side.open, 'Sous « À retester » : le journal entier.'),
    item(
      shell.side.preps.title,
      'Jusqu’à trois fabrications qui expirent bientôt ou qui sont expirées. Le délai se règle dans les paramètres.',
    ),
    item(
      shell.side.tonight.title,
      'Le nombre de cocktails faisables avec ton bar, et l’achat qui en débloquerait le plus.',
    ),
    item(shell.side.tonight.action, 'Ouvre le bar et sa liste d’achats.'),
    item(shell.sidebar.guide, 'Le guide complet, une page par écran.'),
    item(shell.sidebar.shortcuts, 'La liste des raccourcis, aussi ouverte par la touche ?.'),
  ),
  section(
    palette.title,
    item(
      palette.groupRecipes,
      'La recherche lit le nom, les tags, les notes, la garniture, le profil, et les étapes que tu as écrites. Pour les cocktails qui contiennent un ingrédient, ouvre cet ingrédient.',
    ),
    item(palette.groupIngredients, 'Cherchés par nom et par alias. Le choix ouvre Mon bar sur l’ingrédient.'),
    item(
      palette.groupProducts,
      'Cherchées par nom, marque et avis personnel. Le choix ouvre l’ingrédient de la bouteille.',
    ),
    item(
      palette.groupNotes,
      'Titre, texte et tags du carnet, commentaire et prochaine étape du journal. Le choix ouvre la note.',
    ),
    item(
      palette.groupActions,
      'Sur la première fiche trouvée : atelier, mode préparation, dégustation, comparaison, impression.',
    ),
    item(
      palette.groupShown,
      'Les mêmes actions sur la fiche affichée. Dans l’atelier, seule la comparaison est proposée, pour garder ton brouillon.',
    ),
    item(
      palette.groupGeneral,
      'Dès que tu tapes : idée rapide, fiche complète, dégustation, thème, aide, guide et raccourcis.',
    ),
    item(palette.guide, 'Une des actions : le guide, page par page.'),
    item(palette.shortcuts, 'Une des actions : la liste des raccourcis.'),
    item(palette.groupScreens, 'Tous les écrans, filtrés par ce que tu tapes.'),
    item(
      'Fautes de frappe',
      'Accents et majuscules ne comptent pas. Si rien n’est trouvé, une faute est tolérée à partir de 4 lettres, deux au-delà de 6.',
    ),
    item(
      'Ordre des résultats',
      'Le nom exact d’abord, puis le début du nom, les autres noms, le contenu. Favoris, créations en cours et fiches vues récemment remontent.',
    ),
    item(
      'Valider',
      '↑ et ↓ choisissent, Entrée ouvre, Échap ferme. Entrée tapée très vite attend les résultats du mot entier.',
    ),
  ),
  section(
    idea.title,
    item(idea.name, 'Le seul champ obligatoire. Entrée crée la fiche au statut Idée.'),
    item(
      idea.ingredients,
      'Entrée ou virgule ajoute, ↑ et ↓ prennent une suggestion, Retour arrière retire le dernier, coller une liste à virgules la découpe. Vingt au plus. Un ingrédient inconnu est créé dans « À classer ».',
    ),
    item(idea.suggestions, 'Jusqu’à cinq noms connus sous le champ, pour ne pas créer de doublon.'),
    item(idea.note, 'Une ligne qui devient la note de la fiche.'),
    item(idea.create, 'Crée l’idée. Le message qui suit propose de l’ouvrir.'),
    item(idea.open, 'Dans le message qui suit, ouvre la fiche créée.'),
    item(idea.cancel, 'Ferme sans rien créer, comme Échap.'),
  ),
  section(
    dialog.title,
    item(dialog.recipe, 'Le seul champ obligatoire. Ctrl J depuis une fiche la remplit pour toi.'),
    item(
      dialog.version,
      'La version courante par défaut. Change-la si tu as goûté une version plus ancienne.',
    ),
    item(dialog.overall, 'De 1 à 5 étoiles, à la souris ou aux flèches. Recliquer la même étoile l’efface.'),
    item(
      dialog.scores,
      'Cinq crans par critère : bien trop peu, plutôt trop peu, juste, plutôt trop, bien trop. Le centre veut dire juste. Seuls les écarts s’affichent dans le journal.',
    ),
    item(journal.criteria.balance, 'L’ensemble tient-il, sans qu’un goût écrase les autres ?'),
    item(journal.criteria.sweetness, 'Le sucré, de sec à sirupeux.'),
    item(journal.criteria.acidity, 'Le vif, de plat à mordant.'),
    item(journal.criteria.bitterness, 'L’amer, d’absent à envahissant.'),
    item(journal.criteria.strength, 'La chaleur de l’alcool.'),
    item(journal.criteria.dilution, 'L’eau, de trop serré à délavé.'),
    item(journal.criteria.texture, 'La tenue en bouche : mousse, gras, corps.'),
    item(journal.criteria.aroma, 'Ce qui arrive au nez.'),
    item(
      forms.photo.title,
      'Une photo de cet essai. Elle se choisit à la création de la note et ne se change pas ensuite.',
    ),
    item(dialog.comment, 'Ce que tu as goûté. Gras, italique et listes sont possibles.'),
    item(
      dialog.nextStep,
      'Ce qu’il faudra essayer. Elle reste dans « À retester » tant que tu ne l’as pas cochée comme testée.',
    ),
    item(dialog.context, 'Le lieu, l’occasion, la glace, ce qui explique la note.'),
    item(dialog.save, 'Enregistre la note avec la date et l’heure du moment.'),
    item(dialog.cancel, 'Ferme sans rien enregistrer.'),
  ),
  section(
    'Remplir un champ',
    item(
      'Nombres',
      'La virgule et le point passent tous les deux. ↑ et ↓ avancent d’un pas, Page haut et Page bas de dix.',
    ),
    item(
      'Champs avec suggestions',
      'Tape pour filtrer, ↑ et ↓ choisissent, Entrée valide. La liste montre 100 lignes au plus : tape plus pour affiner.',
    ),
    item(
      'Pastilles de filtre',
      'Un clic ouvre le menu. Quand plusieurs choix sont possibles, il reste ouvert pour les enchaîner, et la première ligne efface tout.',
    ),
    item(
      'Boutons à segments',
      '← et → passent d’un choix à l’autre, Début et Fin vont au premier et au dernier.',
    ),
    item(forms.formatting.bold, 'Entoure la sélection de **deux étoiles**. Recommencer enlève le gras.'),
    item(forms.formatting.italic, 'Entoure la sélection d’*une étoile*. Recommencer l’enlève.'),
    item(forms.formatting.bullets, 'Met un tiret au début de chaque ligne choisie. Recommencer l’enlève.'),
    item(forms.formatting.numbers, 'Numérote les lignes choisies. Recommencer enlève les numéros.'),
    item(forms.formatting.preview, 'Montre le rendu sous le champ dès qu’il y a de la mise en forme.'),
    item(forms.photo.change, 'Choisit une autre image à la place.'),
    item(forms.photo.remove, 'Enlève l’image.'),
    item(
      forms.photo.drop,
      'JPEG, PNG ou WebP, 10 Mo et 80 millions de pixels au plus. La copie gardée est allégée à 1 600 pixels, et ton fichier n’est pas touché. Une photo HEIC d’iPhone doit d’abord être convertie.',
    ),
  ),
  section(
    'Les signes communs',
    item(forms.toggle.on, 'L’interrupteur est allumé.'),
    item(forms.toggle.off, 'L’interrupteur est éteint.'),
    item(display.stat.empty, 'Affiché par un tiret : la valeur manque, elle n’est pas devinée.'),
    item(
      display.gauge.legend,
      'Sous une jauge : la bande, le curseur plein et le repère creux, avec leurs valeurs.',
    ),
    item(forms.combobox.empty, 'Rien ne correspond. Quand c’est permis, une ligne « Créer » est proposée.'),
    item(display.allergenOptional, 'À côté d’un allergène : il ne vient que d’une ligne facultative.'),
    item(shell.dialog.close, 'La croix d’une fenêtre, comme Échap ou un clic hors de la fenêtre.'),
    item(shell.toast.dismiss, 'La croix d’un message. Elle renonce à « Annuler ».'),
  ),
  section(
    'Ne rien perdre',
    item(
      shell.toast.undo,
      'Après la plupart des suppressions, ce bouton reste 8 secondes. Le compte à rebours s’arrête tant que la souris est dessus.',
    ),
    item(
      'Corbeille',
      'Dans les paramètres, elle garde fiches, ingrédients, bouteilles, dégustations, notes, fabrications et collections supprimés, jusqu’à ce que tu la vides.',
    ),
    item(
      'Quitter sans enregistrer',
      'L’éditeur et l’atelier demandent confirmation quand une modification n’est pas enregistrée.',
    ),
    item(
      'Enregistrement automatique',
      'Le carnet, les notes et prix des collections et les paramètres s’enregistrent seuls. Les autres formulaires attendent leur bouton.',
    ),
    item('Hors ligne', 'Tout est sur cet ordinateur. Seule la recherche par code-barres utilise Internet.'),
  ),
  section(
    onboarding.title,
    item(
      onboarding.steps.display.title,
      'Au premier lancement, tu choisis l’unité des doses et le thème. Tout se change ensuite dans les paramètres.',
    ),
    item(onboarding.steps.base.title, 'Le nombre de cocktails, de préparations et d’ingrédients déjà là.'),
    item(onboarding.steps.backups.title, 'Choisis un dossier, de préférence sur un autre disque.'),
    item(onboarding.next, 'Passe à l’étape suivante. « Retour » revient à la précédente.'),
    item(onboarding.back, 'Revient à l’étape précédente.'),
    item(onboarding.finish, 'À la dernière étape : ferme l’assistant et ouvre l’accueil.'),
    item(
      onboarding.skip,
      'Termine l’assistant tout de suite. Fermé avec Échap, il revient au lancement suivant.',
    ),
  ),
  section(
    shell.shortcuts.title,
    item(keys.palette, 'Ctrl K, de partout. Le même raccourci la referme.'),
    item(keys.typeToSearch, 'A à Z : la première lettre tapée arrive dans la palette.'),
    item(keys.quickIdea, 'Ctrl N, de partout.'),
    item(keys.newRecipe, 'Ctrl Maj N, de partout.'),
    item(keys.tastingNote, 'Ctrl J, avec la fiche déjà choisie si une fiche est affichée.'),
    item(keys.openInLab, 'Ctrl E, depuis une fiche.'),
    item(keys.sidebar, 'Ctrl B. Dans un champ avec mise en forme, c’est le gras.'),
    item(keys.print, 'Ctrl P, depuis une fiche.'),
    item(keys.prepMode, 'F11, depuis une fiche.'),
    item(keys.back, 'Échap. Dans un champ, le premier appui en sort, le suivant revient en arrière.'),
    item(keys.help, '? hors d’un champ de saisie.'),
    item(keys.screenHelp, 'F1, de partout.'),
  ),
)
