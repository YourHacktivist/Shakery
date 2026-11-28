/** Strings of the « Ingrédients » screen: ingredients, their bottles, merge and deletion. */
import type { IngredientInput, ProductInput } from '@shared/domain/catalog'

const NBSP = String.fromCharCode(0xa0)
const colon = `${NBSP}:`
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`
const plural = (count: number, one: string, many: string) => (Math.abs(count) < 2 ? one : many)

type Source = NonNullable<IngredientInput['compositionSource']>
type Confidence = NonNullable<IngredientInput['compositionConfidence']>
type PackUnit = NonNullable<ProductInput['packUnit']>

export const bar = {
  title: 'Ingrédients',
  count: (count: number) =>
    count === 0 ? 'Aucun ingrédient' : `${count} ${plural(count, 'ingrédient', 'ingrédients')}`,
  description:
    'Cocher les bouteilles présentes au bar. Shakery en déduit les fiches réalisables ce soir et celles qu’une seule bouteille de plus débloquerait. Un clic sur un nom ouvre sa composition, ses bouteilles et ses fiches.',
  newIngredient: 'Nouvel ingrédient',
  search: 'Filtrer les ingrédients',
  searchPlaceholder: 'Filtrer par nom ou alias',
  listLabel: 'Ingrédients par catégorie',
  loadError: 'Les ingrédients n’ont pas pu être chargés.',
  empty: {
    title: 'Aucun ingrédient pour l’instant',
    description:
      'Un ingrédient se crée ici, ou directement depuis une fiche ou une idée rapide. Les ingrédients se rangent par catégorie.',
  },
  noMatch: 'Aucun ingrédient ne correspond à ce filtre.',
  noSelection: {
    title: 'Aucun ingrédient choisi',
    description: 'Sa composition, ses bouteilles et les fiches qui l’utilisent s’affichent ici.',
    hint: 'Un clic sur un ingrédient affiche sa composition, ses bouteilles et ses fiches.',
  },
  prep: 'Préparation maison',
  staple: 'De base',

  /** The choice above the list, and the heads of its columns. */
  show: {
    listLabel: 'Ingrédients affichés',
    modes: { all: 'Tout', owned: 'Au bar', missing: 'Manquants' },
  },
  columns: { category: 'Catégorie', owned: 'Au bar', ingredient: 'Ingrédient', usedIn: 'Utilisé dans' },
  /** « 6 au bar sur 214 », after the name of a family. */
  familyCount: (owned: number, total: number) => `${owned} au bar sur ${total}`,
  /** Number of recipes using an ingredient, on its line. */
  usage: (count: number) => (count === 0 ? 'Aucune fiche' : `${count} ${plural(count, 'fiche', 'fiches')}`),
  /** Name of the check box of a line, read by a screen reader. */
  ownedLabel: (name: string) => `${name} au bar`,

  /** The calmer column: what the bar allows tonight, and what to buy. */
  side: {
    region: 'Ce que permet le bar',
    tonight: 'Ce soir',
    tonightText: (count: number) =>
      `${plural(count, 'fiche réalisable', 'fiches réalisables')} avec les bouteilles du bar.`,
    more: (count: number) => (count === 1 ? 'Voir la fiche' : `Voir les ${count} fiches`),
    none: 'Aucune fiche n’est réalisable avec les bouteilles cochées.',
  },

  detail: {
    loading: 'Chargement de l’ingrédient',
    close: 'Fermer l’ingrédient',
    edit: 'Modifier',
    merge: 'Fusionner',
    delete: 'Supprimer',
    category: 'Catégorie',
    abv: 'Degré de référence',
    abvHint:
      'C’est la valeur type de cet ingrédient. Le degré de la bouteille choisie sur une fiche passe avant.',
    sugar: 'Sucre',
    acid: 'Acidité',
    perLitre: 'g/L',
    abvUnit: '% vol',
    density: 'Masse volumique',
    densityUnit: 'g/ml',
    source: (source: string, confidence: string | null) =>
      confidence ? `Source${colon} ${source}, ${confidence}` : `Source${colon} ${source}`,
    compositionMissing:
      'La composition est incomplète. Les calculs des fiches seront complets une fois le sucre et l’acidité renseignés.',
    abvMissing: 'Le degré est inconnu. Il faut le renseigner pour estimer le degré des fiches.',
    allergens: 'Allergènes',
    noAllergen: 'Aucun allergène déclaré.',
    flavors: 'Profil aromatique',
    noFlavor: 'Aucun profil noté.',
    aliases: 'Alias',
    noAlias: 'Aucun alias.',
    usedBy: 'Fiches qui l’utilisent',
    usedByMore: (count: number) => `et ${count} ${plural(count, 'autre fiche', 'autres fiches')}`,
    notUsed: 'Aucune fiche ne l’utilise.',
    bottles: 'Bouteilles',
    noBottle:
      'Aucune bouteille pour l’instant. Les bouteilles ajoutées ici donnent leur prix aux fiches et disent ce qui est au bar.',
    addBottle: 'Ajouter une bouteille',
  },

  bottle: {
    owned: 'Au bar',
    ownedLabel: (name: string) => `${name} au bar`,
    edit: (name: string) => `Modifier ${name}`,
    delete: (name: string) => `Supprimer ${name}`,
    price: (amount: string, basis: string) => `${amount} ${basis}`,
    volume: (ml: string) => `${ml}${NBSP}ml`,
    abv: (value: string) => `${value}${NBSP}% vol`,
    deleted: (name: string) => `Bouteille ${quote(name)} supprimée.`,
  },

  ingredientForm: {
    createTitle: 'Nouvel ingrédient',
    editTitle: (name: string) => `Modifier ${quote(name)}`,
    name: 'Nom',
    category: 'Catégorie',
    categoryPlaceholder: 'Choisir une catégorie',
    abv: 'Degré',
    sugar: 'Sucre',
    acid: 'Acidité',
    density: 'Masse volumique',
    densityHint: 'Elle sert à compter une dose en grammes, par exemple 1,59 pour le sucre dissous.',
    source: 'Source de la composition',
    confidence: 'Confiance',
    allergens: 'Allergènes',
    flavors: 'Profil aromatique',
    flavorsHint: 'Séparé par des virgules (agrume, herbacé, fumé…).',
    aliases: 'Alias',
    aliasesHint: 'Autres noms, séparés par des virgules.',
    staple: 'Ingrédient de base, toujours disponible (eau, glace, sucre)',
    save: 'Enregistrer',
    cancel: 'Annuler',
    created: (name: string) => `Ingrédient ${quote(name)} créé.`,
    saved: (name: string) => `Ingrédient ${quote(name)} enregistré.`,
    conflict: 'Un ingrédient porte déjà ce nom ou cet alias dans cette catégorie.',
  },

  sources: {
    ciqual: 'Ciqual',
    computed: 'Calculée',
    label: 'Étiquette',
    reference: 'Référence publiée',
    user: 'Saisie manuelle',
  } satisfies Record<Source, string>,
  confidences: { sourced: 'sourcée', estimated: 'estimée' } satisfies Record<Confidence, string>,
  confidenceOptions: { sourced: 'Sourcée', estimated: 'Estimée' } satisfies Record<Confidence, string>,

  productForm: {
    createTitle: 'Nouvelle bouteille',
    editTitle: (name: string) => `Modifier ${quote(name)}`,
    brand: 'Marque',
    name: 'Nom',
    abv: 'Degré',
    volume: 'Contenance',
    sugar: 'Sucre',
    acid: 'Acidité',
    barcode: 'Code-barres',
    barcodeHint: 'De 6 à 14 chiffres.',
    price: 'Prix payé',
    basis: 'Base du prix',
    basisHint: 'Obligatoire dès qu’un prix est saisi.',
    basisOptions: { ht: 'HT', ttc: 'TTC' },
    packQuantity: 'Quantité par lot',
    packUnit: 'Unité du lot',
    packHint: 'Pour un article vendu à la pièce, par exemple 6 citrons.',
    owned: 'Au bar',
    notes: 'Avis personnel',
    allergens: 'Allergènes',
    save: 'Enregistrer',
    cancel: 'Annuler',
    created: (name: string) => `Bouteille ${quote(name)} ajoutée.`,
    saved: (name: string) => `Bouteille ${quote(name)} enregistrée.`,
    basisRequired: 'Le prix doit être indiqué HT ou TTC.',
    packTogether: 'La quantité et l’unité du lot vont ensemble.',
    barcodeInvalid: 'Un code-barres compte de 6 à 14 chiffres.',
    lookup: 'Rechercher sur Open Food Facts',
    lookupRunning: 'Recherche…',
    lookupHint: 'Scanner la bouteille ou saisir son code, puis Entrée.',
    lookupNotFound: 'Aucun produit trouvé pour ce code.',
    lookupFound: 'Produit trouvé sur Open Food Facts. Les champs cochés seront repris.',
    lookupApply: 'Reprendre',
    lookupApplied: 'Champs repris d’Open Food Facts.',
    lookupField: (label: string, value: string) => `${label}${colon} ${value}`,
  },
  /** Shown wherever data from Open Food Facts appears (ODbL). */
  offAttribution: '© contributeurs Open Food Facts, ODbL',
  packUnits: {
    piece: 'pièce',
    leaf: 'feuille',
    slice: 'tranche',
    wedge: 'quartier',
    barspoon: 'cuillère de bar',
    tsp: 'cuillère à café',
    g: 'g',
    serving: 'portion',
  } satisfies Record<PackUnit, string>,

  merge: {
    title: (name: string) => `Fusionner ${quote(name)}`,
    description:
      'L’ingrédient choisi ici reste. Les fiches et les bouteilles passent sur lui, et l’ancien nom devient un de ses alias.',
    target: 'Ingrédient qui reste',
    targetPlaceholder: 'Rechercher un ingrédient',
    preview: 'Aperçu',
    previewAlias: (source: string, target: string) =>
      `${quote(source)} devient un alias de ${quote(target)}.`,
    previewAliases: (count: number) =>
      `${count} ${plural(count, 'alias existant suit', 'alias existants suivent')}.`,
    previewRecipes: (count: number) =>
      count === 0
        ? 'Aucune fiche à déplacer.'
        : `${count} ${plural(count, 'fiche passe', 'fiches passent')} sur l’ingrédient qui reste.`,
    previewBottles: (count: number) =>
      count === 0
        ? 'Aucune bouteille à déplacer.'
        : `${count} ${plural(count, 'bouteille passe', 'bouteilles passent')} sur l’ingrédient qui reste.`,
    confirm: 'Fusionner',
    cancel: 'Annuler',
    done: (source: string, target: string) => `${quote(source)} fusionné dans ${quote(target)}.`,
  },

  remove: {
    title: (name: string) => `Supprimer ${quote(name)} ?`,
    description: 'L’ingrédient et ses alias disparaissent de la liste des ingrédients.',
    used: (count: number) =>
      `Il est utilisé par ${count} ${plural(count, 'fiche', 'fiches')}, donc il ne peut pas être supprimé. Une fusion avec un autre ingrédient reste possible.`,
    refused:
      'La suppression est refusée, car cet ingrédient est encore utilisé. Une fusion avec un autre ingrédient reste possible.',
    confirm: 'Supprimer',
    cancel: 'Annuler',
    done: (name: string) => `Ingrédient ${quote(name)} supprimé.`,
  },

  removeBottle: {
    title: (name: string) => `Supprimer ${quote(name)} ?`,
    description: 'Les fiches qui la préféraient utiliseront les autres bouteilles de l’ingrédient.',
    confirm: 'Supprimer',
    cancel: 'Annuler',
  },
} as const
