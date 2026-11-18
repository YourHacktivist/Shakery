/**
 * Step 1 of the seed pipeline for generic ingredients: Wikidata (CC0).
 *
 * For each root class below, one SPARQL query lists the root and its subclasses (P279) that
 * have a French label. Brands are instances (P31), not subclasses, so they stay out. Each item
 * is placed in a leaf of data/seed/categories.json by its root, refined by keywords of its
 * labels; an item the rules cannot place with confidence is marked `needs_review`.
 *
 * Output: scripts/seed/review/wikidata-candidates.json, read by build.ts with the decisions
 * of scripts/seed/review/decisions.json.
 *
 * Usage: npx tsx scripts/seed/wikidata.ts [--refresh]
 */
import path from 'node:path'
import { capitalize, fetchCached, REVIEW_DIR, writeJson } from './lib'

type Rule = { readonly pattern: RegExp; readonly category: string }

type Root = {
  readonly qid: string
  /** Category used when no rule matches. */
  readonly category: string
  /** Keyword rules on the French and English labels, first match wins. */
  readonly rules?: readonly Rule[]
  /** The default category is only a guess: the item needs a human decision. */
  readonly uncertain?: boolean
  /** Only these French labels are kept (botanical classes are too broad otherwise). */
  readonly allow?: readonly string[]
}

const WHISKY_RULES: Rule[] = [
  { pattern: /scotch|écoss/i, category: 'cat.spirits.whisky.scotch' },
  { pattern: /bourbon|rye|tennessee|améric|american|seigle/i, category: 'cat.spirits.whisky.american' },
  { pattern: /irland|irish/i, category: 'cat.spirits.whisky.irish' },
]

const LIQUEUR_RULES: Rule[] = [
  {
    pattern: /orange|curaçao|curacao|triple sec|agrume|citron|limoncello|mandarin|bergamot/i,
    category: 'cat.liqueurs.orange',
  },
  {
    pattern: /cerise|cherry|marasquin|maraschino|violette|violet|kirsch/i,
    category: 'cat.liqueurs.cherry_violet',
  },
  {
    pattern: /café|coffee|cacao|chocolat|crème|cream|lait|egg|œuf|advocaat/i,
    category: 'cat.liqueurs.coffee_cream',
  },
  {
    pattern: /amande|almond|amaretto|noix|noisette|nut|hazel|walnut|nocino|pistache/i,
    category: 'cat.liqueurs.nut',
  },
  {
    pattern: /miel|honey|épice|spice|cannelle|gingembre|ginger|sureau|elder|rose|fleur|flower|vanille/i,
    category: 'cat.liqueurs.spice_honey',
  },
  {
    pattern: /banane|banana|coco|litchi|lychee|melon|passion|mangue|mango|ananas|pineapple/i,
    category: 'cat.liqueurs.exotic',
  },
  {
    pattern:
      /fruit|cassis|framboise|fraise|mûre|pêche|abricot|prune|poire|pomme|myrtille|currant|berry|peach|apricot|plum|pear|apple|sloe|prunelle/i,
    category: 'cat.liqueurs.fruit',
  },
  {
    pattern:
      /plante|herb|herbal|anis|menthe|mint|génépi|genepi|chartreuse|bénédictine|gentiane|kümmel|kummel|absinth/i,
    category: 'cat.liqueurs.herbal',
  },
]

const ROOTS: Root[] = [
  // Spirits, most specific first: the first root that lists an item places it.
  { qid: 'Q959362', category: 'cat.spirits.gin' },
  { qid: 'Q281', category: 'cat.spirits.whisky.world', rules: WHISKY_RULES },
  { qid: 'Q744729', category: 'cat.spirits.cachaca' },
  {
    qid: 'Q83376',
    category: 'cat.spirits.rum.molasses',
    rules: [{ pattern: /agricole/i, category: 'cat.spirits.rum.agricole' }],
  },
  { qid: 'Q122195', category: 'cat.spirits.tequila' },
  { qid: 'Q726413', category: 'cat.spirits.mezcal' },
  { qid: 'Q374', category: 'cat.spirits.vodka' },
  { qid: 'Q284', category: 'cat.spirits.cognac' },
  { qid: 'Q503252', category: 'cat.spirits.armagnac' },
  { qid: 'Q3268', category: 'cat.spirits.calvados' },
  { qid: 'Q388502', category: 'cat.spirits.brandy' },
  { qid: 'Q222216', category: 'cat.spirits.fruit_brandy' },
  { qid: 'Q146470', category: 'cat.spirits.brandy' },
  // Bitters, wines, liqueurs.
  { qid: 'Q778524', category: 'cat.bitters.amari' },
  {
    qid: 'Q753069',
    category: 'cat.bitters.aromatic',
    uncertain: true,
    rules: [
      { pattern: /amaro|amari|fernet|apéritif|aperitivo|gentiane|gentian/i, category: 'cat.bitters.amari' },
    ],
  },
  { qid: 'Q231088', category: 'cat.wines.vermouth' },
  { qid: 'Q11334094', category: 'cat.wines.quinquina' },
  { qid: 'Q16398', category: 'cat.wines.sherry' },
  {
    qid: 'Q722338',
    category: 'cat.wines.vdn',
    rules: [
      { pattern: /porto|port|madère|madeira|marsala/i, category: 'cat.wines.port' },
      { pattern: /xérès|sherry|jerez|fino|manzanilla|amontillado|oloroso/i, category: 'cat.wines.sherry' },
    ],
  },
  {
    qid: 'Q321263',
    category: 'cat.sparkling.other',
    rules: [{ pattern: /champagne/i, category: 'cat.sparkling.champagne' }],
  },
  { qid: 'Q178780', category: 'cat.liqueurs.herbal', uncertain: true, rules: LIQUEUR_RULES },
  { qid: 'Q167296', category: 'cat.beer_cider.cider' },
  { qid: 'Q170219', category: 'cat.beer_cider.sake' },
  { qid: 'Q44', category: 'cat.beer_cider.beer', uncertain: true },
  // Non-alcoholic.
  { qid: 'Q6584340', category: 'cat.sweeteners.syrups' },
  {
    qid: 'Q147538',
    category: 'cat.mixers.sodas',
    uncertain: true,
    rules: [
      { pattern: /tonic/i, category: 'cat.mixers.tonic' },
      { pattern: /ginger/i, category: 'cat.mixers.ginger' },
      {
        pattern: /eau gazeuse|soda water|club soda|eau de seltz|seltzer|eau pétillante/i,
        category: 'cat.mixers.sparkling_water',
      },
    ],
  },
  {
    qid: 'Q8492',
    category: 'cat.juices.bottled',
    uncertain: true,
    rules: [
      {
        pattern: /citron|lime|orange|pamplemousse|grapefruit|yuzu|mandarine|clémentine|lemon/i,
        category: 'cat.juices.citrus',
      },
    ],
  },
  { qid: 'Q207123', category: 'cat.seasonings.herbs', uncertain: true },
  // Botanical classes are broad: only the fruits a bar uses are kept.
  {
    qid: 'Q1364',
    category: 'cat.fruits.fresh',
    allow: [
      'citron',
      'citron vert',
      'lime',
      'orange',
      'orange amère',
      'pamplemousse',
      'mandarine',
      'clémentine',
      'yuzu',
      'kumquat',
      'bergamote',
      'ananas',
      'fraise',
      'framboise',
      'mûre',
      'myrtille',
      'cassis',
      'groseille',
      'cerise',
      'pêche',
      'abricot',
      'poire',
      'pomme',
      'raisin',
      'banane',
      'mangue',
      'fruit de la passion',
      'litchi',
      'kiwi',
      'pastèque',
      'melon',
      'figue',
      'grenade',
      'noix de coco',
      'rhubarbe',
      'concombre',
      'canneberge',
      'prune',
      'goyave',
      'papaye',
      'physalis',
      'airelle',
    ],
  },
  { qid: 'Q42527', category: 'cat.seasonings.spices', uncertain: true },
]

/** Items looked up by their French label among alcoholic beverages (Q154), with their category. */
const EXTRAS: Record<string, string> = {
  Campari: 'cat.bitters.aperitif',
  absinthe: 'cat.spirits.anise',
  ouzo: 'cat.spirits.anise',
  aquavit: 'cat.spirits.world',
  grappa: 'cat.spirits.fruit_brandy',
  genièvre: 'cat.spirits.gin',
  'crème de violette': 'cat.liqueurs.cherry_violet',
  falernum: 'cat.liqueurs.spice_honey',
  'curaçao bleu': 'cat.liqueurs.orange',
  madère: 'cat.wines.port',
  prosecco: 'cat.sparkling.other',
  'ginger beer': 'cat.mixers.ginger',
  "Peychaud's Bitters": 'cat.bitters.aromatic',
}

export type Candidate = {
  qid: string
  name: string
  aliases: string[]
  en: string | null
  abv: number | null
  category: string
  root: string
  needs_review: boolean
}

type Binding = Record<string, { value: string } | undefined>

function query(root: string): string {
  return `SELECT ?item ?fr ?en (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts) (SAMPLE(?abv) AS ?abv) WHERE {
  ?item wdt:P279* wd:${root} .
  ?item rdfs:label ?fr . FILTER(lang(?fr) = "fr")
  OPTIONAL { ?item rdfs:label ?en . FILTER(lang(?en) = "en") }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(lang(?alt) = "fr") }
  OPTIONAL { ?item wdt:P2665 ?abv }
} GROUP BY ?item ?fr ?en`
}

/** Labels that are not an ingredient name: identifiers, years, sentences. */
function usable(label: string): boolean {
  return label.length >= 2 && label.length <= 60 && !/\d{3,}|[()[\]{}]|https?:/.test(label)
}

async function main(): Promise<void> {
  const byQid = new Map<string, Candidate>()
  for (const root of ROOTS) {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query(root.qid))}`
    const body = await fetchCached(url, `wikidata/${root.qid}.json`, 'application/sparql-results+json')
    const bindings = (JSON.parse(body.toString('utf8')) as { results: { bindings: Binding[] } }).results
      .bindings
    let kept = 0
    for (const row of bindings) {
      const qid = row['item']?.value.split('/').pop() ?? ''
      const fr = row['fr']?.value.trim() ?? ''
      if (!/^Q\d+$/.test(qid) || byQid.has(qid) || !usable(fr)) continue
      if (root.allow && !root.allow.includes(fr.toLowerCase())) continue
      const en = row['en']?.value ?? null
      const text = `${fr} ${en ?? ''}`
      const rule = root.rules?.find((candidate) => candidate.pattern.test(text))
      const aliases = (row['alts']?.value ?? '')
        .split('|')
        .map((alias) => alias.trim())
        .filter((alias) => usable(alias) && alias.toLowerCase() !== fr.toLowerCase())
      const abv = row['abv'] ? Number(row['abv'].value) : null
      byQid.set(qid, {
        qid,
        name: capitalize(fr),
        aliases: [...new Set(aliases)],
        en,
        abv: abv !== null && Number.isFinite(abv) && abv > 0 && abv < 100 ? abv : null,
        category: rule?.category ?? root.category,
        root: root.qid,
        needs_review: rule === undefined && root.uncertain === true,
      })
      kept += 1
    }
    console.log(`${root.qid}: ${kept} new items`)
  }
  const labels = Object.keys(EXTRAS)
    .map((label) => `"${label}"@fr`)
    .join(' ')
  const extras = `SELECT ?item ?fr ?en (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts) (SAMPLE(?abv) AS ?abv) WHERE {
  VALUES ?label { ${labels} }
  ?item rdfs:label ?label . ?item (wdt:P279|wdt:P31)/wdt:P279* wd:Q154 .
  BIND(?label AS ?fr)
  OPTIONAL { ?item rdfs:label ?en . FILTER(lang(?en) = "en") }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(lang(?alt) = "fr") }
  OPTIONAL { ?item wdt:P2665 ?abv }
} GROUP BY ?item ?fr ?en`
  const extraBody = await fetchCached(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(extras)}`,
    'wikidata/extras.json',
    'application/sparql-results+json',
  )
  for (const row of (JSON.parse(extraBody.toString('utf8')) as { results: { bindings: Binding[] } }).results
    .bindings) {
    const qid = row['item']?.value.split('/').pop() ?? ''
    const fr = row['fr']?.value ?? ''
    const category = EXTRAS[fr]
    if (
      !/^Q\d+$/.test(qid) ||
      !category ||
      [...byQid.values()].some((c) => c.name.toLowerCase() === fr.toLowerCase())
    )
      continue
    const aliases = (row['alts']?.value ?? '').split('|').filter((alias) => usable(alias) && alias !== fr)
    const abv = row['abv'] ? Number(row['abv'].value) : null
    byQid.set(qid, {
      qid,
      name: capitalize(fr),
      aliases: [...new Set(aliases)],
      en: row['en']?.value ?? null,
      abv: abv !== null && Number.isFinite(abv) && abv > 0 && abv < 100 ? abv : null,
      category,
      root: 'extras',
      needs_review: false,
    })
  }

  const candidates = [...byQid.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'fr'),
  )
  await writeJson(path.join(REVIEW_DIR, 'wikidata-candidates.json'), candidates)
  console.log(`${candidates.length} candidates, ${candidates.filter((c) => c.needs_review).length} to review`)
}

void main()
