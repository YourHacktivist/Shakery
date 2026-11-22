/**
 * Flavour profile of the seed ingredients (section 7, « profil aromatique libre » ; D-040), from
 * their category and their name. Plain descriptors to browse and filter by, editable by the user
 * like any other field; they enter no calculation.
 */
import { normalizeName } from '../../src/core/normalize'

type Rule = {
  readonly tag: string
  readonly categories?: readonly string[]
  /** On the normalised name: lower case, no accent, « oe » for « œ ». */
  readonly name?: RegExp
  readonly not?: RegExp
}

const RULES: readonly Rule[] = [
  {
    tag: 'agrume',
    categories: ['cat.juices.citrus', 'cat.liqueurs.orange'],
    name: /\b(citron|oranges?|limes?|yuzu|pamplemousse|bergamote|mandarine|kumquat|calamansi|combava|agrumes|limonade|citronnade|limoncello|curacao|triple sec|cointreau|clementine|cedrat|chinotto)\b/,
    not: /fleur d'oranger|sureau/,
  },
  {
    tag: 'fruité',
    categories: ['cat.spirits.fruit_brandy', 'cat.spirits.calvados'],
    name: /\b(pommes?|poire|peche|abricot|apricot|prunes?|pruneau|mirabelle|cerises?|cherry|raisin|figue|coing|nectarine|melon|pasteque|kiwi|marasquin|guignolet|applejack|kirsch|grenade|grenadine|fruits?|litchi|feijoa|umeshu|pineau|pommeau|fruit cup|pimm's)\b/,
    not: /pomme de terre|fruit de la passion/,
  },
  {
    tag: 'fruits rouges',
    name: /\b(fraise|framboise|mures?|myrtille|cassis|groseille|canneberge|airelle|sloe|prunelle|fruits rouges|plaquebiere)\b/,
  },
  {
    tag: 'tropical',
    categories: ['cat.fruits.coconut'],
    name: /\b(ananas|mangue|passion|coco|banane|goyave|litchi|papaye|colada|pisang|feijoa)\b/,
  },
  {
    tag: 'herbacé',
    categories: ['cat.liqueurs.herbal', 'cat.seasonings.herbs', 'cat.wines.vermouth'],
    name: /\b(basilic|thym|romarin|sauge|estragon|coriandre|celeri|concombre|citronnelle|ortie|the vert|gentiane|aloe|betterave|poivron)\b/,
    not: /menthe|tabac|racinette/,
  },
  {
    tag: 'floral',
    name: /\b(fleurs?|violette|roses?|lavande|jasmin|hibiscus|camomille|sureau|st-germain|parfait amour)\b/,
    not: /fleur de sel|poivre rose|pamplemousse rose|champagne rose|gin rose|vin rose|lillet rose|vermouth rose/,
  },
  {
    tag: 'épicé',
    categories: ['cat.seasonings.spices'],
    name: /\b(cannelle|gingembre|ginger|cardamome|girofle|muscade|poivre|epices?|epicee?|chai|falernum|safran|piment de la jamaique|angostura|pain d'epices|speculoos)\b/,
    not: /vanille|cacao|piment (rouge|jalapeno|habanero|de cayenne|en flocons)/,
  },
  {
    tag: 'piquant',
    name: /\b(jalapeno|habanero|cayenne|raifort|wasabi|pimentee?|piment)\b/,
    not: /piment de la jamaique/,
  },
  {
    tag: 'amer',
    categories: ['cat.bitters', 'cat.wines.quinquina', 'cat.mixers.tonic'],
    name: /\b(suze|picon|quinquina|gentiane|amaro|pamplemousse)\b/,
  },
  { tag: 'fumé', categories: ['cat.spirits.mezcal'], name: /\b(fumee?|islay|lapsang)\b/ },
  {
    tag: 'boisé',
    categories: ['cat.spirits.whisky', 'cat.spirits.cognac', 'cat.spirits.armagnac', 'cat.spirits.brandy'],
    name: /\b(rhum (vieux|ambre|brun|demerara)|calvados|oloroso|amontillado|palo cortado|madere|erable)\b/,
    not: /pisco|whisky blanc/,
  },
  { tag: 'vanillé', name: /\b(vanillee?|vanille|licor 43|tuaca)\b/ },
  {
    tag: 'café et cacao',
    categories: ['cat.coffee_tea.coffee', 'cat.coffee_tea.cold_brew'],
    name: /\b(cafe|cacao|chocolat|chocolatee?|expresso|cola)\b/,
  },
  {
    tag: 'noix',
    categories: ['cat.liqueurs.nut'],
    name: /\b(amande|noisette|noix|orgeat|pistache|pecan|macadamia|cacahuete|noyau|chataigne)\b/,
    not: /noix de (muscade|coco)/,
  },
  {
    tag: 'lacté',
    categories: ['cat.dairy.milk'],
    name: /\b(creme liquide|creme de whisky|liqueur a la creme|amarula|yaourt|creme brulee|creme fouettee)\b/,
  },
  {
    tag: 'anisé',
    categories: ['cat.spirits.anise'],
    name: /\b(anis|anisette|sambuca|fenouil|reglisse|pastis|galliano|antesite)\b/,
  },
  { tag: 'menthe', name: /\b(menthe|branca menta|mentha)\b/ },
  { tag: 'miel', categories: ['cat.sweeteners.honey'], name: /\b(miel|drambuie|hydromel|glayva)\b/ },
  {
    tag: 'salé',
    categories: ['cat.garnishes.savory'],
    name: /\b(sel|saline|saumure|olives?|clamato|soja|worcestershire|bacon|bouillon)\b/,
  },
]

export function flavorTagsOf(name: string, category: string): string[] {
  const normalized = normalizeName(name)
  return RULES.filter(
    (rule) =>
      !rule.not?.test(normalized) &&
      ((rule.categories?.some((root) => category === root || category.startsWith(`${root}.`)) ?? false) ||
        (rule.name?.test(normalized) ?? false)),
  ).map((rule) => rule.tag)
}
