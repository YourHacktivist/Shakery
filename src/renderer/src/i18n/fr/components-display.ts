import type { RecipeStatus } from '@renderer/components/StatusBadge'
import type { AllergenCode } from '@shared/domain/allergens'

const NBSP = String.fromCharCode(0xa0)
const EN_DASH = String.fromCharCode(0x2013)

/** « 24,6 % »: the value and its unit joined by a no-break space. */
function withUnit(value: string, unit?: string): string {
  return unit ? `${value}${NBSP}${unit}` : value
}

/** « 1 jour », « 4 jours » (in French, 0 and 1 take the singular). */
function days(count: number): string {
  return `${count}${NBSP}${Math.abs(count) < 2 ? 'jour' : 'jours'}`
}

/** Strings of the display components (StatTile, Sparkline, RangeGauge, RatingScale, VersionDiff, badges, VirtualTable). */
export const componentsDisplay = {
  withUnit,
  stat: {
    empty: 'Pas encore de valeur',
    trend: { up: 'En hausse', down: 'En baisse', same: 'Stable' },
    /** « −1,2 vs v3 », « +0,6 », « = v3 ». */
    delta: (signed: string, unit?: string, reference?: string) => {
      if (signed === '=') return reference ? `= ${reference}` : '='
      return reference ? `${withUnit(signed, unit)} vs ${reference}` : withUnit(signed, unit)
    },
  },
  sparkline: {
    empty: 'Pas encore de valeur',
    series: (label: string, values: readonly string[]) => `${label} : ${values.join(' ; ')}`,
    emptySeries: (label: string) => `${label} : pas encore de valeur`,
  },
  gauge: {
    range: (from: string, to: string, unit?: string) => withUnit(`${from}${EN_DASH}${to}`, unit),
    scaleZone: (range: string) => `zone ${range}`,
    describe: (
      label: string,
      value: string | null,
      zone: { from: string; to: string } | null,
      saved: { version: string; value: string } | null,
    ) =>
      [
        value === null ? `${label} : pas encore de valeur` : `${label} : ${value}`,
        zone ? `zone de référence de ${zone.from} à ${zone.to}` : null,
        saved ? `${saved.version} à ${saved.value}` : null,
      ]
        .filter((part): part is string => part !== null)
        .join(', '),
    legend: 'Légende',
    legendZone: (range: string, count?: number) =>
      count === undefined
        ? `Zone de référence ${range}`
        : `Zone de référence ${range} (${count} ${count < 2 ? 'fiche' : 'fiches'})`,
    legendValue: (value: string) => `Valeur actuelle ${value}`,
    legendSaved: (version: string, value: string) => `Version enregistrée (${version}) ${value}`,
  },
  rating: {
    low: 'trop peu',
    middle: 'juste',
    high: 'trop',
    /** Meaning of each step, from −2 to +2 (section 10.6). */
    steps: ['bien trop peu', 'plutôt trop peu', 'juste', 'plutôt trop', 'bien trop'],
    option: (value: string, meaning: string) => `${value}, ${meaning}`,
  },
  diff: {
    title: (from: string, to: string) => `De ${from} à ${to}`,
    none: (from: string, to: string) => `Aucune différence entre ${from} et ${to}.`,
    kinds: {
      added: 'Ajout',
      removed: 'Retrait',
      increased: 'Hausse',
      decreased: 'Baisse',
      changed: 'Changement',
      unchanged: 'Identique',
    },
    method: 'Méthode',
    glass: 'Verre',
    becomes: 'devient',
  },
  status: {
    idea: 'Idée',
    draft: 'Brouillon',
    testing: 'En test',
    final: 'Finale',
    archived: 'Archivée',
  } satisfies Record<RecipeStatus, string>,
  version: (version: number) => `v${version}`,
  versionLong: (version: number) => `Version ${version}`,
  /** Regulatory labels (EU regulation 1169/2011, annex II). */
  allergens: {
    gluten: 'Céréales contenant du gluten',
    crustaceans: 'Crustacés',
    eggs: 'Œufs',
    fish: 'Poissons',
    peanuts: 'Arachides',
    soy: 'Soja',
    milk: 'Lait',
    nuts: 'Fruits à coque',
    celery: 'Céleri',
    mustard: 'Moutarde',
    sesame: 'Graines de sésame',
    sulphites: 'Anhydride sulfureux et sulfites',
    lupin: 'Lupin',
    molluscs: 'Mollusques',
  } satisfies Record<AllergenCode, string>,
  allergenOptional: '(optionnel)',
  expiry: {
    none: 'Sans date limite',
    today: 'Expire aujourd’hui',
    tomorrow: 'Expire demain',
    inDays: (count: number) => `Expire dans ${days(count)}`,
    remaining: (count: number) => `Encore ${days(count)}`,
    expiredSince: (count: number) => `Expiré depuis ${days(count)}`,
  },
  table: {
    emptyTitle: 'Rien à afficher',
    emptyDescription: 'Aucune ligne pour l’instant.',
    cellPrefix: (header: string) => `, ${header} : `,
  },
} as const
