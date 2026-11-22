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
  item(display.status.idea, 'Un nom, quelques mots : à creuser.'),
  item(display.status.draft, 'Une recette en cours d’écriture. Une variante commence ici.'),
  item(
    display.status.testing,
    'En cours d’essais. La plus récente devient la création en focus de l’accueil.',
  ),
  item(display.status.final, 'Arrêtée. Elle entre dans la zone de référence de sa famille.'),
  item(display.status.archived, 'Rangée, sans être effacée. Elle reste dans la liste et dans la recherche.'),
)

export const families = section(
  'Les familles',
  item(fam.sour, 'Un spiritueux, un acide, un sucre, le plus souvent secoués.'),
  item(fam.spirit_forward, 'L’alcool mène, avec peu ou pas de jus. Le plus souvent remué.'),
  item(fam.highball, 'Un spiritueux allongé d’une boisson, dans un verre haut.'),
  item(fam.fizz, 'Un sour allongé d’une boisson gazeuse.'),
  item(fam.flip, 'Un cocktail lié à l’œuf entier ou au jaune.'),
  item(fam.tiki, 'Souvent du rhum, des agrumes et des sirops épicés.'),
  item(fam.punch, 'Spiritueux, acide, sucre et allongement, souvent pour plusieurs.'),
  item(fam.shot, 'Une petite dose, bue d’un trait.'),
  item(fam.non_alcoholic, 'Aucun alcool dans la recette.'),
  item(fam.other, 'À choisir toi-même quand aucune famille ne convient.'),
)

export const methods = section(
  'Les méthodes et leur dilution',
  item(m.shake, 'Secoué avec de la glace. 25 % d’eau au départ.'),
  item(m.dry_shake, 'Secoué une fois sans glace pour la mousse, puis avec. 25 % au départ.'),
  item(m.stir, 'Remué sur glace dans un verre à mélange. 20 % au départ.'),
  item(m.build, 'Construit dans le verre de service. 10 % au départ.'),
  item(m.throw, 'Versé de haut d’un récipient à l’autre. 20 % au départ.'),
  item(m.blend, 'Mixé avec de la glace. 25 % au départ.'),
  item(m.swizzle, 'Brassé dans la glace pilée avec un bâton. 25 % au départ.'),
  item(m.other, 'Une autre technique, ou aucune précisée. 15 % au départ.'),
)

export const origins = section(
  'Les origines',
  item(o.mine, 'Une recette à toi.'),
  item(o.classic, 'Une recette de référence. Elle entre dans la zone de référence de sa famille.'),
  item(o.other, 'La recette de quelqu’un d’autre, quand tu choisis de l’indiquer ainsi.'),
)

export const units = section(
  'Les unités',
  item(u.ml, 'Millilitre, l’unité de tous les calculs.'),
  item(u.cl, '10 ml.'),
  item(u.oz, '30 ml, ou 29,57 ml selon tes paramètres.'),
  item(u.dash, '0,25 ml au départ, réglable dans les paramètres.'),
  item(u.drop, '0,05 ml au départ, réglable.'),
  item(u.barspoon, '5 ml au départ, réglable.'),
  item(u.tsp, '5 ml au départ, réglable.'),
  item(u.g, 'Compte en volume seulement si l’ingrédient a une masse volumique.'),
  item(u.piece, 'Se compte, sans volume ni degré.'),
  item(u.leaf, 'Se compte, sans volume ni degré.'),
  item(u.slice, 'Se compte, sans volume ni degré.'),
  item(u.wedge, 'Se compte, sans volume ni degré.'),
  item(u.top, 'Un allongement. Son volume estimé entre dans les calculs.'),
  item(u.to_taste, 'Sans dose, donc hors des calculs.'),
)

export const missing = section(
  'Ce que dit « Manque »',
  item(why.missing_quantity, 'La ligne n’a pas de dose. Donne-lui en une dans l’éditeur.'),
  item(why.top_without_estimate, 'Un « à compléter » sans volume estimé. Saisis-le dans l’éditeur.'),
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
  item('Ces exemples', 'Ils aident à y penser, ils ne sont pas une liste. L’étiquette du produit fait foi.'),
)
