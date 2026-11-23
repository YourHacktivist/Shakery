/** Strings of the form and action components (Input, NumberWithUnit, DoseStepper, SegmentedControl, FilterPill, Combobox, Toggle). */

/** French typography: no-break space before « : » and inside guillemets, and between a number and its unit. */
const NBSP = String.fromCharCode(0xa0)

export const componentsForms = {
  number: {
    invalid: 'Saisis un nombre, par exemple 22,5.',
    /** Spoken value of a number field: « 22,5 ml ». */
    valueText: (value: string, unit?: string) => (unit ? `${value}${NBSP}${unit}` : value),
  },
  doseStepper: {
    decrease: (step: string, unit: string) => `Retirer ${step}${NBSP}${unit}`,
    increase: (step: string, unit: string) => `Ajouter ${step}${NBSP}${unit}`,
  },
  toggle: {
    on: 'Activé',
    off: 'Désactivé',
  },
  filterPill: {
    /** Accessible name of the pill: the filter name, then what is selected. */
    name: (label: string, summary: string) => `${label}${NBSP}: ${summary}`,
    /** Several values selected: « Sour +2 ». */
    more: (first: string, others: number) => `${first} +${others}`,
    all: 'Tout',
  },
  photo: {
    title: 'Photo',
    of: (name: string) => `Photo de ${name}`,
    tasting: 'Photo de la dégustation',
    add: 'Ajouter une photo',
    tastingOf: (recipe: string) => `Photo de la dégustation de ${recipe}`,
    drop: 'Dépose une photo ici, ou clique pour la choisir',
    reading: 'Préparation de la photo…',
    change: 'Changer',
    remove: 'Retirer',
    saved: 'Photo enregistrée.',
    removed: 'Photo retirée.',
    problems: {
      type: 'Choisis une image JPEG, PNG ou WebP. Une photo HEIC d’iPhone doit d’abord être convertie.',
      size: 'Cette image est trop lourde. Elle doit faire 10 Mo et 80 millions de pixels au plus.',
      unreadable: 'Cette image ne se lit pas.',
    },
  },
  formatting: {
    group: (field: string) => `Mise en forme${NBSP}: ${field}`,
    bold: 'Gras (Ctrl+B)',
    italic: 'Italique (Ctrl+I)',
    bullets: 'Liste à puces',
    numbers: 'Liste numérotée',
    preview: 'Aperçu',
  },
  combobox: {
    create: (label: string) => `Créer «${NBSP}${label}${NBSP}»`,
    empty: 'Aucun résultat.',
    more: (count: number) => `Il reste ${count} autres résultats. Tape la suite pour affiner.`,
    listLabel: 'Suggestions',
  },
} as const
