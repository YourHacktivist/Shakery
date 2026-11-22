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
  combobox: {
    create: (label: string) => `Créer «${NBSP}${label}${NBSP}»`,
    empty: 'Aucun résultat.',
    more: (count: number) => `Et ${count} autres${NBSP}: tape pour affiner.`,
    listLabel: 'Suggestions',
  },
} as const
