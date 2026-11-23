/** Help of the bar, the preparations, the collections, the revision and the calculators (D-048). */
import { bar as b } from '../bar'
import { componentsDisplay as display } from '../components-display'
import { recipes } from '../recipes'
import { workshop as w } from '../workshop'
import { item, section, topic } from './model'
import { allergens, units } from './vocabulary'

const d = b.detail
const fi = b.ingredientForm
const fp = b.productForm
const prep = w.preps
const c = w.collections
const pr = w.practice
const calc = w.calculators

export const bar = topic(
  b.title,
  'Cet écran regroupe tes ingrédients et tes bouteilles. Les calculs, les coûts et les fiches réalisables en dépendent.',
  section(
    'La liste',
    item(b.newIngredient, 'Crée un ingrédient avec sa catégorie et sa composition.'),
    item(b.search, 'Filtre par nom ou alias, sans tenir compte des accents.'),
    item('Les catégories', 'Les ingrédients y sont rangés par ordre alphabétique.'),
    item('Choisir', 'Un clic sur un nom ouvre l’ingrédient à droite : composition, bouteilles et fiches.'),
    item(b.prep, 'Cet ingrédient vient d’une de tes préparations.'),
    item(b.staple, 'Il est toujours considéré comme disponible, comme l’eau, la glace ou le sucre.'),
  ),
  section(
    'Sans ingrédient choisi',
    item(
      'Réalisables ce soir',
      'Les cocktails dont rien ne manque : bouteille possédée, ingrédient de base, ou fabrication maison non expirée. Optionnels et garnitures ne comptent pas.',
    ),
    item(
      w.bar.shopping.title,
      'Les dix achats qui débloquent le plus de cocktails, chacun étant le seul ingrédient qui manque. Clique pour l’ouvrir.',
    ),
  ),
  section(
    'Un ingrédient',
    item(d.edit, 'Ouvre ses champs.'),
    item(d.merge, 'Fusionne un doublon. Tout passe sur l’ingrédient que tu gardes.'),
    item(
      d.delete,
      'La suppression est refusée tant qu’une fiche l’utilise. Fusionne-le plutôt. Sinon, il part à la corbeille.',
    ),
    item(
      d.abv,
      'C’est la valeur type. Celle de la bouteille choisie sur une fiche passe avant. S’il est vide, le degré des fiches concernées est incomplet.',
    ),
    item(
      d.sugar,
      'Il est en grammes par litre. S’il est vide, le sucre des fiches concernées est incomplet.',
    ),
    item(
      d.acid,
      'Elle est en grammes par litre. Si elle est vide, l’acidité des fiches concernées est incomplète.',
    ),
    item(d.density, 'Elle permet de compter en volume une dose en grammes.'),
    item(
      d.allergens,
      'Ceux déclarés ici sont repris dans les fiches. Un ingrédient que tu crées n’en déclare aucun tant que tu ne les coches pas.',
    ),
    item(d.flavors, 'Ils servent au filtre de profil aromatique des fiches.'),
    item(d.aliases, 'Les autres noms qui le font trouver.'),
    item(d.usedBy, 'Toutes les fiches qui le contiennent. Clique pour en ouvrir une.'),
  ),
  section(
    d.bottles,
    item(
      'Je le possède',
      'C’est l’interrupteur en tête. Sans bouteille, il en crée une au nom de l’ingrédient. Éteint, il les décoche toutes.',
    ),
    item(
      b.bottle.owned,
      'C’est l’interrupteur d’une bouteille précise. Une seule suffit pour que l’ingrédient soit disponible.',
    ),
    item(d.addBottle, 'Ajoute un produit précis : marque, contenance, degré, prix.'),
    item('Le crayon', 'Modifie la bouteille.'),
    item(
      'La corbeille',
      'Supprime après confirmation. Les fiches qui la préféraient reviennent aux autres bouteilles.',
    ),
  ),
  section(
    'Formulaire d’un ingrédient',
    item(fi.name, 'Unique dans sa catégorie, alias compris.'),
    item(
      fi.category,
      'Elle range l’ingrédient. Elle dit aussi au batch s’il va en bouteille, à part ou au service.',
    ),
    item(fi.abv, 'En % vol. Mets 0 pour un produit sans alcool : vide veut dire inconnu.'),
    item(fi.sugar, 'En g/L, d’après l’étiquette ou une table. Mets 0 s’il n’y en a pas.'),
    item(fi.acid, 'En g/L. Mets 0 s’il n’y en a pas.'),
    item(fi.density, 'En g/ml, 1,59 pour du sucre dissous.'),
    item(
      fi.source,
      `D’où viennent sucre et acidité : ${Object.values(b.sources).join(', ')}. C’est pour ta mémoire.`,
    ),
    item(fi.confidence, '« Estimée » marque comme estimés les chiffres des fiches qui s’en servent.'),
    item(b.confidenceOptions.sourced, 'La valeur vient d’une étiquette ou d’une table.'),
    item(fi.aliases, 'Séparés par des virgules.'),
    item(fi.flavors, 'Des mots comme agrume, herbacé, fumé, séparés par des virgules.'),
    item(fi.allergens, 'Ce sont les quatorze allergènes réglementaires. Recopie l’étiquette.'),
    item(fi.staple, 'À cocher pour ce que tu as toujours sous la main.'),
    item(fi.save, 'Enregistre. Les fiches recalculent aussitôt.'),
  ),
  section(
    fp.createTitle,
    item(
      fp.barcode,
      'De 6 à 14 chiffres. Une douchette USB le tape et fait Entrée, ce qui lance la recherche.',
    ),
    item(
      fp.lookup,
      'Interroge Open Food Facts sur Internet. Le bouton disparaît sans réseau ou si tu l’as coupée dans les paramètres.',
    ),
    item(fp.lookupApply, 'Ne reprend que les champs cochés parmi ceux trouvés.'),
    item(fp.brand, 'Elle est facultative, s’affiche devant le nom et sert à la recherche.'),
    item(fp.name, 'Obligatoire.'),
    item(fp.abv, 'C’est celui de l’étiquette. Il prime quand la bouteille est choisie sur une fiche.'),
    item(fp.volume, 'Elle est en ml et reste indispensable pour un prix au millilitre.'),
    item(fp.sugar, 'Il est en g/L. Il prime sur celui de l’ingrédient quand la bouteille est choisie.'),
    item(fp.acid, 'Elle est en g/L, avec la même priorité.'),
    item(fp.price, 'C’est ce que tu as payé la bouteille ou le lot.'),
    item(
      fp.basis,
      'Elle indique HT ou TTC et devient obligatoire avec un prix. Les deux mélangés dans une recette rendent son coût incomplet.',
    ),
    item(
      fp.packQuantity,
      'Elle sert pour ce qui s’achète à la pièce. Pour 6 citrons à 3 €, la fiche compte 0,50 € par pièce.',
    ),
    item(
      fp.packUnit,
      'Elle doit être celle de la ligne de recette, et la bouteille choisie sur cette ligne. « portion » fait du prix un forfait par verre.',
    ),
    item('Les unités d’un lot', `Au choix : ${Object.values(b.packUnits).join(', ')}.`),
    item(
      fp.notes,
      'C’est ton avis, retrouvé par la recherche. Il ne part pas dans un partage sans ton accord.',
    ),
    item(fp.allergens, 'Ils s’ajoutent à ceux de l’ingrédient quand la bouteille est choisie sur une fiche.'),
    item(fp.owned, 'Rend l’ingrédient disponible.'),
    item(fp.save, 'Enregistre la bouteille.'),
  ),
  section(
    'Fusion de doublons',
    item(b.merge.target, 'C’est celui qui garde son nom. L’autre devient un de ses alias.'),
    item(b.merge.preview, 'Il montre ce qui va bouger : fiches, bouteilles et alias.'),
    item(b.merge.confirm, 'La fusion est définitive, car aucun bouton ne permet de défusionner.'),
  ),
  section(
    'Suppressions',
    item(
      b.remove.confirm,
      'Dans la fenêtre de confirmation, efface l’ingrédient ou la bouteille. La corbeille des paramètres permet de revenir.',
    ),
    item(b.remove.cancel, 'Garde tout en l’état.'),
    item(b.offAttribution, 'La mention rappelle les bouteilles remplies depuis Open Food Facts.'),
  ),
  allergens,
)

export const preps = topic(
  prep.title,
  'Cet écran suit chaque fabrication de sirop, cordial ou infusion, avec sa date limite et son étiquette.',
  section(
    'L’écran',
    item(
      prep.newPrep,
      'Ouvre l’éditeur. Choisis « Préparation » comme type de fiche, puis rendement et conservation.',
    ),
    item('Le nom', 'Ouvre la fiche de la préparation.'),
    item(
      'Se garde',
      'Il affiche la durée fixée sur la fiche, suivie du rendement. Sans durée, aucune date limite n’est calculée.',
    ),
    item(prep.newBatch, 'Enregistre ce que tu viens de fabriquer.'),
    item(
      'La pastille',
      'Verte tant qu’il reste du temps, jaune dans le délai d’alerte des paramètres, rouge une fois expirée. Elle porte toujours le nombre de jours.',
    ),
    item(prep.batch.history, 'Déplie celles qui sont terminées ou jetées.'),
  ),
  section(
    'Une fabrication',
    item(prep.label.action, 'Ouvre l’étiquette de cette bouteille.'),
    item(
      prep.batch.statuses.active,
      'La fabrication en cours est visible sur la carte. Les terminées et les jetées sont dans les fabrications passées.',
    ),
    item(
      prep.batch.finish,
      'Marque la fabrication comme finie. La préparation n’est plus comptée disponible par elle.',
    ),
    item(prep.batch.discard, 'Marque la fabrication comme jetée et la garde dans l’historique.'),
    item(
      prep.batch.delete,
      'Sert à corriger une erreur de saisie. Ces trois boutons proposent « Annuler » pendant 8 secondes.',
    ),
  ),
  section(
    prep.newBatch,
    item(prep.batch.madeAt, 'La date est aujourd’hui par défaut, jamais dans le futur.'),
    item(prep.batch.quantity, 'Elle reprend le rendement de la fiche, à corriger.'),
    item(
      'À consommer avant',
      'La date vaut le jour de fabrication plus la durée de conservation, en jours de calendrier, jusqu’au soir du dernier jour.',
    ),
    item(prep.batch.notes, 'Note ce qui a changé cette fois.'),
    item(prep.batch.cancel, 'Ferme sans rien enregistrer.'),
    item(prep.batch.create, 'Rend la préparation disponible dans « réalisables » jusqu’à sa date limite.'),
  ),
  section(
    prep.label.title,
    item(
      'L’aperçu',
      'Il montre le nom, les dates, le volume et les allergènes. Le texte rétrécit pour que tout tienne.',
    ),
    item(
      prep.label.format,
      `${Object.values(prep.label.formats).join('. ')}. Le format proposé au départ se règle dans les paramètres.`,
    ),
    item(prep.label.count, 'Il vaut une pour un rouleau, une planche entière sinon, et va jusqu’à 100.'),
    item(prep.label.first, 'Elle sert à finir une planche entamée. Les cases d’avant restent vides.'),
    item(
      prep.label.allergens,
      'Ce sont ceux déclarés par les ingrédients. Vérifie tes produits avant de coller.',
    ),
    item(
      prep.label.savePdf,
      'Crée le PDF à la taille exacte du format. Sans durée de conservation, une ligne reste à remplir à la main.',
    ),
    item(
      prep.label.print,
      'Règle l’imprimante sur 100 %, sans « ajuster à la page », sinon les cases ne tombent pas juste.',
    ),
  ),
  section(
    'Les pastilles',
    item(display.expiry.none, 'Elle est grise, car la fiche n’a pas de durée de conservation.'),
    item(display.expiry.today, 'Elle est jaune, car c’est le dernier jour.'),
    item(display.expiry.tomorrow, 'Elle est jaune, car il reste un jour.'),
  ),
)

export const collections = topic(
  c.title,
  'Une collection range des fiches dans l’ordre voulu (carte, concours, thème) pour les préparer, réviser, imprimer ou partager.',
  section(
    'La liste',
    item(c.add, 'Crée une collection vide.'),
    item('Une ligne', 'Elle affiche son type et son nombre de fiches. Clique pour l’ouvrir.'),
  ),
  section(
    'La collection ouverte',
    item(c.prepare, 'Enchaîne ses fiches en mode préparation, dans leur ordre.'),
    item(c.practice, 'Ouvre la révision sur cette collection.'),
    item(
      c.exportPdf,
      'Crée un PDF avec le titre, la description, puis chaque fiche : doses, méthode, verre, garniture, étapes, prix et note.',
    ),
    item(c.shareOpen, 'Crée un fichier .shakery pour un collègue, avec fiches, préparations et ingrédients.'),
    item(c.edit, 'Change son nom, son type ou sa description.'),
    item(
      c.delete,
      'Met la collection à la corbeille, avec « Annuler » pendant 8 secondes. Les fiches ne bougent pas.',
    ),
    item(c.addRecipes, 'Tape un nom : la fiche arrive en fin de liste.'),
  ),
  section(
    'Une ligne de la collection',
    item('Le nom', 'Ouvre la fiche.'),
    item(
      c.sheet,
      'C’est une fiche de culture venue d’un carnet importé. Elle se révise mais ne se prépare pas.',
    ),
    item(
      c.note,
      'Elle est propre à cette collection, enregistrée quand tu quittes le champ et imprimée dans le PDF.',
    ),
    item(
      c.price,
      'C’est ton prix sur cette carte, enregistré en quittant le champ et imprimé tel quel. Le prix conseillé est dans les calculateurs.',
    ),
    item('Les flèches', 'Montent ou descendent la ligne. C’est l’ordre du PDF et de la préparation.'),
    item(
      'La corbeille',
      'Retire la fiche de la collection tout de suite, sans « Annuler ». La fiche existe toujours.',
    ),
  ),
  section(
    'Formulaire d’une collection',
    item(c.form.name, 'Obligatoire.'),
    item(c.form.kind, `${Object.values(c.kinds).join(', ')}.`),
    item(
      c.form.description,
      'Elle s’affiche en tête et dans le PDF, avec gras, italique et listes possibles.',
    ),
    item(c.form.cancel, 'Ferme sans rien enregistrer.'),
    item(c.form.save, 'Enregistre et ouvre la collection.'),
  ),
  section(
    'Partage',
    item(recipes.share.includePrivate, 'Décoché, tes dégustations, notes et prix d’achat restent chez toi.'),
    item(c.share.cancel, 'Ferme sans créer de fichier.'),
    item(c.share.export, 'Choisis où enregistrer le fichier.'),
  ),
)

export const practice = topic(
  pr.title,
  'La révision aide à connaître une carte par cœur, avec des questions tirées de ses fiches.',
  section(
    'Avant de commencer',
    item(pr.collection, 'Les questions ne viennent que d’elle. Il en faut au moins une.'),
    item(pr.length, 'Tu choisis 10, 20 ou 40, moins si la collection n’en donne pas assez.'),
    item(pr.mode, 'QCM ou cartes mémoire.'),
    item(
      pr.modes.quiz,
      'Chaque question propose de deux à quatre réponses. Sans assez de mauvaises réponses plausibles, la question devient une carte.',
    ),
    item(pr.modes.flashcards, 'Tu réponds de tête, puis tu retournes la carte pour te juger.'),
    item(
      'Les erreurs d’abord',
      'Une question ratée à son dernier passage repasse en tête de la séance suivante.',
    ),
    item(
      pr.start,
      'Il est grisé si la collection ne donne aucune question. Il lui faut des doses, méthodes ou verres.',
    ),
  ),
  section(
    'Pendant la séance',
    item(
      'Les questions',
      'Elles portent sur doses, intrus, méthode, verre, glace, décoration, court ou long, moment, famille, recette à réciter, et les fiches de culture importées.',
    ),
    item(pr.reveal, 'Montre la réponse d’une carte.'),
    item(pr.knew, 'Compte un point.'),
    item(pr.didNotKnow, 'Compte une erreur, qui reviendra.'),
    item(pr.next, 'Après ta réponse au QCM, passe à la suite.'),
    item(pr.finish, 'À la dernière question, il affiche le résultat et enregistre la séance.'),
    item(pr.quit, 'Sort sans enregistrer la séance.'),
  ),
  section(
    pr.result.title,
    item('Le score', 'Il compte les bonnes réponses sur le total.'),
    item(pr.result.mistakes, 'Chaque erreur s’affiche avec sa bonne réponse.'),
    item(pr.result.again, 'Lance une nouvelle séance avec les mêmes réglages.'),
    item(pr.result.back, 'Revient au choix de la séance.'),
    item(pr.history, 'Il liste les douze dernières séances terminées, avec leur score.'),
  ),
)

export const calculators = topic(
  calc.title,
  'Cet écran fait les quatre calculs du bar, seuls ou à partir d’une fiche. Il ne modifie pas tes fiches.',
  section(
    calc.tabs.batch,
    item(calc.batch.start, 'Le batch part d’une fiche de ton carnet ou d’une recette écrite ici sans fiche.'),
    item(calc.batch.starts.recipe, 'Les doses, la méthode et la dilution viennent de la fiche.'),
    item(
      calc.batch.starts.manual,
      'Tu écris chaque ingrédient, sa dose et où il va. Rien n’est enregistré dans le carnet.',
    ),
    item(calc.fromRecipe, 'Choisis la recette à multiplier quand le batch part d’une fiche.'),
    item(calc.batch.manualTitle, 'Sans fiche, ce sont les lignes du batch, une par ingrédient.'),
    item(calc.batch.name, 'C’est le titre de la feuille imprimée. S’il est vide, elle s’appelle « Batch ».'),
    item(calc.batch.dosePerDrink, 'Elle est en ml, pour un seul verre.'),
    item(
      calc.batch.where,
      'Il range la ligne dans la bouteille, en frais le jour même ou au service, comme pour une fiche.',
    ),
    item(
      calc.batch.addLine,
      'Ajoute une ligne, jusqu’à trente. Une ligne sans nom ou sans dose ne compte pas.',
    ),
    item(
      calc.batch.dilution,
      'Sans fiche, elle donne en pourcentage l’eau de la glace, pour l’eau de dilution mise en bouteille.',
    ),
    item(calc.batch.target, 'Tu vises un nombre de verres ou un volume à embouteiller.'),
    item(calc.batch.byServings, 'Tu donnes le nombre de verres, il donne les volumes.'),
    item(calc.batch.byVolume, 'Tu donnes le volume, il donne le nombre de verres.'),
    item(calc.batch.servings, 'Il va de 1 à 500.'),
    item(
      calc.batch.targetVolume,
      'C’est la bouteille à remplir avec ce qui se garde, eau comprise. Le nombre de verres en découle.',
    ),
    item(
      calc.batch.step,
      'Arrondit chaque volume à 1, 5, 10, 25 ou 50 ml. Une toute petite quantité reste au millilitre. Pièces, feuilles, tranches et quartiers montent à l’entier.',
    ),
    item(
      calc.batch.includeWater,
      'Ajoute dans la bouteille l’eau qu’aurait apportée la glace : volume d’un verre × dilution × verres. Il est coché d’office au verre à mélange et au verre. Décoche-le si tu secoues au service.',
    ),
    item(calc.batch.includeGarnish, 'Ajoute les décorations à la liste, sans les compter en volume.'),
    item(calc.batch.hints.ok, 'Ce sont les ingrédients qui se préparent à l’avance et se gardent.'),
    item(
      calc.batch.hints.fresh,
      'Jus, œuf, crème et herbes s’ajoutent le jour même, jamais dans une bouteille que tu gardes.',
    ),
    item(calc.batch.hints.add_at_service, 'Les bulles s’ajoutent au dernier moment.'),
    item(calc.batch.bottle, 'Il compte ce qui se garde, plus l’eau.'),
    item(calc.batch.fresh, 'Il donne le total du frais, hors de la bouteille.'),
    item(calc.batch.service, 'Il donne le total à ajouter en servant.'),
    item(
      'Grammes',
      'Une dose en grammes compte dans le volume de la bouteille si l’ingrédient a une masse volumique, renseignée dans Mon bar.',
    ),
    item(
      calc.batch.ingredient,
      'Chaque ligne affiche sa quantité dans l’unité de la fiche et son volume en ml.',
    ),
    item(calc.batch.quantity, 'C’est la dose multipliée, dans l’unité de la fiche.'),
    item(calc.batch.volume, 'C’est la même, en millilitres, arrondie au pas choisi.'),
    item(calc.batch.water, 'La ligne d’eau apparaît quand l’interrupteur est allumé.'),
    item(calc.batch.optional, 'La ligne est listée, mais hors des totaux.'),
    item(calc.batch.total, 'Sur la feuille imprimée, il donne la somme de chaque partie.'),
    item(calc.batch.savePdf, 'Crée la feuille de production en trois parties, avec des cases à cocher.'),
    item(calc.batch.print, 'Imprime la même feuille sur papier.'),
  ),
  section(
    calc.tabs.abv,
    item(
      calc.fromRecipe,
      'Charge volumes, degrés des ingrédients et dilution de la fiche, hors garnitures et options. Le degré d’une bouteille choisie n’est pas repris : corrige-le si besoin.',
    ),
    item(calc.abv.lines, 'Chaque ligne porte un volume et un degré par ingrédient versé.'),
    item(calc.abv.volume, 'En ml.'),
    item(
      calc.abv.lineAbv,
      'En % vol. Mets 0 pour un produit sans alcool : laissé vide, il est inconnu et aucun degré ne s’affiche.',
    ),
    item(calc.abv.addLine, 'Ajoute une ligne vide.'),
    item('La corbeille', 'Retire la ligne. Il en reste toujours une.'),
    item(calc.abv.dilution, 'Elle donne l’eau de la glace, en pourcentage du volume de départ.'),
    item(calc.abv.after, 'Alcool divisé par le volume dilué.'),
    item(calc.abv.before, 'Alcool divisé par le volume versé.'),
    item(calc.abv.served, 'Volume versé × (1 + dilution).'),
  ),
  section(
    calc.tabs.convert,
    item(calc.convert.value, 'C’est le nombre à convertir.'),
    item(calc.convert.unit, 'ml, cl, once, trait, goutte, cuillère de bar ou à café.'),
    item(
      calc.convert.approx,
      'Trait, goutte et cuillères n’ont pas de volume officiel. Leurs valeurs, comme l’once à 30 ou 29,57 ml, se règlent dans les paramètres.',
    ),
  ),
  section(
    calc.tabs.cost,
    item(calc.cost.price, 'C’est ce qu’a coûté la bouteille.'),
    item(calc.cost.bottleVolume, 'C’est son volume en ml.'),
    item(calc.cost.dose, 'C’est le volume que tu verses.'),
    item(calc.cost.perDose, 'Prix ÷ contenance × dose.'),
    item(calc.cost.perLitre, 'Prix ÷ contenance × 1 000.'),
    item(calc.fromRecipe, 'Donne le coût matière d’une fiche d’après les prix de tes bouteilles.'),
    item(
      calc.cost.recipeCost,
      'Toujours ramené en HT : un coût TTC est divisé par 1 + TVA. Il faut un prix pour chaque ligne comptée.',
    ),
    item(
      calc.cost.salePrice,
      'Coût HT × coefficient, arrondi, lu comme un prix TTC. Coefficient, TVA et arrondi se règlent dans les paramètres : × 5, 20 % et 0,50 € au-dessus au départ.',
    ),
    item(calc.cost.ratio, 'Il divise le coût HT par le prix de vente HT.'),
  ),
  units,
)
