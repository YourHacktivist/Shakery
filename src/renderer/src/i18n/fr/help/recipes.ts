/** Help of the recipes (D-048): list, page, editor, lab, preparation mode, printing. */
import { componentsForms as forms } from '../components-forms'
import { componentsDisplay as display } from '../components-display'
import { journal } from '../journal'
import { recipes as r } from '../recipes'
import { workshop } from '../workshop'
import { item, section, topic } from './model'
import { allergens, families, methods, missing, origins, statuses, units } from './vocabulary'

const { list, detail, panel, editor, lab: l, sheet, share, prepare: p } = r
const f = list.filters
const ef = editor.fields
const el = editor.lines
const names = (values: object) => Object.values(values).join(', ')

export const recipes = topic(
  list.title,
  'Tous les cocktails et toutes les préparations, les tiens comme les classiques, avec leurs filtres et leur tri.',
  section(
    'En haut de l’écran',
    item(
      'Le compteur',
      'Le nombre de fiches. Dès qu’un filtre agit, le nombre de fiches montrées sur le total.',
    ),
    item(list.quickIdea, 'Crée une fiche au statut Idée : un nom suffit.'),
    item(list.newRecipe, 'Ouvre l’éditeur complet sur une fiche vide. Ctrl Maj N.'),
  ),
  section(
    f.label,
    item(
      'Combiner',
      'Deux filtres différents se cumulent. Deux choix dans le même filtre s’ajoutent, sauf pour les allergènes à exclure. Les filtres restent en place quand tu ouvres une fiche et que tu reviens.',
    ),
    item(f.all, 'Aucune restriction d’affichage.'),
    item(f.favorites, 'Les fiches marquées d’une étoile.'),
    item(
      f.makeable,
      'Les fiches dont chaque ingrédient est disponible, hors lignes optionnelles et garnitures : bouteille possédée, ingrédient de base, ou fabrication maison non expirée. Une fiche sans ingrédient y figure aussi.',
    ),
    item(f.status, 'Idée, brouillon, en test, finale ou archivée.'),
    item(f.family, `Le type de cocktail : ${names(r.families)}. Certains classiques n’en ont pas.`),
    item(f.origin, 'Ta création, un classique, ou une autre origine que tu as indiquée toi-même.'),
    item(f.method, `La technique : ${names(r.methods)}.`),
    item(
      f.spirit,
      'La catégorie de spiritueux la plus versée. Sous 5 ml, une ligne ne fait que parfumer et ne compte pas.',
    ),
    item(f.glass, 'Seuls les verres présents dans tes fiches sont proposés.'),
    item(
      f.flavor,
      'Les profils aromatiques des ingrédients, hors garnitures et doses de moins de 5 ml. Ils se corrigent sur chaque ingrédient dans Mon bar.',
    ),
    item(
      f.collection,
      'Les fiches rangées dans une ou plusieurs de tes collections. Grisé tant que tu n’en as pas.',
    ),
    item(f.tag, 'Tes tags. Grisé tant qu’aucune fiche n’en porte.'),
    item(
      f.allergen,
      'Retire les fiches qui déclarent cet allergène, et celles dont un ingrédient est introuvable. Un ingrédient sans allergène déclaré passe : pour un client allergique, lis toujours les étiquettes.',
    ),
    item(f.reset, 'Enlève tous les filtres et remet le tri par dernière activité.'),
  ),
  section(
    'Dans les menus des filtres',
    item(f.allStatuses, 'La première ligne du menu efface ce filtre.'),
    item(f.allFamilies, 'La même chose pour les familles.'),
    item(f.allOrigins, 'La même chose pour les origines.'),
    item(f.allMethods, 'La même chose pour les méthodes.'),
    item(f.allSpirits, 'La même chose pour les spiritueux.'),
    item(f.noSpirit, 'Les fiches où aucun spiritueux n’est versé à 5 ml ou plus.'),
    item(f.allGlasses, 'La même chose pour les verres.'),
    item(f.allFlavors, 'La même chose pour les profils.'),
    item(f.allCollections, 'La même chose pour les collections.'),
    item(f.allTags, 'La même chose pour les tags.'),
    item(f.allAllergens, 'N’exclut plus aucun allergène.'),
    item(f.view, 'Les trois boutons Toutes, Favoris et Réalisables.'),
  ),
  section(
    f.sort,
    item(f.sortActivity, 'La dernière modification d’abord, puis l’ordre alphabétique.'),
    item(f.sortName, 'Ordre alphabétique, sans tenir compte des accents.'),
    item(
      f.sortRating,
      'La moyenne des notes de la dernière version notée. Proposé dès qu’une fiche est notée, il remplace la colonne Version par la note.',
    ),
  ),
  section(
    list.tableLabel,
    item(list.columns.status, 'L’avancement de la fiche.'),
    item(list.columns.name, 'L’étoile marque un favori, l’étiquette une préparation maison.'),
    item(list.columns.family, '« Sans famille » quand elle n’est pas précisée.'),
    item(list.columns.version, 'Le numéro de la version courante.'),
    item(list.columns.activity, 'Quand la fiche a changé pour la dernière fois.'),
    item(
      'Ouvrir',
      'Double clic, ou Entrée sur la ligne choisie. Les flèches, Page haut, Page bas, Début et Fin déplacent le choix.',
    ),
  ),
  statuses,
  families,
  methods,
  origins,
  allergens,
)

const calculations = section(
  panel.title,
  item(
    panel.abv,
    'L’alcool de chaque ligne, divisé par le volume servi, eau de la glace comprise. Le degré de la bouteille choisie passe avant celui de l’ingrédient.',
  ),
  item(
    panel.volume,
    'La somme des doses mesurables, plus la dilution. Les lignes optionnelles et les garnitures n’y entrent pas. Le volume avant dilution est rappelé dessous.',
  ),
  item(panel.sugar, 'En grammes pour 100 ml servis, d’après le sucre de chaque ingrédient.'),
  item(panel.acid, 'En grammes pour 100 ml servis, d’après l’acidité de chaque ingrédient.'),
  item(panel.ratio, 'Le sucre divisé par l’acidité. Sans acidité, il ne peut pas être calculé.'),
  item(
    panel.dilution,
    'L’eau apportée par la glace, en part du volume de départ. Le taux vient de la méthode, sauf si la fiche a le sien. Une préparation n’est pas diluée.',
  ),
  item(
    panel.cost,
    'La dose multipliée par le prix au millilitre de la bouteille choisie, ou la médiane de tes bouteilles possédées. Une garniture compte, une ligne optionnelle non. Des prix HT et TTC mélangés rendent le coût incomplet.',
  ),
  item(
    panel.allergens,
    'Ceux des ingrédients, des bouteilles choisies et des préparations, plus ceux nommés clairement dans la note d’une ligne. Ceux des seules lignes optionnelles sont à part. L’étiquette du produit fait foi.',
  ),
  item(
    panel.incomplete,
    'Il manque une donnée, et la phrase dessous dit laquelle et sur quelle ligne. Une valeur incomplète n’est jamais devinée.',
  ),
  item(panel.estimated, 'Une composition marquée « estimée » dans Mon bar entre dans ce chiffre.'),
  item(
    panel.approximate,
    'La fiche contient des traits, des gouttes, des cuillères ou un allongement estimé. Leur valeur en ml se règle dans les paramètres.',
  ),
)

const printing = section(
  sheet.title,
  item(sheet.paper, 'A4 ou A5. L’aperçu suit, et le choix proposé au départ se règle dans les paramètres.'),
  item(
    sheet.indicators,
    'Ajoute degré, sucre, acidité, rapport et allergènes. Une valeur incomplète n’est pas imprimée.',
  ),
  item(
    sheet.savePdf,
    'Crée la fiche technique : logo, doses, méthode, verre, glace, volume, étapes, garniture, notes, version et date.',
  ),
  item(sheet.print, 'Ouvre l’impression de Windows avec la même mise en page.'),
)

const sharing = section(
  share.title,
  item(share.copyMarkdown, 'Copie la fiche en texte mis en forme, à coller dans une messagerie.'),
  item(share.saveMarkdown, 'Le même texte, dans un fichier.'),
  item(share.saveImage, 'La fiche en image PNG.'),
  item(
    share.colleague,
    'Un fichier .shakery avec la fiche, ses préparations et ses ingrédients, à importer dans un autre Shakery.',
  ),
  item(
    share.includePrivate,
    'Décoché, rien de personnel ne part avec le fichier .shakery. À toi de le cocher.',
  ),
)

export const recipeDetail = topic(
  'Une fiche',
  'Tout sur un cocktail ou une préparation : la recette, ses calculs, ses versions et ses dégustations.',
  section(
    'Les boutons',
    item(detail.back, 'Revient à la liste, filtres compris.'),
    item(
      detail.edit,
      'Ouvre l’éditeur complet. L’enregistrement crée une nouvelle version, sauf simple correction.',
    ),
    item(
      detail.variant,
      'Copie la fiche sous un autre nom, en brouillon, avec un lien vers l’originale. C’est la façon de retoucher un classique sans le perdre.',
    ),
    item(p.open, 'La recette en plein écran pour la réaliser. F11.'),
    item(sheet.open, 'L’aperçu, puis le PDF ou l’imprimante. Ctrl P.'),
    item(share.open, 'Texte, image ou fichier pour un collègue.'),
    item(detail.status, 'Change l’avancement tout de suite, sans nouvelle version.'),
    item(detail.favoriteAdd, 'L’étoile ajoute aux favoris.'),
    item(detail.favoriteRemove, 'La même étoile les retire.'),
    item(detail.lab, 'Ouvre une copie de travail pour régler les doses en direct. Ctrl E.'),
    item(detail.taste, 'Une note de dégustation sur cette fiche et sa version courante. Ctrl J.'),
    item(
      workshop.collections.addToCollection,
      'La coche montre où elle est déjà. Pour l’en retirer, passe par l’écran Collections.',
    ),
    item(detail.delete, 'Met la fiche à la corbeille, avec « Annuler » pendant 8 secondes.'),
  ),
  section(
    'La recette',
    item(
      detail.sections.lines,
      'Les doses dans l’unité choisie aux paramètres, avec la bouteille préférée et la note de chaque ligne. Les doses enregistrées ne changent pas.',
    ),
    item(
      detail.sections.steps,
      'La mention « Étapes types » signale le déroulé habituel de la méthode, écrit pour les classiques sans étapes propres. Réécris-les et la mention disparaît.',
    ),
    item(detail.sections.garnish, 'La décoration.'),
    item(detail.sections.notes, 'Tes remarques sur la fiche, avec leur mise en forme.'),
    item(
      detail.sections.service,
      'Verre, glace, méthode, famille, longueur, moment, profil, origine, dilution propre et tags.',
    ),
    item(detail.variantOf, 'Le lien vers la fiche de départ d’une variante.'),
    item(detail.sections.prep, 'Pour une préparation : rendement, conservation, catégorie et stockage.'),
  ),
  section(
    'Service et préparation, champ par champ',
    item(detail.fields.origin, 'Ta création, un classique, ou une autre origine.'),
    item(detail.fields.glass, 'Le verre de service.'),
    item(detail.fields.ice, 'La glace de service.'),
    item(detail.fields.method, 'La technique, qui fixe la dilution.'),
    item(detail.fields.family, 'Le type de cocktail, qui fixe la zone de référence.'),
    item(detail.fields.length, 'Court ou long.'),
    item(detail.fields.moment, 'Quand le servir.'),
    item(detail.fields.profile, 'Quelques mots sur son goût.'),
    item(detail.fields.tags, 'Tes mots de classement.'),
    item(detail.fields.dilution, 'Montrée quand la fiche a son propre taux.'),
    item(detail.fields.yield, 'Le volume qu’une fabrication donne.'),
    item(detail.fields.shelfLife, 'Les jours fixés par toi, base des dates limites.'),
    item(detail.fields.storage, 'Tes consignes de rangement.'),
    item(detail.fields.category, 'Où la préparation est rangée dans Mon bar.'),
  ),
  section(
    'À côté',
    item(
      forms.photo.title,
      'Dépose ou choisis une photo : elle est enregistrée aussitôt, sans créer de version.',
    ),
    item(forms.photo.change, 'Remplace la photo. « Annuler » remet la précédente.'),
    item(forms.photo.remove, 'Enlève la photo, avec « Annuler » pendant 8 secondes.'),
    item(
      detail.sections.history,
      'Chaque version avec son nom, sa date et la moyenne de ses notes. La courbe apparaît à partir de deux versions notées. Pour relire une ancienne recette, compare-la dans l’atelier.',
    ),
    item(journal.recipe.title, 'Les trois dernières dégustations de la fiche. Toutes sont dans le journal.'),
  ),
  calculations,
  section(
    detail.variantDialog.title,
    item(detail.variantDialog.name, 'Proposé d’après la fiche de départ, à remplacer.'),
    item(detail.variantDialog.cancel, 'Ferme sans créer de variante.'),
    item(detail.variantDialog.confirm, 'Crée le brouillon et l’ouvre.'),
  ),
  missing,
  section(
    'Une dégustation dans la fiche',
    item(journal.nextStepDone, 'Coche la prochaine étape une fois essayée, comme dans le journal.'),
    item(journal.delete, 'Met la note à la corbeille, avec « Annuler » pendant 8 secondes.'),
    item(forms.photo.add, 'Sur une note sans photo, ouvre la zone où en déposer une.'),
  ),
  section(
    'Les marques',
    item(detail.optional, 'La ligne est facultative.'),
    item(detail.garnishLine, 'La ligne est une décoration.'),
    item(r.doseMissing, 'La ligne attend sa dose : ouvre « Modifier ».'),
    item(detail.current, 'Dans l’historique, la version courante.'),
    item(detail.shelfLifeUnset, 'La préparation n’a pas de durée de conservation, donc pas de date limite.'),
    item(r.none, 'Le champ est resté vide dans l’éditeur.'),
    item(detail.backToList, 'Proposé quand la fiche n’existe plus.'),
  ),
  statuses,
  printing,
  sharing,
)

export const recipeEditor = topic(
  'Éditeur de fiche',
  'La fiche complète, champ par champ. Rien n’est écrit avant « Enregistrer ».',
  section(
    editor.sections.essentials,
    item(
      editor.newTitle,
      'Le titre quand tu pars de rien. Pour une fiche existante, sa version courante est rappelée au-dessus.',
    ),
    item(ef.name, 'Obligatoire, c’est le seul champ qui le soit avec l’ingrédient de chaque ligne.'),
    item(
      ef.kind,
      'Cocktail, ou préparation maison. Une préparation devient aussi un ingrédient, utilisable dans les autres fiches.',
    ),
    item(ef.status, 'Où en est la fiche. Une fiche finale nourrit la zone de référence de sa famille.'),
    item(ef.origin, `${names(r.origins)}. Les classiques comptent aussi dans les zones de référence.`),
    item(ef.credit, 'Le bar, l’auteur ou la source. Il est rappelé sous le titre et à l’impression.'),
  ),
  section(
    editor.sections.lines,
    item(el.add, 'Ajoute une ligne et y place le curseur.'),
    item(
      el.ingredientPlaceholder,
      'Tape un nom ou un alias. Un nom inconnu propose de créer l’ingrédient sur place.',
    ),
    item('Dose', 'La quantité de la ligne. Les flèches avancent de 5 ml, 0,5 cl, 0,25 oz, ou d’une unité.'),
    item(
      'Unité',
      `Au choix : ${names(r.units)}. Les grammes ne comptent en volume que si l’ingrédient a une masse volumique.`,
    ),
    item(
      el.topEstimateShort,
      'Avec « à compléter » : le volume habituel de l’allongement. Sans lui, les calculs sont incomplets.',
    ),
    item(
      el.optional,
      'Facultatif : hors volume, degré, coût et disponibilité. Ses allergènes sont signalés à part.',
    ),
    item(
      el.garnish,
      'Décoration : hors volume, degré et disponibilité, absente des doses du mode préparation. Elle compte dans le coût.',
    ),
    item(
      el.bottle,
      'La bouteille précise de cette recette : son degré, sa composition, son prix et ses allergènes passent avant. Proposé si l’ingrédient en a.',
    ),
    item(
      el.bottleAny,
      'Aucune bouteille imposée : le degré vient de l’ingrédient, le prix de tes bouteilles possédées.',
    ),
    item(
      el.notePlaceholder,
      'Une précision affichée sous la ligne, comme « infusé au thé ». Un allergène nommé ici est repris.',
    ),
    item(
      'Changer l’ordre',
      'Tire la poignée, clique les flèches de la ligne, ou Alt avec ↑ et ↓ depuis la ligne.',
    ),
    item('Retirer la ligne', 'La corbeille au bout de la ligne. Rien n’est perdu avant d’enregistrer.'),
  ),
  section(
    editor.sections.service,
    item(ef.method, 'Elle fixe le taux de dilution par défaut.'),
    item(ef.glass, 'Le verre de service.'),
    item(ef.ice, 'La glace de service.'),
    item(ef.family, `${names(r.families)}. Elle choisit la zone de référence de l’atelier.`),
    item(ef.length, 'Court ou long, aussi demandé en révision.'),
    item(ef.moment, `${names(r.moments)}. Aussi demandé en révision.`),
    item(ef.profile, 'Quelques mots libres, retrouvés par la recherche.'),
    item(
      ef.dilution,
      'Un pourcentage propre à la fiche, qui remplace celui de la méthode. Vide, la méthode décide.',
    ),
  ),
  section(
    editor.sections.text,
    item(ef.steps, 'Une étape par ligne, gras et italique possibles.'),
    item(ef.garnish, 'La décoration en toutes lettres, pour la fiche, l’impression et le mode préparation.'),
    item(ef.garnishCost, 'Un forfait HT par verre, ajouté au coût.'),
    item(ef.notes, 'Texte libre, avec gras, italique et listes.'),
    item(ef.tags, 'Tes mots de classement, séparés par des virgules. Ils se filtrent et se cherchent.'),
  ),
  section(
    editor.sections.prep,
    item(
      ef.yield,
      'Le volume obtenu. Il sert de base au degré, au sucre et au coût au millilitre de la préparation, et il est proposé à chaque fabrication.',
    ),
    item(
      ef.shelfLife,
      'En jours, fixée par toi. Zéro veut dire le jour même. Vide, aucune date limite n’est calculée. Shakery n’en propose jamais.',
    ),
    item(ef.category, 'Où ranger l’ingrédient dans Mon bar. Elle dit aussi s’il se garde dans un batch.'),
    item(ef.storage, 'Frigo, bouteille stérilisée, à l’abri de la lumière : tes consignes.'),
  ),
  section(
    'À côté',
    item(
      panel.title,
      'Les chiffres suivent ta saisie un instant après. Leur détail est expliqué dans l’aide d’une fiche.',
    ),
    item(
      forms.photo.title,
      'Choisie ici, écrite avec « Enregistrer ». Une photo seule ne crée pas de version.',
    ),
    item(ef.newVersion, 'Coche-la pour une faute de frappe : la version courante est réécrite.'),
    item(ef.label, 'Un petit nom pour s’y retrouver dans l’historique. Grisé pour une simple correction.'),
  ),
  section(
    editor.sections.save,
    item(editor.leave.title, 'La question posée si tu pars avec des modifications.'),
    item(editor.save, 'Vérifie les champs, enregistre et revient à la fiche. Un champ fautif est signalé.'),
    item(editor.cancel, 'Revient en arrière, avec confirmation si tu as modifié quelque chose.'),
    item(editor.leave.stay, 'Continue la saisie là où elle en était.'),
    item(editor.leave.leave, 'Part et abandonne les modifications.'),
  ),
  section(
    r.ingredientDialog.title,
    item(r.ingredientDialog.name, 'Repris de ce que tu as tapé. Un nom ou un alias identique est signalé.'),
    item(
      r.ingredientDialog.category,
      'Obligatoire. Degré et composition se complètent ensuite dans Mon bar.',
    ),
    item(
      r.ingredientDialog.similar,
      'Un bouton « Utiliser » reprend celui qui existe, plutôt que de créer un doublon.',
    ),
    item(r.ingredientDialog.create, 'Crée l’ingrédient et le place sur la ligne.'),
  ),
  calculations,
  missing,
  statuses,
  families,
  methods,
  origins,
  units,
)

export const lab = topic(
  l.title,
  'Régler une recette avant de prendre le shaker. L’atelier travaille sur une copie : rien n’est enregistré tant que tu ne le demandes pas.',
  section(
    l.pickTitle,
    item(l.filter, 'Filtre les cocktails par nom. La liste en montre 60 : tape pour trouver les autres.'),
    item('Une ligne de la liste', 'Le nom et la version courante. Un clic ouvre ce cocktail dans l’atelier.'),
    item(l.blank, 'Ouvre un atelier vide, avec un nom à donner.'),
  ),
  section(
    'En haut',
    item(l.name, 'Pour une fiche partie de zéro. Il faut un nom pour enregistrer.'),
    item(l.undo, 'Défait le dernier réglage, sans limite jusqu’au prochain enregistrement. Ctrl Z.'),
    item(l.redo, 'Refait ce qui a été défait. Ctrl Y, ou Ctrl Maj Z.'),
    item(l.compare, 'Passe du réglage à la comparaison, sans perdre le brouillon.'),
  ),
  section(
    l.lines,
    item(
      'L’interrupteur',
      'Coupe une ligne pour voir le mélange sans elle. Une ligne coupée ne sera pas enregistrée.',
    ),
    item(
      'Le réglage de dose',
      'Boutons − et +, flèches, molette quand le champ est actif, ou saisie directe. Le pas se règle dans les paramètres : 2,5 ml au départ. Les cuillères vont par demies, les grammes par 5.',
    ),
    item('L’unité', 'Change l’unité sans convertir le nombre : 30 ml devient 30 cl si tu choisis cl.'),
    item('La corbeille de la ligne', 'Retire l’ingrédient du brouillon. Ctrl Z le ramène.'),
    item(l.add, 'Tape un nom ou un alias pour ajouter une ligne.'),
  ),
  section(
    l.indicators,
    item(
      'Le curseur plein',
      'La valeur du brouillon. Il bouge dès qu’une dose change. « incomplet » veut dire qu’une donnée manque dans Mon bar.',
    ),
    item('Le repère creux', 'La valeur de la version enregistrée, pour mesurer l’écart.'),
    item(
      'La bande',
      'La zone de référence de la famille : la moitié centrale des valeurs connues des fiches finales et des classiques de cette famille, du 25e au 75e centile. Ce n’est pas une norme.',
    ),
    item(
      l.zoneRecipes,
      'Le nombre de fiches qui font la zone. Au survol, les noms des premières. Il en faut au moins cinq avec une valeur complète.',
    ),
    item(panel.abv, 'L’alcool rapporté au volume servi, dilution comprise.'),
    item(panel.sugar, 'Grammes pour 100 ml servis.'),
    item(panel.acid, 'Grammes pour 100 ml servis.'),
    item(panel.ratio, 'Le sucre divisé par l’acidité.'),
    item(panel.volume, 'Les doses mesurables plus l’eau de la glace.'),
    item(panel.dilution, 'Le taux de la méthode, ou celui de la fiche.'),
    item(panel.cost, 'Affiché quand chaque ligne comptée a un prix.'),
  ),
  section(
    'En bas',
    item(l.saveVersion, 'Écrit le brouillon comme version suivante. Actif dès que quelque chose a changé.'),
    item(l.versionLabel, 'Facultatif, il aide à relire l’historique.'),
    item(l.saveVariant, 'Crée une autre fiche, en brouillon, liée à celle de départ.'),
    item(l.variantName, 'Le nom de cette nouvelle fiche.'),
    item(l.saveNew, 'Quand tu pars de zéro : crée la fiche en brouillon.'),
    item(l.confirm, 'Dans la petite fenêtre de version ou de variante : enregistre.'),
    item(l.cancel, 'Dans la même fenêtre : ferme sans enregistrer.'),
    item(
      l.discard,
      'Revient à la version enregistrée, sans confirmation. Ctrl Z ne ramène pas ce qui est abandonné.',
    ),
    item(
      l.taste,
      'Enregistre d’abord le brouillon s’il a changé, puis ouvre la note sur cette version. Ctrl J seul ouvre une note sans fiche choisie.',
    ),
  ),
  section(
    l.compareTitle,
    item('La référence', 'La première colonne. Les écarts des autres se lisent par rapport à elle.'),
    item('Les cases', 'Coche le brouillon ou des versions. Trois colonnes au plus.'),
    item(l.compareWith, 'Ajoute un autre cocktail ou une préparation à côté.'),
    item(l.draft, 'La copie en cours, pas encore enregistrée.'),
    item(
      'Les différences',
      'En couleur : ajouts, retraits, doses, méthode et verre. Chaque indicateur porte son écart chiffré.',
    ),
  ),
  section(
    'Lire une différence',
    item(display.diff.kinds.added, 'Une ligne que la référence n’a pas.'),
    item(display.diff.kinds.removed, 'Une ligne de la référence absente ici, barrée.'),
    item(display.diff.kinds.increased, 'Une dose plus forte, avec l’écart.'),
    item(display.diff.kinds.decreased, 'Une dose plus faible, avec l’écart.'),
    item(display.diff.kinds.changed, 'La méthode ou le verre change.'),
    item(display.diff.method, 'La méthode d’avant, puis celle de la colonne.'),
    item(display.diff.glass, 'Le verre d’avant, puis celui de la colonne.'),
    item(l.noChange, 'La colonne est identique à la première.'),
    item(l.reordered, 'Seul l’ordre des lignes diffère.'),
  ),
)

export const prepare = topic(
  p.eyebrow,
  'La recette en plein écran, lisible à un mètre, pendant que tu réalises le cocktail. L’écran ne se met pas en veille.',
  section(
    'À l’écran',
    item('Le titre', 'Le nom, puis la méthode, le verre et la glace.'),
    item(p.ingredients, 'Les doses en très grand, dans ton unité. Les facultatives sont estompées.'),
    item(p.optional, 'Écrit à côté d’un ingrédient dont on peut se passer.'),
    item(p.garnish, 'La décoration en toutes lettres.'),
    item(
      p.steps,
      'Clique une étape pour la cocher. Chaque fiche garde ses coches jusqu’à la sortie du mode.',
    ),
  ),
  section(
    'Passer d’une fiche à l’autre',
    item(
      workshop.collections.prepare,
      'Ce bouton, dans une collection, ouvre le mode sur toutes ses fiches, dans leur ordre.',
    ),
    item(p.previous, 'Le bouton, ou la flèche gauche.'),
    item(p.next, 'Le bouton, ou la flèche droite.'),
  ),
  section(
    'Entrer et sortir',
    item(p.open, 'Depuis une fiche, avec le bouton ou F11. Depuis la palette aussi.'),
    item(p.exit, 'Le bouton, Échap ou F11.'),
    item('F1', 'Cette aide. La fermer te laisse en mode préparation.'),
  ),
)

export const print = topic(
  'Imprimer et partager',
  'Tout ce qui sort de Shakery : fiches, collections, batchs, étiquettes et fichiers.',
  printing,
  sharing,
  section(
    'Ailleurs dans l’application',
    item(
      workshop.collections.exportPdf,
      'Dans une collection : toutes ses fiches en PDF, dans l’ordre, avec prix et notes.',
    ),
    item(
      workshop.calculators.batch.savePdf,
      'Dans le calculateur de batch : la feuille de production, avec des cases à cocher.',
    ),
    item(
      workshop.preps.label.action,
      'Dans Préparations : l’étiquette d’une bouteille, sur rouleau ou planche.',
    ),
  ),
)
