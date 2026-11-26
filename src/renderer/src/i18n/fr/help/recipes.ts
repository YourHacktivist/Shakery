/** Help of the recipes (D-048, D-057): list, page, editor, lab, preparation mode, printing. */
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
/** « le coût » becomes the term « Le coût »: the help compares without the case. */
const capital = (text: string) => `${text.charAt(0).toLocaleUpperCase('fr')}${text.slice(1)}`

export const recipes = topic(
  list.title,
  'Cet écran liste les cocktails et les préparations, créations et classiques, avec leurs filtres et leur tri. Il s’ouvre sur les créations.',
  section(
    'En haut de l’écran',
    item(
      'Le compteur',
      'Il donne le nombre de fiches. Dès qu’un filtre agit, il montre les fiches affichées sur le total de la vue.',
    ),
    item(list.newRecipe, 'Ouvre l’éditeur complet sur une fiche vide. Ctrl Maj N.'),
    item(
      list.quickIdea,
      'Sur une liste vide, crée une fiche au statut Idée, avec un nom pour seul champ obligatoire. Ctrl N.',
    ),
  ),
  section(
    f.view,
    item(
      f.mine,
      'Affiche les créations, soit toutes les fiches qui ne sont pas des classiques. La page s’ouvre sur cette vue, et le nombre de fiches suit son nom.',
    ),
    item(f.classics, 'Affiche les recettes classiques livrées avec Shakery, avec leur nombre.'),
    item(f.favorites, 'Affiche les fiches marquées d’une étoile.'),
    item(
      f.makeable,
      'Affiche les fiches dont chaque ingrédient est disponible, hors lignes optionnelles et garnitures : ingrédient coché Au bar, ingrédient de base, ou fabrication maison non expirée. Une fiche sans ingrédient y figure aussi.',
    ),
    item(
      list.browseClassics,
      'Sous la liste des créations, ce lien passe à la vue Classiques. Il figure aussi sur une liste de créations vide.',
    ),
  ),
  section(
    f.label,
    item(
      'Combiner',
      'Deux filtres différents se cumulent. Deux choix dans le même filtre s’ajoutent, sauf pour les allergènes à exclure. Les filtres restent en place après l’ouverture d’une fiche et le retour à la liste.',
    ),
    item(f.status, 'Le statut peut être idée, brouillon, en test, finale ou archivée.'),
    item(f.family, `Filtre par type de cocktail : ${names(r.families)}. Certains classiques n’en ont pas.`),
    item(
      f.spirit,
      'Filtre par catégorie de spiritueux la plus versée. Sous 5 ml, une ligne ne fait que parfumer et ne compte pas.',
    ),
    item(
      f.more,
      'Ce bouton déplie six autres filtres : méthode, verre, profil aromatique, collection, tags et allergènes à exclure.',
    ),
    item(f.moreGroup, 'C’est la rangée que déplie le bouton Plus de filtres.'),
    item(f.method, `Filtre par technique : ${names(r.methods)}.`),
    item(f.glass, 'Seuls les verres présents dans les fiches sont proposés.'),
    item(
      f.flavor,
      'Filtre par profils aromatiques des ingrédients, hors garnitures et doses de moins de 5 ml. Ils se corrigent sur chaque ingrédient, dans Ingrédients.',
    ),
    item(
      f.collection,
      'Affiche les fiches rangées dans une ou plusieurs collections. Le filtre est grisé tant qu’aucune collection n’existe.',
    ),
    item(f.tag, 'Filtre par tags. Le filtre est grisé tant qu’aucune fiche n’en porte.'),
    item(
      f.allergen,
      'Retire les fiches qui déclarent cet allergène, et celles dont un ingrédient est introuvable. Un ingrédient sans allergène déclaré passe le filtre. Pour un client allergique, les étiquettes restent à lire.',
    ),
    item(f.reset, 'Enlève tous les filtres. La vue et le tri restent.'),
  ),
  section(
    'Dans les menus des filtres',
    item(f.allStatuses, 'La première ligne du menu efface ce filtre.'),
    item(f.allFamilies, 'Efface de même le filtre des familles.'),
    item(f.allMethods, 'Efface de même le filtre des méthodes.'),
    item(f.allSpirits, 'Efface de même le filtre des spiritueux.'),
    item(f.noSpirit, 'Les fiches où aucun spiritueux n’est versé à 5 ml ou plus.'),
    item(f.allGlasses, 'Efface de même le filtre des verres.'),
    item(f.allFlavors, 'Efface de même le filtre des profils.'),
    item(f.allCollections, 'Efface de même le filtre des collections.'),
    item(f.allTags, 'Efface de même le filtre des tags.'),
    item(f.allAllergens, 'N’exclut plus aucun allergène.'),
  ),
  section(
    f.sort,
    item(f.sortActivity, 'Classe les fiches par dernière modification, puis par ordre alphabétique.'),
    item(f.sortName, 'Classe les fiches par ordre alphabétique, sans tenir compte des accents.'),
    item(
      f.sortRating,
      'Classe les fiches par moyenne des notes de la dernière version notée. Proposé dès qu’une fiche est notée, il remplace la colonne Version par la note.',
    ),
  ),
  section(
    list.tableLabel,
    item(list.columns.status, 'Indique l’avancement de la fiche.'),
    item(list.columns.name, 'L’étoile marque un favori, l’étiquette une préparation maison.'),
    item(list.columns.family, 'Affiche « Sans famille » quand elle n’est pas précisée.'),
    item(list.columns.version, 'Indique le numéro de la version courante.'),
    item(list.columns.activity, 'Indique quand la fiche a changé pour la dernière fois.'),
    item(
      'Ouvrir',
      'Un double clic, ou Entrée sur la ligne choisie, ouvre la fiche. Les flèches, Page haut, Page bas, Début et Fin déplacent le choix.',
    ),
  ),
  section(
    'Quand la liste est vide',
    item(
      list.emptyView.mine.title,
      'La vue Créations ne compte encore aucune fiche. Idée rapide ou Nouvelle fiche crée la première, et Parcourir les classiques ouvre la vue Classiques.',
    ),
    item(
      list.emptyView.classics.title,
      'Les recettes classiques supprimées n’apparaissent plus. Elles restent dans la corbeille des paramètres jusqu’à ce qu’elle soit vidée.',
    ),
    item(
      list.emptyView.favorites.title,
      'Aucune fiche n’a encore son étoile. L’étoile en haut d’une fiche l’ajoute aux favoris.',
    ),
    item(
      list.emptyView.makeable.title,
      'Aucune fiche n’a tous ses ingrédients au bar. Les cases Au bar se cochent dans Ingrédients.',
    ),
  ),
  statuses,
  families,
  methods,
  allergens,
)

const calculations = section(
  panel.title,
  item(
    panel.abv,
    'Il divise l’alcool de chaque ligne par le volume servi, eau de la glace comprise. Le degré de la bouteille choisie passe avant celui de l’ingrédient.',
  ),
  item(
    panel.volume,
    'Il additionne les doses mesurables et la dilution. Les lignes optionnelles et les garnitures n’y entrent pas. Le volume avant dilution est rappelé dessous.',
  ),
  item(panel.sugar, 'Il s’exprime en grammes pour 100 ml servis, d’après le sucre de chaque ingrédient.'),
  item(panel.acid, 'Elle s’exprime en grammes pour 100 ml servis, d’après l’acidité de chaque ingrédient.'),
  item(panel.ratio, 'Il divise le sucre par l’acidité. Sans acidité, il ne peut pas être calculé.'),
  item(
    panel.dilution,
    'Elle mesure l’eau apportée par la glace, en part du volume de départ. Le taux vient de la méthode, sauf si la fiche a le sien. Une préparation n’est pas diluée.',
  ),
  item(
    panel.cost,
    'Il multiplie la dose par le prix au millilitre de la bouteille choisie, ou par la médiane des bouteilles cochées Au bar. Une garniture compte, une ligne optionnelle ne compte pas. Des prix HT et TTC mélangés rendent le coût incomplet.',
  ),
  item(
    panel.allergens,
    'Il reprend ceux des ingrédients, des bouteilles choisies et des préparations, plus ceux nommés clairement dans la note d’une ligne. Ceux des seules lignes optionnelles sont à part. L’étiquette du produit fait foi.',
  ),
  item(
    panel.incomplete,
    'Il manque une donnée, et la phrase dessous dit laquelle et sur quelle ligne. Une valeur incomplète n’est jamais devinée.',
  ),
  item(panel.estimated, 'Une composition marquée « estimée » dans Ingrédients entre dans ce chiffre.'),
  item(
    panel.approximate,
    'La fiche contient des traits, des gouttes, des cuillères ou un allongement estimé. Leur valeur en ml se règle dans les paramètres.',
  ),
)

const printing = section(
  sheet.title,
  item(sheet.paper, 'A4 ou A5. L’aperçu suit, et le format proposé au départ se règle dans les paramètres.'),
  item(
    sheet.indicators,
    'Ajoute degré, sucre, acidité, rapport et allergènes. Une valeur incomplète n’est pas imprimée.',
  ),
  item(
    sheet.savePdf,
    'Crée la fiche technique : logo, doses, méthode, verre, glace, volume, étapes, garniture, notes, version et date.',
  ),
  item(sheet.print, 'Ouvre l’impression de Windows avec la même mise en page.'),
  item(
    sheet.categories.short,
    'Catégorie d’un cocktail court, servi dans un petit verre, souvent sans allongeur. La fiche imprimée l’indique avec la famille, le moment et l’origine.',
  ),
  item(
    sheet.categories.long,
    'Catégorie d’un cocktail allongé, servi dans un grand verre, souvent avec une boisson gazeuse ou un jus.',
  ),
)

const sharing = section(
  share.title,
  item(share.copyMarkdown, 'Copie la fiche en texte mis en forme, à coller dans une messagerie.'),
  item(share.saveMarkdown, 'Enregistre le même texte dans un fichier.'),
  item(share.saveImage, 'Enregistre la fiche en image PNG.'),
  item(
    share.colleague,
    'Crée un fichier .shakery avec la fiche, ses préparations et ses ingrédients, à importer dans un autre Shakery.',
  ),
  item(
    share.includePrivate,
    'Décochée, rien de personnel ne part avec le fichier .shakery. La cocher reste un choix délibéré.',
  ),
)

export const recipeDetail = topic(
  'Une fiche',
  'Cette page montre un cocktail ou une préparation : la recette à gauche, et dans une colonne plus calme ses calculs, ses versions et ses dégustations.',
  section(
    'En haut de la fiche',
    item(detail.back, 'Ce lien, au-dessus du nom, revient à la liste, filtres compris.'),
    item(detail.status, 'Change l’avancement tout de suite, sans nouvelle version.'),
    item(detail.favoriteAdd, 'L’étoile ajoute aux favoris.'),
    item(detail.favoriteRemove, 'La même étoile les retire.'),
    item(detail.variantOf, 'Mène à la fiche de départ d’une variante.'),
  ),
  section(
    'Les actions',
    item(
      detail.edit,
      'Seul bouton plein de la page, il ouvre l’éditeur complet. L’enregistrement crée une nouvelle version, sauf simple correction.',
    ),
    item(detail.lab, 'Ouvre une copie de travail pour régler les doses en direct. Ctrl E.'),
    item(p.open, 'Affiche la recette en plein écran pour la réaliser. F11.'),
    item(detail.taste, 'Ouvre une note de dégustation sur cette fiche et sa version courante. Ctrl J.'),
    item(
      detail.more,
      'Ce menu range les autres actions : créer une variante, ajouter à une collection, imprimer, partager et supprimer la fiche.',
    ),
  ),
  section(
    'Le menu Plus',
    item(
      detail.variant,
      'Copie la fiche sous un autre nom, en brouillon, avec un lien vers l’originale. Elle permet de retoucher un classique sans le perdre.',
    ),
    item(
      workshop.collections.addToCollection,
      'Ouvre la liste des collections. Celle qui contient déjà la fiche est grisée. Une fiche se retire d’une collection depuis l’écran Collections.',
    ),
    item(sheet.open, 'Ouvre l’aperçu, puis le PDF ou l’imprimante. Ctrl P.'),
    item(share.open, 'Partage la fiche en texte, en image ou en fichier pour un collègue.'),
    item(detail.delete, 'Met la fiche à la corbeille, avec « Annuler » pendant 8 secondes.'),
  ),
  section(
    'La recette',
    item(
      detail.sections.lines,
      'Affiche les doses dans l’unité choisie aux paramètres, avec la bouteille préférée et la note de chaque ligne. Les doses enregistrées ne changent pas.',
    ),
    item(
      detail.sections.steps,
      'La mention « Étapes types » signale le déroulé habituel de la méthode, écrit pour les classiques sans étapes propres. Une fois les étapes réécrites, la mention disparaît.',
    ),
    item(detail.sections.garnish, 'Décrit la décoration.'),
    item(detail.sections.notes, 'Affiche les remarques sur la fiche, avec leur mise en forme.'),
    item(
      detail.sections.service,
      'Regroupe méthode, verre, glace, famille, longueur, moment, profil, dilution propre et tags.',
    ),
    item(
      detail.sections.prep,
      'Regroupe le rendement, la conservation, la catégorie et le stockage d’une préparation.',
    ),
  ),
  section(
    'Service et préparation, champ par champ',
    item(detail.fields.origin, 'Indique une création, un classique ou une autre origine.'),
    item(detail.fields.glass, 'Indique le verre de service.'),
    item(detail.fields.ice, 'Indique la glace de service.'),
    item(detail.fields.method, 'Indique la technique, qui fixe la dilution.'),
    item(detail.fields.family, 'Indique le type de cocktail, qui fixe la zone de référence.'),
    item(detail.fields.length, 'Indique si le cocktail est court ou long.'),
    item(detail.fields.moment, 'Indique quand le servir.'),
    item(detail.fields.profile, 'Décrit son goût en quelques mots.'),
    item(detail.fields.tags, 'Regroupe les mots de classement.'),
    item(detail.fields.dilution, 'Elle est montrée quand la fiche a son propre taux.'),
    item(detail.fields.yield, 'Indique le volume qu’une fabrication donne.'),
    item(
      detail.fields.shelfLife,
      'Indique les jours fixés sur la fiche, qui servent de base aux dates limites.',
    ),
    item(detail.fields.storage, 'Rappelle les consignes de rangement.'),
    item(detail.fields.category, 'Indique où la préparation est rangée dans Ingrédients.'),
  ),
  section(
    detail.sections.side,
    item(
      'La colonne de droite',
      'Elle réunit les calculs, les versions, les dégustations et la photo de la fiche.',
    ),
    item(
      detail.sections.history,
      'Liste chaque version avec sa date, son nom et la moyenne de ses notes. La courbe apparaît à partir de deux versions notées. Une ancienne recette se relit en la comparant dans l’atelier.',
    ),
    item(
      journal.recipe.title,
      'Montre les trois dernières dégustations de la fiche. Toutes sont dans le journal.',
    ),
    item(
      forms.photo.title,
      'Une photo se dépose ou se choisit ici. Elle est enregistrée aussitôt, sans créer de version.',
    ),
    item(forms.photo.change, 'Remplace la photo. « Annuler » remet la précédente.'),
    item(forms.photo.remove, 'Enlève la photo, avec « Annuler » pendant 8 secondes.'),
  ),
  calculations,
  section(
    'Valeurs à compléter',
    item('La phrase sous les calculs', 'Elle nomme les valeurs encore inconnues. Aucune n’est devinée.'),
    item(
      capital(panel.unknown.abv),
      'Il manque quand un ingrédient n’a pas de degré, ni sa bouteille choisie. Il se renseigne dans Ingrédients, avec 0 pour un produit sans alcool.',
    ),
    item(
      capital(panel.unknown.volume),
      'Il manque quand une ligne n’a pas de dose mesurable, ou qu’un « à compléter » n’a pas de volume estimé.',
    ),
    item(
      capital(panel.unknown.sugar),
      'Il manque quand un ingrédient n’a pas de teneur en sucre, à renseigner dans Ingrédients.',
    ),
    item(
      capital(panel.unknown.acid),
      'Elle manque quand un ingrédient n’a pas d’acidité, à renseigner dans Ingrédients.',
    ),
    item(
      capital(panel.unknown.ratio),
      'Il manque quand l’acidité de la fiche vaut zéro, car le sucre ne peut alors lui être rapporté.',
    ),
    item(
      capital(panel.unknown.cost),
      'Il manque quand une ligne comptée n’a pas de prix, ou quand des prix HT et TTC se mélangent.',
    ),
    item(panel.showMissing, 'Déplie le détail des données manquantes, ligne par ligne.'),
    item(panel.hideMissing, 'Replie ce détail.'),
  ),
  section(
    detail.variantDialog.title,
    item(detail.variantDialog.name, 'Il est proposé d’après la fiche de départ et peut être remplacé.'),
    item(detail.variantDialog.cancel, 'Ferme sans créer de variante.'),
    item(detail.variantDialog.confirm, 'Crée le brouillon et l’ouvre.'),
  ),
  missing,
  section(
    'Une dégustation dans la fiche',
    item(journal.nextStepDone, 'Se coche une fois l’étape essayée, comme dans le journal.'),
    item(journal.delete, 'Met la note à la corbeille, avec « Annuler » pendant 8 secondes.'),
    item(forms.photo.add, 'Sur une note sans photo, ouvre la zone où en déposer une.'),
  ),
  section(
    'Les marques',
    item(detail.optional, 'La ligne est facultative.'),
    item(detail.garnishLine, 'La ligne est une décoration.'),
    item(r.doseMissing, 'La ligne attend sa dose, à donner avec « Modifier ».'),
    item(detail.current, 'Marque la version courante dans l’historique.'),
    item(detail.shelfLifeUnset, 'La préparation n’a pas de durée de conservation, donc pas de date limite.'),
    item(r.none, 'Le champ est resté vide dans l’éditeur.'),
    item(detail.backToList, 'Ce bouton apparaît quand la fiche n’existe plus.'),
  ),
  statuses,
  origins,
  printing,
  sharing,
)

export const recipeEditor = topic(
  'Éditeur de fiche',
  'L’éditeur montre la fiche complète, champ par champ. Rien n’est écrit avant « Enregistrer ».',
  section(
    editor.sections.essentials,
    item(
      editor.newTitle,
      'C’est le titre d’une fiche partie de rien. Pour une fiche existante, sa version courante est rappelée au-dessus.',
    ),
    item(ef.name, 'Il est obligatoire, comme l’ingrédient de chaque ligne.'),
    item(
      ef.kind,
      'Cocktail ou préparation maison. Une préparation devient aussi un ingrédient, utilisable dans les autres fiches.',
    ),
    item(
      ef.status,
      'Indique où en est la fiche. Une fiche finale nourrit la zone de référence de sa famille.',
    ),
    item(
      ef.origin,
      `Au choix : ${names(r.origins)}. Les classiques comptent aussi dans les zones de référence.`,
    ),
    item(ef.credit, 'Indique le bar, l’auteur ou la source. Il est rappelé sous le titre et à l’impression.'),
  ),
  section(
    editor.sections.lines,
    item(el.add, 'Ajoute une ligne et y place le curseur.'),
    item(
      el.ingredientPlaceholder,
      'La saisie d’un nom ou d’un alias cherche l’ingrédient. Un nom inconnu propose de le créer sur place.',
    ),
    item(
      'Dose',
      'Indique la quantité de la ligne. Les flèches avancent de 5 ml, 0,5 cl, 0,25 oz, ou d’une unité.',
    ),
    item(
      'Unité',
      `Au choix : ${names(r.units)}. Les grammes ne comptent en volume que si l’ingrédient a une masse volumique.`,
    ),
    item(
      el.topEstimateShort,
      'Avec « à compléter », indique le volume habituel de l’allongement. Sans lui, les calculs sont incomplets.',
    ),
    item(
      el.optional,
      'La ligne sort du volume, du degré, du coût et de la disponibilité. Ses allergènes sont signalés à part.',
    ),
    item(
      el.garnish,
      'La décoration sort du volume, du degré, de la disponibilité et des doses du mode préparation. Elle compte dans le coût.',
    ),
    item(
      el.bottle,
      'Elle désigne la bouteille précise de cette recette. Son degré, sa composition, son prix et ses allergènes passent avant. Le champ apparaît si l’ingrédient en a.',
    ),
    item(
      el.bottleAny,
      'Aucune bouteille n’est imposée. Le degré vient de l’ingrédient, le prix des bouteilles cochées Au bar.',
    ),
    item(
      el.notePlaceholder,
      'Une précision affichée sous la ligne, comme « infusé au thé ». Un allergène nommé ici est repris.',
    ),
    item(
      'Changer l’ordre',
      'Une ligne se déplace en tirant sa poignée, avec ses flèches, ou avec Alt et ↑ ou ↓ depuis la ligne.',
    ),
    item(
      'Retirer la ligne',
      'La corbeille au bout de la ligne la retire. Rien n’est perdu avant l’enregistrement.',
    ),
  ),
  section(
    editor.sections.service,
    item(ef.method, 'Elle fixe le taux de dilution par défaut.'),
    item(ef.glass, 'Indique le verre de service.'),
    item(ef.ice, 'Indique la glace de service.'),
    item(ef.family, `Au choix : ${names(r.families)}. Elle choisit la zone de référence de l’atelier.`),
    item(ef.length, 'Court ou long. Le champ sert aussi aux questions de révision.'),
    item(ef.moment, `Au choix : ${names(r.moments)}. Le champ sert aussi aux questions de révision.`),
    item(ef.profile, 'Quelques mots libres, retrouvés par la recherche.'),
    item(
      ef.dilution,
      'Un pourcentage propre à la fiche, qui remplace celui de la méthode. Vide, la méthode décide.',
    ),
  ),
  section(
    editor.sections.text,
    item(ef.steps, 'Une étape par ligne. Le gras et l’italique sont possibles.'),
    item(ef.garnish, 'La décoration en toutes lettres, pour la fiche, l’impression et le mode préparation.'),
    item(ef.garnishCost, 'Un forfait HT par verre, ajouté au coût.'),
    item(ef.notes, 'Un texte libre, avec gras, italique et listes.'),
    item(ef.tags, 'Des mots de classement séparés par des virgules. Ils se filtrent et se cherchent.'),
  ),
  section(
    editor.sections.prep,
    item(
      ef.yield,
      'Le volume obtenu. Il sert de base au degré, au sucre et au coût au millilitre de la préparation, et il est proposé à chaque fabrication.',
    ),
    item(
      ef.shelfLife,
      'Elle se fixe en jours. Zéro veut dire le jour même. Vide, aucune date limite n’est calculée. Shakery n’en propose jamais.',
    ),
    item(
      ef.category,
      'Elle range l’ingrédient dans Ingrédients. Elle dit aussi s’il se garde dans un batch.',
    ),
    item(
      ef.storage,
      'Les consignes de rangement, par exemple frigo, bouteille stérilisée ou à l’abri de la lumière.',
    ),
  ),
  section(
    'À côté',
    item(
      panel.title,
      'Les chiffres suivent la saisie un instant après. Leur détail est expliqué dans l’aide d’une fiche.',
    ),
    item(
      forms.photo.title,
      'Elle se choisit ici, et « Enregistrer » l’écrit. Une photo seule ne crée pas de version.',
    ),
    item(
      ef.newVersion,
      'Cochée pour une faute de frappe, elle réécrit la version courante sans en créer une autre.',
    ),
    item(
      ef.label,
      'Un petit nom pour s’y retrouver dans l’historique. Le champ est grisé pour une simple correction.',
    ),
  ),
  section(
    editor.sections.save,
    item(
      editor.leave.title,
      'Cette question est posée au départ de l’éditeur quand des modifications ne sont pas enregistrées.',
    ),
    item(editor.save, 'Vérifie les champs, enregistre et revient à la fiche. Un champ fautif est signalé.'),
    item(editor.cancel, 'Revient en arrière, avec confirmation après une modification.'),
    item(editor.leave.stay, 'Continue la saisie là où elle en était.'),
    item(editor.leave.leave, 'Part et abandonne les modifications.'),
  ),
  section(
    r.ingredientDialog.title,
    item(
      r.ingredientDialog.name,
      'Il reprend la saisie de la ligne. Un nom ou un alias identique est signalé.',
    ),
    item(
      r.ingredientDialog.category,
      'Ce champ est obligatoire. Degré et composition se complètent ensuite dans Ingrédients.',
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
  'L’atelier sert à régler une recette avant de prendre le shaker. Il travaille sur une copie, donc rien n’est enregistré sans une demande explicite.',
  section(
    l.pickTitle,
    item(l.filter, 'Filtre les cocktails par nom. La liste en montre 60, et un nom saisi trouve les autres.'),
    item(
      'Une ligne de la liste',
      'Elle montre le nom et la version courante. Un clic ouvre ce cocktail dans l’atelier.',
    ),
    item(l.blank, 'Ouvre un atelier vide, avec un nom à donner.'),
  ),
  section(
    'En haut',
    item(l.name, 'Pour une fiche partie de zéro. Un nom est nécessaire pour enregistrer.'),
    item(l.undo, 'Défait le dernier réglage, sans limite jusqu’au prochain enregistrement. Ctrl Z.'),
    item(l.redo, 'Refait ce qui a été défait. Ctrl Y, ou Ctrl Maj Z.'),
    item(l.compare, 'Passe du réglage à la comparaison, sans perdre le brouillon.'),
  ),
  section(
    l.lines,
    item(
      l.head.inGlass,
      'Cette colonne porte la case de chaque ligne. Décochée, la ligne sort des calculs pour montrer le mélange sans elle, et elle n’est pas enregistrée.',
    ),
    item(l.head.ingredient, 'Le nom de l’ingrédient de la ligne.'),
    item(
      l.head.dose,
      'Elle se règle avec les boutons − et +, les flèches, la molette quand le champ est actif, ou la saisie directe. Le pas se règle dans les paramètres et vaut 2,5 ml au départ. Les cuillères vont par demies, les grammes par 5.',
    ),
    item(l.head.unit, 'Elle change sans convertir le nombre : 30 ml devient 30 cl quand cl est choisi.'),
    item('La corbeille de la ligne', 'Retire l’ingrédient du brouillon. Ctrl Z le ramène.'),
    item(l.add, 'La saisie d’un nom ou d’un alias ajoute une ligne.'),
  ),
  section(
    l.indicators,
    item(
      'Le curseur plein',
      'Il montre la valeur du brouillon. Il bouge dès qu’une dose change. « incomplet » veut dire qu’une donnée manque dans Ingrédients.',
    ),
    item('Le repère creux', 'Il montre la valeur de la version enregistrée, pour mesurer l’écart.'),
    item(
      'La bande',
      'Elle montre la zone de référence de la famille, soit la moitié centrale des valeurs connues des fiches finales et des classiques de cette famille, du 25e au 75e centile. Ce n’est pas une norme.',
    ),
    item(
      l.zoneRecipes,
      'Indique le nombre de fiches qui font la zone. Au survol, il montre les noms des premières. Il en faut au moins cinq avec une valeur complète.',
    ),
    item(panel.abv, 'Il rapporte l’alcool au volume servi, dilution comprise.'),
    item(panel.sugar, 'Il s’exprime en grammes pour 100 ml servis.'),
    item(panel.acid, 'Elle s’exprime en grammes pour 100 ml servis.'),
    item(panel.ratio, 'Il divise le sucre par l’acidité.'),
    item(panel.volume, 'Il additionne les doses mesurables et l’eau de la glace.'),
    item(panel.dilution, 'Elle reprend le taux de la méthode, ou celui de la fiche.'),
    item(panel.cost, 'Il s’affiche quand chaque ligne comptée a un prix.'),
  ),
  section(
    'En bas',
    item(l.saveVersion, 'Écrit le brouillon comme version suivante. Actif dès que quelque chose a changé.'),
    item(l.versionLabel, 'Facultatif, il aide à relire l’historique.'),
    item(l.saveVariant, 'Crée une autre fiche, en brouillon, liée à celle de départ.'),
    item(l.variantName, 'Donne le nom de cette nouvelle fiche.'),
    item(l.saveNew, 'Crée la fiche en brouillon quand l’atelier part de zéro.'),
    item(l.confirm, 'Enregistre depuis la petite fenêtre de version ou de variante.'),
    item(l.cancel, 'Ferme la même fenêtre sans enregistrer.'),
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
    item(
      'La référence',
      'Elle occupe la première colonne. Les écarts des autres se lisent par rapport à elle.',
    ),
    item(
      'Les cases',
      'Elles choisissent le brouillon ou des versions. La comparaison compte trois colonnes au plus.',
    ),
    item(l.compareWith, 'Ajoute un autre cocktail ou une préparation à côté.'),
    item(l.draft, 'Il désigne la copie en cours, pas encore enregistrée.'),
    item(
      'Les différences',
      'Les ajouts, retraits, doses, méthode et verre sont en couleur. Chaque indicateur porte son écart chiffré.',
    ),
  ),
  section(
    'Lire une différence',
    item(display.diff.kinds.added, 'Signale une ligne que la référence n’a pas.'),
    item(display.diff.kinds.removed, 'Signale, barrée, une ligne de la référence absente ici.'),
    item(display.diff.kinds.increased, 'Signale une dose plus forte, avec l’écart.'),
    item(display.diff.kinds.decreased, 'Signale une dose plus faible, avec l’écart.'),
    item(display.diff.kinds.changed, 'La méthode ou le verre change.'),
    item(display.diff.method, 'Montre la méthode d’avant, puis celle de la colonne.'),
    item(display.diff.glass, 'Montre le verre d’avant, puis celui de la colonne.'),
    item(l.noChange, 'La colonne est identique à la première.'),
    item(l.reordered, 'Seul l’ordre des lignes diffère.'),
  ),
)

export const prepare = topic(
  p.eyebrow,
  'Ce mode affiche la recette en plein écran, lisible à un mètre, pendant la réalisation du cocktail. L’écran ne se met pas en veille.',
  section(
    'À l’écran',
    item('Le titre', 'Il donne le nom de la fiche.'),
    item(p.method, 'La méthode de la fiche, sous le titre.'),
    item(p.glass, 'Le verre de service.'),
    item(p.ice, 'La glace du verre.'),
    item(
      p.ingredients,
      'Les doses s’affichent en grand, dans l’unité des paramètres, alignées sur la plus large. Les lignes facultatives sont estompées.',
    ),
    item(p.optional, 'Écrit à côté d’un ingrédient facultatif.'),
    item(p.garnish, 'Décrit la décoration en toutes lettres.'),
    item(
      p.steps,
      'L’étape en cours ressort avec son numéro cuivré. Un clic sur une étape faite l’estompe, un autre la rétablit. Chaque fiche garde ses étapes faites jusqu’à la sortie du mode.',
    ),
  ),
  section(
    'Passer d’une fiche à l’autre',
    item(
      workshop.collections.prepare,
      'Ce bouton, dans une collection, ouvre le mode sur toutes ses fiches, dans leur ordre.',
    ),
    item(p.previous, 'Ce bouton, ou la flèche gauche, revient à la fiche précédente.'),
    item(p.next, 'Ce bouton, ou la flèche droite, passe à la fiche suivante.'),
  ),
  section(
    'Entrer et sortir',
    item(p.open, 'Ouvre ce mode depuis une fiche, avec le bouton ou F11, ou depuis la palette.'),
    item(p.exit, 'Ce bouton, Échap ou F11 referme le mode.'),
    item('F1', 'Ouvre cette aide. Une fois l’aide fermée, le mode préparation reste affiché.'),
  ),
)

export const print = topic(
  'Imprimer et partager',
  'Cette page couvre tout ce qui sort de Shakery : fiches, collections, batchs, étiquettes et fichiers.',
  printing,
  sharing,
  section(
    'Ailleurs dans l’application',
    item(
      workshop.collections.exportPdf,
      'Exporte toutes les fiches d’une collection en PDF, dans l’ordre, avec prix et notes.',
    ),
    item(
      workshop.calculators.batch.savePdf,
      'Crée, dans le calculateur de batch, la feuille de production avec des cases à cocher.',
    ),
    item(
      workshop.preps.label.action,
      'Imprime, dans Préparations, l’étiquette d’une bouteille sur rouleau ou planche.',
    ),
  ),
)
