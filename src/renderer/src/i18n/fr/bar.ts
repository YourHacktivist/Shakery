/** Strings of « Mon bar »: ingredients, their bottles, merge and deletion. */
import type { IngredientInput, ProductInput } from '@shared/domain/catalog'

const NBSP = String.fromCharCode(0xa0)
const colon = `${NBSP}:`
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`
const plural = (count: number, one: string, many: string) => (Math.abs(count) < 2 ? one : many)

type Source = NonNullable<IngredientInput['compositionSource']>
type Confidence = NonNullable<IngredientInput['compositionConfidence']>
type PackUnit = NonNullable<ProductInput['packUnit']>

export const bar = {
  title: 'Mon bar',
  count: (count: number) =>
    count === 0 ? 'Aucun ingrédient' : `${count} ${plural(count, 'ingrédient', 'ingrédients')}`,
  newIngredient: 'Nouvel ingrédient',
  search: 'Filtrer les ingrédients',
  searchPlaceholder: 'Filtrer par nom ou alias',
  listLabel: 'Ingrédients par catégorie',
  loadError: 'Impossible de charger les ingrédients.',
  empty: {
    title: 'Aucun ingrédient pour l’instant',
    description:
      'Crée tes ingrédients ici, ou directement depuis une fiche ou une idée rapide. Ils se rangent par catégorie.',
  },
  noMatch: 'Aucun ingrédient ne correspond à ce filtre.',
  noSelection: {
    title: 'Choisis un ingrédient',
    description: 'Sa composition, ses bouteilles et les fiches qui l’utilisent s’affichent ici.',
  },
  prep: 'Préparation maison',
  staple: 'De base',

  detail: {
    loading: 'Chargement de l’ingrédient',
    edit: 'Modifier',
    merge: 'Fusionner',
    delete: 'Supprimer',
    category: 'Catégorie',
    abv: 'Degré de référence',
    abvHint: 'Valeur type de cet ingrédient. Le degré de la bouteille choisie sur une fiche passe avant.',
    sugar: 'Sucre',
    acid: 'Acidité',
    perLitre: 'g/L',
    abvUnit: '% vol',
    density: 'Masse volumique',
    densityUnit: 'g/ml',
    source: (source: string, confidence: string | null) =>
      confidence ? `Source${colon} ${source}, ${confidence}` : `Source${colon} ${source}`,
    compositionMissing:
      'Composition incomplète. Renseigne le sucre et l’acidité pour que les calculs des fiches soient complets.',
    abvMissing: 'Degré inconnu. Renseigne-le pour estimer le degré des fiches.',
    allergens: 'Allergènes',
    noAllergen: 'Aucun allergène déclaré.',
    aliases: 'Alias',
    noAlias: 'Aucun alias.',
    usedBy: 'Fiches qui l’utilisent',
    notUsed: 'Aucune fiche ne l’utilise.',
    bottles: 'Bouteilles',
    noBottle: 'Aucune bouteille. Ajoute celles que tu achètes pour suivre leur prix et ce que tu possèdes.',
    addBottle: 'Ajouter une bouteille',
  },

  bottle: {
    owned: 'Je l’ai',
    ownedLabel: (name: string) => `Je possède ${name}`,
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
    categoryPlaceholder: 'Choisis une catégorie',
    abv: 'Degré',
    sugar: 'Sucre',
    acid: 'Acidité',
    density: 'Masse volumique',
    densityHint: 'Pour compter une dose en grammes : 1,59 pour le sucre dissous.',
    source: 'Source de la composition',
    confidence: 'Confiance',
    allergens: 'Allergènes',
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
    user: 'Ma saisie',
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
    owned: 'Je l’ai',
    notes: 'Avis personnel',
    allergens: 'Allergènes',
    save: 'Enregistrer',
    cancel: 'Annuler',
    created: (name: string) => `Bouteille ${quote(name)} ajoutée.`,
    saved: (name: string) => `Bouteille ${quote(name)} enregistrée.`,
    basisRequired: 'Indique si ce prix est HT ou TTC.',
    packTogether: 'La quantité et l’unité du lot vont ensemble.',
    barcodeInvalid: 'Un code-barres compte de 6 à 14 chiffres.',
    lookup: 'Rechercher sur Open Food Facts',
    lookupRunning: 'Recherche…',
    lookupHint: 'Scanne la bouteille ou tape son code, puis Entrée.',
    lookupNotFound: 'Aucun produit trouvé pour ce code.',
    lookupFound: 'Trouvé sur Open Food Facts : coche ce que tu reprends.',
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
      'Choisis l’ingrédient qui reste. Les fiches et les bouteilles passent sur lui, et l’ancien nom devient un de ses alias.',
    target: 'Ingrédient qui reste',
    targetPlaceholder: 'Cherche un ingrédient',
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
    description: 'L’ingrédient et ses alias disparaissent de Mon bar.',
    used: (count: number) =>
      `Il est utilisé par ${count} ${plural(count, 'fiche', 'fiches')}. Fusionne-le avec un autre ingrédient plutôt que de le supprimer.`,
    refused: `Suppression refusée${colon} cet ingrédient est encore utilisé. Fusionne-le avec un autre ingrédient plutôt que de le supprimer.`,
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
