/** Help of the bar, the preparations, the collections, the revision and the calculators (D-048). */
import { bar as b } from '../bar'
import { recipes } from '../recipes'
import { workshop as w } from '../workshop'
import { item, section, topic } from './model'

const d = b.detail
const fi = b.ingredientForm
const fp = b.productForm
const prep = w.preps
const c = w.collections
const pr = w.practice
const calc = w.calculators

export const bar = topic(
  b.title,
  'Tes ingrédients et tes bouteilles. C’est d’ici que viennent les calculs, les coûts et les fiches réalisables.',
  section(
    'La liste',
    item(b.newIngredient, 'Crée un ingrédient avec sa catégorie et sa composition.'),
    item(b.search, 'Par nom ou alias, sans tenir compte des accents.'),
    item('Les catégories', 'Les ingrédients y sont rangés par ordre alphabétique.'),
    item(b.prep, 'Cet ingrédient vient d’une de tes préparations.'),
    item(b.staple, 'Toujours considéré comme disponible, comme l’eau, la glace ou le sucre.'),
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
    item(d.merge, 'Pour un doublon : tout passe sur l’ingrédient que tu gardes.'),
    item(d.delete, 'Refusé tant qu’une fiche l’utilise : fusionne-le plutôt. Sinon, il part à la corbeille.'),
    item(
      d.abv,
      'La valeur type. Celle de la bouteille choisie sur une fiche passe avant. Vide, le degré des fiches concernées est incomplet.',
    ),
    item(d.sugar, 'En grammes par litre. Vide, le sucre des fiches concernées est incomplet.'),
    item(d.acid, 'En grammes par litre. Vide, l’acidité des fiches concernées est incomplète.'),
    item(d.density, 'Elle permet de compter en volume une dose en grammes.'),
    item(
      d.allergens,
      'Ceux déclarés ici, repris dans les fiches. Un ingrédient que tu crées n’en déclare aucun tant que tu ne les coches pas.',
    ),
    item(d.flavors, 'Ils servent au filtre de profil aromatique des fiches.'),
    item(d.aliases, 'Les autres noms qui le font trouver.'),
    item(d.usedBy, 'Toutes les fiches qui le contiennent. Clique pour en ouvrir une.'),
  ),
  section(
    d.bottles,
    item(
      'Je le possède',
      'L’interrupteur en tête. Sans bouteille, il en crée une au nom de l’ingrédient. Éteint, il les décoche toutes.',
    ),
    item(
      b.bottle.owned,
      'L’interrupteur d’une bouteille précise. Une seule suffit pour que l’ingrédient soit disponible.',
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
    item(fi.aliases, 'Séparés par des virgules.'),
    item(fi.flavors, 'Des mots comme agrume, herbacé, fumé, séparés par des virgules.'),
    item(fi.allergens, 'Les quatorze allergènes réglementaires. Recopie l’étiquette.'),
    item(fi.staple, 'À cocher pour ce que tu as toujours sous la main.'),
    item(fi.save, 'Enregistre. Les fiches recalculent aussitôt.'),
  ),
  section(
    'Formulaire d’une bouteille',
    item(
      fp.barcode,
      'De 6 à 14 chiffres. Une douchette USB le tape et fait Entrée, ce qui lance la recherche.',
    ),
    item(
      fp.lookup,
      'Interroge Open Food Facts, seule fonction en ligne. Le bouton disparaît sans réseau ou si tu l’as coupée dans les paramètres.',
    ),
    item(fp.lookupApply, 'Ne reprend que les champs cochés parmi ceux trouvés.'),
    item(fp.brand, 'Facultative, affichée devant le nom et cherchée.'),
    item(fp.name, 'Obligatoire.'),
    item(fp.abv, 'Celui de l’étiquette. Il prime quand la bouteille est choisie sur une fiche.'),
    item(fp.volume, 'En ml, indispensable pour un prix au millilitre.'),
    item(fp.sugar, 'En g/L. Il prime sur celui de l’ingrédient quand la bouteille est choisie.'),
    item(fp.acid, 'En g/L, avec la même priorité.'),
    item(fp.price, 'Ce que tu as payé la bouteille ou le lot.'),
    item(
      fp.basis,
      'HT ou TTC, obligatoire avec un prix. Les deux mélangés dans une recette rendent son coût incomplet.',
    ),
    item(
      fp.packQuantity,
      'Pour ce qui s’achète à la pièce : 6 citrons à 3 €, et la fiche compte 0,50 € par pièce.',
    ),
    item(
      fp.packUnit,
      'Elle doit être celle de la ligne de recette, et la bouteille choisie sur cette ligne. « portion » fait du prix un forfait par verre.',
    ),
    item(fp.notes, 'Ton avis, retrouvé par la recherche. Il ne part pas dans un partage sans ton accord.'),
    item(fp.allergens, 'Ils s’ajoutent à ceux de l’ingrédient quand la bouteille est choisie sur une fiche.'),
    item(fp.owned, 'Rend l’ingrédient disponible.'),
    item(fp.save, 'Enregistre la bouteille.'),
  ),
  section(
    'Fusion de doublons',
    item(b.merge.target, 'Celui qui garde son nom. L’autre devient un de ses alias.'),
    item(b.merge.preview, 'Ce qui va bouger : fiches, bouteilles et alias.'),
    item(b.merge.confirm, 'Fusionne pour de bon : il n’y a pas de bouton pour défusionner.'),
  ),
)

export const preps = topic(
  prep.title,
  'Sirops, cordiaux, infusions : chaque fabrication, sa date limite et son étiquette.',
  section(
    'L’écran',
    item(
      prep.newPrep,
      'Ouvre l’éditeur. Choisis « Préparation » comme type de fiche, puis rendement et conservation.',
    ),
    item('Le nom', 'Ouvre la fiche de la préparation.'),
    item(
      'Se garde',
      'La durée fixée sur la fiche, suivie du rendement. Sans durée, aucune date limite n’est calculée.',
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
    item(prep.batch.finish, 'Finie : la préparation n’est plus comptée disponible par cette fabrication.'),
    item(prep.batch.discard, 'Jetée, gardée dans l’historique.'),
    item(
      prep.batch.delete,
      'Pour une erreur de saisie. Ces trois boutons proposent « Annuler » pendant 8 secondes.',
    ),
  ),
  section(
    prep.newBatch,
    item(prep.batch.madeAt, 'Aujourd’hui par défaut, jamais dans le futur.'),
    item(prep.batch.quantity, 'Le rendement de la fiche, à corriger.'),
    item(
      'À consommer avant',
      'Le jour de fabrication plus la durée de conservation, en jours de calendrier, jusqu’au soir du dernier jour.',
    ),
    item(prep.batch.notes, 'Ce qui a changé cette fois.'),
    item(prep.batch.create, 'Rend la préparation disponible dans « réalisables » jusqu’à sa date limite.'),
  ),
  section(
    prep.label.title,
    item(
      'L’aperçu',
      'Le nom, les dates, le volume et les allergènes. Le texte rétrécit pour que tout tienne.',
    ),
    item(
      prep.label.format,
      `${Object.values(prep.label.formats).join('. ')}. Le format proposé au départ se règle dans les paramètres.`,
    ),
    item(prep.label.count, 'Une pour un rouleau, une planche entière sinon. Jusqu’à 100.'),
    item(prep.label.first, 'Pour finir une planche entamée : les cases d’avant restent vides.'),
    item(prep.label.allergens, 'Ceux déclarés par les ingrédients. Vérifie tes produits avant de coller.'),
    item(
      prep.label.savePdf,
      'Le PDF à la taille exacte du format. Sans durée de conservation, une ligne reste à remplir à la main.',
    ),
    item(
      prep.label.print,
      'Règle l’imprimante sur 100 %, sans « ajuster à la page », sinon les cases ne tombent pas juste.',
    ),
  ),
)

export const collections = topic(
  c.title,
  'Une carte, un concours, un thème : des fiches dans l’ordre que tu veux, à préparer, réviser, imprimer ou partager.',
  section(
    'La liste',
    item(c.add, 'Crée une collection vide.'),
    item('Une ligne', 'Son type et son nombre de fiches. Clique pour l’ouvrir.'),
  ),
  section(
    'La collection ouverte',
    item(c.prepare, 'Enchaîne ses fiches en mode préparation, dans leur ordre.'),
    item(c.practice, 'Ouvre la révision sur cette collection.'),
    item(
      c.exportPdf,
      'Un PDF avec le titre, la description, puis chaque fiche : doses, méthode, verre, garniture, étapes, prix et note.',
    ),
    item(c.shareOpen, 'Un fichier .shakery pour un collègue, avec fiches, préparations et ingrédients.'),
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
    item(c.sheet, 'Une fiche de culture venue d’un carnet importé : elle se révise, elle ne se prépare pas.'),
    item(c.note, 'Propre à cette collection, enregistrée quand tu quittes le champ, imprimée dans le PDF.'),
    item(
      c.price,
      'Ton prix sur cette carte, enregistré en quittant le champ, imprimé tel quel. Le prix conseillé est dans les calculateurs.',
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
    item(c.form.description, 'Affichée en tête et dans le PDF, gras, italique et listes possibles.'),
    item(c.form.save, 'Enregistre et ouvre la collection.'),
  ),
  section(
    'Partage',
    item(recipes.share.includePrivate, 'Décoché, tes dégustations, notes et prix d’achat restent chez toi.'),
    item(c.share.export, 'Choisis où enregistrer le fichier.'),
  ),
)

export const practice = topic(
  pr.title,
  'Connaître une carte par cœur, avec des questions tirées de ses fiches.',
  section(
    'Avant de commencer',
    item(pr.collection, 'Les questions ne viennent que d’elle. Il en faut au moins une.'),
    item(pr.length, '10, 20 ou 40, moins si la collection n’en donne pas assez.'),
    item(
      pr.modes.quiz,
      'Quatre réponses au choix. Sans assez de mauvaises réponses plausibles, la question devient une carte.',
    ),
    item(pr.modes.flashcards, 'Tu réponds de tête, tu retournes, tu te juges.'),
    item(
      'Les erreurs d’abord',
      'Une question ratée à son dernier passage repasse en tête de la séance suivante.',
    ),
    item(
      pr.start,
      'Grisé si la collection ne donne aucune question : il lui faut des doses, méthodes ou verres.',
    ),
  ),
  section(
    'Pendant la séance',
    item(
      'Les questions',
      'Doses, intrus, méthode, verre, glace, décoration, court ou long, moment, famille, recette à réciter, et les fiches de culture importées.',
    ),
    item(pr.reveal, 'Montre la réponse d’une carte.'),
    item(pr.knew, 'Compte un point.'),
    item(pr.didNotKnow, 'Compte une erreur, qui reviendra.'),
    item(pr.next, 'Après ta réponse au QCM, passe à la suite.'),
    item(pr.finish, 'À la dernière question : affiche le résultat et enregistre la séance.'),
    item(pr.quit, 'Sort sans enregistrer la séance.'),
  ),
  section(
    pr.result.title,
    item('Le score', 'Les bonnes réponses sur le total.'),
    item(pr.result.mistakes, 'Chaque erreur avec sa bonne réponse.'),
    item(pr.result.again, 'Une nouvelle séance avec les mêmes réglages.'),
    item(pr.result.back, 'Revient au choix de la séance.'),
    item(pr.history, 'Les douze dernières séances terminées, avec leur score.'),
  ),
)

export const calculators = topic(
  calc.title,
  'Les quatre calculs du bar, seuls ou à partir d’une fiche. Rien n’y modifie tes fiches.',
  section(
    calc.tabs.batch,
    item(calc.fromRecipe, 'La recette à multiplier. Un batch part toujours d’une fiche.'),
    item(calc.batch.target, 'Un nombre de verres, ou un volume à embouteiller.'),
    item(calc.batch.servings, 'De 1 à 500.'),
    item(
      calc.batch.targetVolume,
      'La bouteille à remplir avec ce qui se garde, eau comprise. Le nombre de verres en découle.',
    ),
    item(
      calc.batch.step,
      'Arrondit chaque volume à 1, 5, 10, 25 ou 50 ml. Une toute petite quantité reste au millilitre. Pièces, feuilles, tranches et quartiers montent à l’entier.',
    ),
    item(
      calc.batch.includeWater,
      'Ajoute dans la bouteille l’eau qu’aurait apportée la glace : volume d’un verre × dilution × verres. Coché d’office au verre à mélange et au verre. À décocher si tu secoues au service.',
    ),
    item(calc.batch.includeGarnish, 'Ajoute les décorations à la liste, sans les compter en volume.'),
    item(calc.batch.hints.ok, 'Ce qui se prépare à l’avance et se garde.'),
    item(
      calc.batch.hints.fresh,
      'Jus, œuf, crème, herbes : le jour même, jamais dans une bouteille que tu gardes.',
    ),
    item(calc.batch.hints.add_at_service, 'Les bulles, au dernier moment.'),
    item(calc.batch.bottle, 'Ce qui se garde, plus l’eau.'),
    item(calc.batch.fresh, 'Le total du frais, hors de la bouteille.'),
    item(calc.batch.service, 'Le total à ajouter en servant.'),
    item('Grammes', 'Une dose en grammes est multipliée mais ne compte pas dans le volume de la bouteille.'),
    item(calc.batch.savePdf, 'La feuille de production, en trois parties, avec des cases à cocher.'),
    item(calc.batch.print, 'La même feuille sur papier.'),
  ),
  section(
    calc.tabs.abv,
    item(
      calc.fromRecipe,
      'Charge volumes, degrés des ingrédients et dilution de la fiche, hors garnitures et options. Le degré d’une bouteille choisie n’est pas repris : corrige-le si besoin.',
    ),
    item(calc.abv.volume, 'En ml.'),
    item(
      calc.abv.lineAbv,
      'En % vol. Mets 0 pour un produit sans alcool : laissé vide, il est inconnu et aucun degré ne s’affiche.',
    ),
    item(calc.abv.addLine, 'Ajoute une ligne vide.'),
    item('La corbeille', 'Retire la ligne. Il en reste toujours une.'),
    item(calc.abv.dilution, 'L’eau de la glace, en pourcentage du volume de départ.'),
    item(calc.abv.after, 'Alcool divisé par le volume dilué.'),
    item(calc.abv.before, 'Alcool divisé par le volume versé.'),
    item(calc.abv.served, 'Volume versé × (1 + dilution).'),
  ),
  section(
    calc.tabs.convert,
    item(calc.convert.value, 'Le nombre à convertir.'),
    item(calc.convert.unit, 'ml, cl, once, trait, goutte, cuillère de bar ou à café.'),
    item(
      calc.convert.approx,
      'Trait, goutte et cuillères n’ont pas de volume officiel. Leurs valeurs, comme l’once à 30 ou 29,57 ml, se règlent dans les paramètres.',
    ),
  ),
  section(
    calc.tabs.cost,
    item(calc.cost.price, 'Ce qu’a coûté la bouteille.'),
    item(calc.cost.bottleVolume, 'Son volume en ml.'),
    item(calc.cost.dose, 'Le volume que tu verses.'),
    item(calc.cost.perDose, 'Prix ÷ contenance × dose.'),
    item(calc.cost.perLitre, 'Prix ÷ contenance × 1 000.'),
    item(calc.fromRecipe, 'Donne le coût matière d’une fiche d’après les prix de tes bouteilles.'),
    item(
      calc.cost.recipeCost,
      'Toujours ramené en HT : un coût TTC est divisé par 1,20. Il faut un prix pour chaque ligne comptée.',
    ),
    item(
      calc.cost.salePrice,
      'Coût HT × 5, arrondi aux 0,50 € supérieurs, lu comme un prix TTC. Le coefficient et la TVA de 20 % sont fixes.',
    ),
    item(calc.cost.ratio, 'Le coût HT divisé par le prix de vente HT.'),
  ),
)
