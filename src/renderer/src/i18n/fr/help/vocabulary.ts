/**
 * The words of the bar that the screens offer as choices (D-048): each is explained once and
 * shared by the topics where it can be chosen.
 */
import { componentsDisplay as display } from '../components-display'
import { recipes as r } from '../recipes'
import { item, section } from './model'

const { families: fam, methods: m, origins: o, units: u, panel } = r
const why = panel.reasons
const code = display.allergens

export const statuses = section(
  'Les statuts',
  item(display.status.idea, 'La fiche tient en un nom et quelques mots, à creuser.'),
  item(display.status.draft, 'La recette est en cours d’écriture. Une variante commence ici.'),
  item(
    display.status.testing,
    'La fiche est en cours d’essais. La plus récente devient la création en focus de l’accueil.',
  ),
  item(display.status.final, 'La recette est arrêtée. Elle entre dans la zone de référence de sa famille.'),
  item(
    display.status.archived,
    'La fiche est rangée sans être effacée. Elle reste dans la liste et dans la recherche.',
  ),
)

export const families = section(
  'Les familles',
  item(fam.sour, 'Il associe un spiritueux, un acide et un sucre, le plus souvent secoués.'),
  item(fam.spirit_forward, 'L’alcool mène, avec peu ou pas de jus. Il est le plus souvent remué.'),
  item(fam.highball, 'Un spiritueux est allongé d’une boisson, dans un verre haut.'),
  item(fam.fizz, 'C’est un sour allongé d’une boisson gazeuse.'),
  item(fam.flip, 'Le cocktail est lié à l’œuf entier ou au jaune.'),
  item(fam.tiki, 'La recette réunit souvent du rhum, des agrumes et des sirops épicés.'),
  item(fam.punch, 'Il réunit spiritueux, acide, sucre et allongement, souvent pour plusieurs.'),
  item(fam.shot, 'C’est une petite dose, bue d’un trait.'),
  item(fam.non_alcoholic, 'La recette ne contient aucun alcool.'),
  item(fam.other, 'Choisis-la toi-même quand aucune famille ne convient.'),
)

export const methods = section(
  'Les méthodes et leur dilution',
  item(m.shake, 'Le cocktail est secoué avec de la glace. La dilution vaut 25 % au départ.'),
  item(
    m.dry_shake,
    'Le cocktail est secoué sans glace pour la mousse, puis avec. La dilution vaut 25 % au départ.',
  ),
  item(m.stir, 'Le cocktail est remué sur glace dans un verre à mélange. La dilution vaut 20 % au départ.'),
  item(m.build, 'Le cocktail est construit dans le verre de service. La dilution vaut 10 % au départ.'),
  item(m.throw, 'Le cocktail est versé de haut d’un récipient à l’autre. La dilution vaut 20 % au départ.'),
  item(m.blend, 'Le cocktail est mixé avec de la glace. La dilution vaut 25 % au départ.'),
  item(
    m.swizzle,
    'Le cocktail est brassé dans la glace pilée avec un bâton. La dilution vaut 25 % au départ.',
  ),
  item(m.other, 'La technique est autre, ou non précisée. La dilution vaut 15 % au départ.'),
)

export const origins = section(
  'Les origines',
  item(o.mine, 'La recette est de toi.'),
  item(o.classic, 'C’est une recette de référence. Elle entre dans la zone de référence de sa famille.'),
  item(o.other, 'La recette vient de quelqu’un d’autre, et tu choisis de l’indiquer ainsi.'),
)

export const units = section(
  'Les unités',
  item(u.ml, 'Le millilitre est l’unité de tous les calculs.'),
  item(u.cl, 'Cette unité vaut 10 ml.'),
  item(u.oz, 'Cette unité vaut 30 ml, ou 29,57 ml selon tes paramètres.'),
  item(u.dash, 'Cette unité vaut 0,25 ml au départ, réglable dans les paramètres.'),
  item(u.drop, 'Cette unité vaut 0,05 ml au départ, réglable.'),
  item(u.barspoon, 'Cette unité vaut 5 ml au départ, réglable.'),
  item(u.tsp, 'Cette unité vaut 5 ml au départ, réglable.'),
  item(u.g, 'Le gramme compte en volume seulement si l’ingrédient a une masse volumique.'),
  item(u.piece, 'Cette unité se compte, sans volume ni degré.'),
  item(u.leaf, 'Cette unité se compte, sans volume ni degré.'),
  item(u.slice, 'Cette unité se compte, sans volume ni degré.'),
  item(u.wedge, 'Cette unité se compte, sans volume ni degré.'),
  item(u.top, 'Cette unité désigne un allongement. Son volume estimé entre dans les calculs.'),
  item(u.to_taste, 'La ligne n’a pas de dose, donc elle reste hors des calculs.'),
)

export const missing = section(
  'Ce que dit « Manque »',
  item(why.missing_quantity, 'La ligne n’a pas de dose. Donne-lui en une dans l’éditeur.'),
  item(why.top_without_estimate, 'Un « à compléter » n’a pas de volume estimé. Saisis-le dans l’éditeur.'),
  item(why.missing_abv, 'Renseigne le degré de l’ingrédient ou de sa bouteille dans Mon bar, 0 sans alcool.'),
  item(why.missing_sugar, 'Renseigne le sucre de l’ingrédient ou de sa bouteille, 0 s’il n’y en a pas.'),
  item(why.missing_acid, 'Renseigne l’acidité de l’ingrédient ou de sa bouteille, 0 s’il n’y en a pas.'),
  item(why.missing_price, 'Ajoute une bouteille possédée, avec prix, base HT ou TTC et contenance.'),
  item(why.mixed_price_basis, 'La recette mélange des prix HT et TTC. Saisis-les tous dans la même base.'),
  item(why.unknown_ingredient, 'L’ingrédient de la ligne n’existe plus. Choisis-en un autre.'),
  item(why.cycle, 'Une préparation finit par se contenir elle-même. Change une de ses lignes.'),
)

export const allergens = section(
  'Les quatorze allergènes',
  item(code.gluten, 'Par exemple certaines bières et boissons maltées.'),
  item(code.crustaceans, 'Par exemple une infusion de crevette.'),
  item(code.eggs, 'Par exemple le blanc d’œuf des sours et les liqueurs aux œufs.'),
  item(code.fish, 'Par exemple la sauce Worcestershire, souvent aux anchois.'),
  item(code.peanuts, 'Par exemple un spiritueux infusé à la cacahuète.'),
  item(code.soy, 'Par exemple le lait ou la sauce de soja.'),
  item(code.milk, 'Par exemple la crème et les liqueurs à la crème.'),
  item(code.nuts, 'Par exemple l’orgeat et certaines liqueurs d’amande ou de noisette.'),
  item(code.celery, 'Par exemple un bitter ou un sel de céleri.'),
  item(code.mustard, 'Par exemple une graine ou une sauce de moutarde.'),
  item(code.sesame, 'Par exemple une huile de sésame ou du tahini.'),
  item(code.sulphites, 'Par exemple les vins, les vermouths et certains jus ou fruits secs.'),
  item(code.lupin, 'Par exemple une farine ou une protéine de lupin.'),
  item(code.molluscs, 'Par exemple l’huître et la sauce d’huître.'),
  item(
    'Ces exemples',
    'Ils aident à y penser sans former une liste complète. L’étiquette du produit fait foi.',
  ),
)
