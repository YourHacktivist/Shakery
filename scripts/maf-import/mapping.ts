/**
 * Fixed correspondences of the MAF notebooks with the bundled referentials, as documented in
 * docs/maf-mapping.md. Generic labels only: no personal data here.
 */
import type { AllergenCode } from '../../src/shared/domain/allergens'

export type PackUnit = 'piece' | 'leaf' | 'barspoon' | 'serving'

export type ReferenceCategory = {
  /** Label of the « base produits » of the cocktails notebook. */
  readonly label: string
  /** Name of the ingredient created (unambiguous); the label becomes an alias when it differs. */
  readonly ingredient: string
  readonly category: string
  readonly allergens?: readonly AllergenCode[]
  readonly pack?: readonly [number, PackUnit]
  /** Known ABV when the reference product has none (articles counted by the unit). */
  readonly abv?: number
  readonly aliases?: readonly string[]
}

export const REFERENCE_CATEGORIES: readonly ReferenceCategory[] = [
  { label: 'Gin London Dry', ingredient: 'Gin London Dry', category: 'cat.spirits.gin' },
  { label: 'Vodka', ingredient: 'Vodka', category: 'cat.spirits.vodka' },
  { label: 'Vodka vanille', ingredient: 'Vodka vanille', category: 'cat.spirits.vodka' },
  { label: 'Ron cubain 3 años', ingredient: 'Rhum cubain 3 ans', category: 'cat.spirits.rum.molasses' },
  { label: 'Rhum blanc', ingredient: 'Rhum blanc léger', category: 'cat.spirits.rum.molasses' },
  {
    label: 'Rhum agricole blanc AOC Martinique',
    ingredient: 'Rhum agricole blanc',
    category: 'cat.spirits.rum.agricole',
  },
  { label: 'Rhum agricole ambré', ingredient: 'Rhum agricole ambré', category: 'cat.spirits.rum.agricole' },
  { label: 'Rhum vieux agricole', ingredient: 'Rhum vieux agricole', category: 'cat.spirits.rum.agricole' },
  { label: 'Rhum vieux jamaïcain', ingredient: 'Rhum vieux jamaïcain', category: 'cat.spirits.rum.molasses' },
  { label: 'Black rum', ingredient: 'Rhum noir (black rum)', category: 'cat.spirits.rum.molasses' },
  { label: 'Rum ambré', ingredient: 'Rhum ambré de mélasse', category: 'cat.spirits.rum.molasses' },
  { label: 'Cachaça', ingredient: 'Cachaça', category: 'cat.spirits.cachaca' },
  { label: 'Tequila blanco 100 % agave', ingredient: 'Tequila blanco', category: 'cat.spirits.tequila' },
  { label: 'Cognac VSOP', ingredient: 'Cognac VSOP', category: 'cat.spirits.cognac' },
  {
    label: 'Whiskey américain (bourbon)',
    ingredient: 'Bourbon',
    category: 'cat.spirits.whisky.american',
    aliases: ['Whiskey américain'],
  },
  { label: 'Bourbon', ingredient: 'Bourbon', category: 'cat.spirits.whisky.american' },
  {
    label: 'Blended scotch whisky',
    ingredient: 'Blended scotch whisky',
    category: 'cat.spirits.whisky.scotch',
  },
  {
    label: "Single malt tourbé d'Islay",
    ingredient: "Single malt tourbé d'Islay",
    category: 'cat.spirits.whisky.scotch',
  },
  { label: 'Vermouth rouge', ingredient: 'Vermouth rouge', category: 'cat.wines.vermouth' },
  { label: 'Vermouth dry', ingredient: 'Vermouth dry', category: 'cat.wines.vermouth' },
  { label: 'Bitter', ingredient: 'Bitter rouge italien', category: 'cat.bitters.aperitif' },
  { label: 'Sherry fino', ingredient: 'Xérès fino', category: 'cat.wines.sherry' },
  {
    label: 'Liqueur de marasquin',
    ingredient: 'Liqueur de marasquin',
    category: 'cat.liqueurs.cherry_violet',
    aliases: ['Maraschino'],
  },
  { label: 'Crème de violette', ingredient: 'Crème de violette', category: 'cat.liqueurs.cherry_violet' },
  { label: 'Crème de mûre', ingredient: 'Crème de mûre', category: 'cat.liqueurs.fruit' },
  { label: 'Triple sec', ingredient: 'Triple sec', category: 'cat.liqueurs.orange' },
  { label: 'Curaçao orange', ingredient: 'Curaçao orange', category: 'cat.liqueurs.orange' },
  { label: 'Liqueur de café', ingredient: 'Liqueur de café', category: 'cat.liqueurs.coffee_cream' },
  {
    label: 'Liqueur de fruit de la passion',
    ingredient: 'Liqueur de fruit de la passion',
    category: 'cat.liqueurs.exotic',
  },
  { label: 'Liqueur de pêche', ingredient: 'Liqueur de pêche', category: 'cat.liqueurs.fruit' },
  { label: 'Velvet Falernum', ingredient: 'Velvet Falernum', category: 'cat.liqueurs.spice_honey' },
  { label: 'Champagne brut', ingredient: 'Champagne brut', category: 'cat.sparkling.champagne' },
  { label: 'Vin effervescent (Prosecco DOC)', ingredient: 'Prosecco', category: 'cat.sparkling.other' },
  { label: 'Aromatic bitters', ingredient: 'Bitters aromatiques', category: 'cat.bitters.aromatic' },
  { label: 'Bitters orange', ingredient: 'Bitters orange', category: 'cat.bitters.aromatic' },
  { label: 'Sirop de sucre', ingredient: 'Sirop de sucre 1:1', category: 'cat.preps.syrups' },
  { label: 'Sirop de miel', ingredient: 'Sirop de miel 1:1', category: 'cat.preps.syrups' },
  { label: 'Sirop de vanille', ingredient: 'Sirop de vanille', category: 'cat.sweeteners.syrups' },
  { label: "Sirop d'orgeat", ingredient: "Sirop d'orgeat", category: 'cat.sweeteners.syrups' },
  { label: "Sirop d'agave", ingredient: "Sirop d'agave", category: 'cat.sweeteners.syrups' },
  { label: 'Sirop de grenadine', ingredient: 'Sirop de grenadine', category: 'cat.sweeteners.syrups' },
  { label: 'Jus de citron frais', ingredient: 'Jus de citron frais', category: 'cat.juices.citrus' },
  {
    label: 'Jus de citron vert frais',
    ingredient: 'Jus de citron vert frais',
    category: 'cat.juices.citrus',
  },
  { label: 'Nectar de cranberry', ingredient: 'Nectar de cranberry', category: 'cat.juices.bottled' },
  { label: "Jus d'orange frais", ingredient: "Jus d'orange frais", category: 'cat.juices.citrus' },
  { label: "Jus d'ananas", ingredient: "Jus d'ananas", category: 'cat.juices.bottled' },
  {
    label: 'Jus de pamplemousse frais',
    ingredient: 'Jus de pamplemousse frais',
    category: 'cat.juices.citrus',
  },
  { label: 'Jus de tomate', ingredient: 'Jus de tomate', category: 'cat.juices.bottled' },
  { label: 'Crème de noix de coco', ingredient: 'Crème de noix de coco', category: 'cat.fruits.coconut' },
  {
    label: 'Purée de fruit de la passion',
    ingredient: 'Purée de fruit de la passion',
    category: 'cat.fruits.puree',
  },
  { label: 'Purée de pêche blanche', ingredient: 'Purée de pêche blanche', category: 'cat.fruits.puree' },
  { label: 'Café espresso', ingredient: 'Café espresso', category: 'cat.coffee_tea.coffee' },
  { label: 'Eau gazeuse', ingredient: 'Eau gazeuse', category: 'cat.mixers.sparkling_water' },
  { label: 'Ginger beer', ingredient: 'Ginger beer', category: 'cat.mixers.ginger' },
  { label: 'Ginger ale', ingredient: 'Ginger ale', category: 'cat.mixers.ginger' },
  { label: 'Jus de gingembre frais', ingredient: 'Jus de gingembre frais', category: 'cat.juices.fresh' },
  {
    label: "Blanc d'œuf (ou aquafaba)",
    ingredient: "Blanc d'œuf",
    category: 'cat.dairy.eggs',
    allergens: ['eggs'],
  },
  {
    label: 'Sucre en poudre (bar spoon)',
    ingredient: 'Sucre en poudre',
    category: 'cat.sweeteners.sugars',
    abv: 0,
    pack: [1, 'barspoon'],
  },
  {
    label: 'Morceau de sucre',
    ingredient: 'Morceau de sucre',
    category: 'cat.sweeteners.sugars',
    abv: 0,
    pack: [1, 'piece'],
  },
  {
    label: 'Feuilles de menthe (10)',
    ingredient: 'Menthe fraîche',
    category: 'cat.seasonings.herbs',
    abv: 0,
    pack: [10, 'leaf'],
    aliases: ['Feuilles de menthe'],
  },
  {
    label: 'Feuilles de basilic (10)',
    ingredient: 'Basilic frais',
    category: 'cat.seasonings.herbs',
    abv: 0,
    pack: [10, 'leaf'],
    aliases: ['Feuilles de basilic'],
  },
  {
    label: 'Citron vert en morceaux (1/2)',
    ingredient: 'Citron vert',
    category: 'cat.fruits.fresh',
    abv: 0,
    pack: [0.5, 'piece'],
    aliases: ['Citron vert en morceaux'],
  },
  {
    label: 'Sel de céleri, Tabasco, sauce anglaise',
    ingredient: 'Assaisonnement Bloody Mary',
    category: 'cat.seasonings.condiments',
    allergens: ['celery', 'fish'],
    abv: 0,
    pack: [1, 'serving'],
  },
]

/** Recipe line names that are not a label of the base produits. */
export const LINE_NAMES: Readonly<Record<string, { label: string; note?: string }>> = {
  'Morceau de sucre blanc': { label: 'Morceau de sucre', note: 'blanc' },
  'Morceau de sucre brun': { label: 'Morceau de sucre', note: 'brun' },
  'Nectar ou purée de pêche blanche': { label: 'Purée de pêche blanche' },
  'Vin blanc effervescent (prosecco)': { label: 'Vin effervescent (Prosecco DOC)' },
}

export const COCKTAIL_GLASSES: Readonly<Record<string, string>> = {
  Coupe: 'glass.coupe',
  'Coupe + verre shot': 'glass.coupe',
  'Coupe givrée au sel': 'glass.coupe',
  Flûte: 'glass.flute',
  Highball: 'glass.highball',
  'Highball (glace pilée)': 'glass.highball',
  'Highball givré au sel': 'glass.highball',
  Martini: 'glass.martini',
  'Nick & Nora': 'glass.nick_nora',
  Rocks: 'glass.rocks',
  'Rocks (glace pilée)': 'glass.rocks',
  'Timbale julep': 'glass.julep',
  'Timbale mule': 'glass.mule',
  'Verre à vin': 'glass.wine',
}

/** Glasses at the centre of the product cards; « Tokkuri et ochoko » stays as text. */
export const SHEET_GLASSES: Readonly<Record<string, string | null>> = {
  Bolée: 'glass.bolee',
  Caballito: 'glass.shot',
  Copa: 'glass.copa',
  Copita: 'glass.tasting',
  Flûte: 'glass.flute',
  Highball: 'glass.highball',
  'Tokkuri et ochoko': null,
  Veladora: 'glass.shot',
  'Verre digestif': 'glass.liqueur',
  'Verre dégustation': 'glass.tasting',
  'Verre martini': 'glass.martini',
  'Verre rocks': 'glass.rocks',
  'Verre shot': 'glass.shot',
  'Verre à bière': 'glass.beer',
  'Verre à pastis': 'glass.pastis',
  'Verre à vin': 'glass.wine',
}

/** Socle family labels to the recipe family (reviewed correspondence, docs/maf-mapping.md). */
export const FAMILIES: Readonly<Record<string, string>> = {
  Sour: 'sour',
  'Sour (daisy)': 'sour',
  Highball: 'highball',
  'Highball (buck)': 'highball',
  'Highball (buck, mule)': 'highball',
  'Highball (cousin du julep)': 'highball',
  'Highball fruité': 'highball',
  Fizz: 'fizz',
  'Fizz au champagne': 'fizz',
  'Aromatique (verre à mélange)': 'spirit_forward',
  'Aromatique amer': 'spirit_forward',
  'Old-Fashioned': 'spirit_forward',
  'Cocktail de vins': 'spirit_forward',
  Tiki: 'tiki',
  Colada: 'tiki',
  Swizzle: 'tiki',
  Punch: 'punch',
  Sparkling: 'other',
  'Pilé (proche du smash)': 'other',
  'Cocktail au café': 'other',
  Smash: 'other',
  Julep: 'other',
  'Fruité contemporain': 'other',
  Savoureux: 'other',
}

/** Socle method labels, matched on their start. */
export const METHODS: readonly (readonly [string, string])[] = [
  ['Shaker (dry shake)', 'dry_shake'],
  ['Shaker', 'shake'],
  ['Direct au verre (swizzle)', 'swizzle'],
  ['Direct au verre', 'build'],
  ['Verre à mélange', 'stir'],
]

/** Categories each product card is about, by card number: the first is the main one. */
export const SHEET_CATEGORIES: Readonly<Record<number, readonly string[]>> = {
  1: ['cat.spirits'],
  2: ['cat.spirits.whisky.scotch'],
  3: ['cat.spirits.whisky.american'],
  4: ['cat.spirits.whisky.irish', 'cat.spirits.whisky.world'],
  5: ['cat.spirits.rum.agricole'],
  6: ['cat.spirits.rum.molasses'],
  7: ['cat.spirits.cachaca'],
  8: ['cat.spirits.tequila'],
  9: ['cat.spirits.mezcal'],
  10: ['cat.spirits.vodka'],
  11: ['cat.spirits.gin'],
  12: ['cat.spirits.cognac'],
  13: ['cat.spirits.armagnac'],
  14: ['cat.spirits.calvados', 'cat.wines.vdn'],
  15: ['cat.spirits.brandy'],
  16: ['cat.spirits.fruit_brandy'],
  17: ['cat.spirits.anise'],
  18: ['cat.spirits.world'],
  19: ['cat.liqueurs'],
  20: ['cat.liqueurs.orange'],
  21: ['cat.liqueurs.cherry_violet'],
  22: ['cat.liqueurs.fruit'],
  23: ['cat.liqueurs.exotic'],
  24: ['cat.liqueurs.herbal'],
  25: ['cat.liqueurs.spice_honey'],
  26: ['cat.liqueurs.coffee_cream'],
  27: ['cat.liqueurs.nut'],
  28: ['cat.bitters.aperitif'],
  29: ['cat.bitters.gentian'],
  30: ['cat.bitters.amari'],
  31: ['cat.bitters.aromatic'],
  32: ['cat.wines.vermouth'],
  33: ['cat.wines.quinquina'],
  34: ['cat.wines.sherry'],
  35: ['cat.wines.port'],
  36: ['cat.wines.vdn'],
  37: ['cat.sparkling.champagne'],
  38: ['cat.sparkling.other'],
  39: ['cat.wines.still'],
  40: ['cat.beer_cider.beer'],
  41: ['cat.beer_cider.cider'],
  42: ['cat.beer_cider.sake'],
  43: ['cat.sweeteners', 'cat.preps.syrups'],
  44: ['cat.juices', 'cat.fruits.fresh'],
  45: ['cat.fruits.puree', 'cat.fruits.coconut', 'cat.dairy'],
  46: ['cat.mixers'],
  47: ['cat.coffee_tea'],
  48: ['cat.seasonings', 'cat.garnishes.rims'],
}
