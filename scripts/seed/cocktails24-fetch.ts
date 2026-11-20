/**
 * Fetches the 24cocktails.com export (D-036) into the cache, then writes
 * review/24c-labels.json: every distinct ingredient label with its count and examples, the unit
 * words, the extra texts, the glasses, the methods and the garnish texts, for the hand mapping
 * of 24c-map.json and 24c-garnish-fr.json.
 *
 * Usage: npx tsx scripts/seed/cocktails24-fetch.ts [--refresh]
 */
import path from 'node:path'
import { EXPORT_CACHE, EXPORT_URL, parseLine, readExport } from './cocktails24'
import { fetchCached, REVIEW_DIR, sha256, writeJson } from './lib'

type LabelStat = { label: string; count: number; withoutQuantity: number; examples: string[] }

function bump(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

function sorted(counter: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

async function main(): Promise<void> {
  const body = await fetchCached(
    EXPORT_URL,
    EXPORT_CACHE,
    'application/x-ndjson, application/json, text/plain',
  )
  const raw = readExport(body.toString('utf8'))
  const labels = new Map<string, LabelStat>()
  const units = new Map<string, number>()
  const extras = new Map<string, number>()
  const glasses = new Map<string, number>()
  const methods = new Map<string, number>()
  const garnishes = new Map<string, number>()
  for (const cocktail of raw) {
    bump(glasses, cocktail.glass)
    bump(methods, cocktail.method)
    if (cocktail.garnish.trim() !== '') bump(garnishes, cocktail.garnish.trim())
    for (const text of cocktail.ingredients) {
      const line = parseLine(text)
      if (!line) continue
      const stat = labels.get(line.label) ?? { label: line.label, count: 0, withoutQuantity: 0, examples: [] }
      stat.count += 1
      if (line.quantity === null && line.marker === null) stat.withoutQuantity += 1
      if (stat.examples.length < 3 && !stat.examples.includes(text)) stat.examples.push(text)
      labels.set(line.label, stat)
      if (line.unitWord !== null) bump(units, line.unitWord)
      if (line.extra !== null) bump(extras, line.extra)
    }
  }
  const list = [...labels.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  await writeJson(path.join(REVIEW_DIR, '24c-labels.json'), {
    source: EXPORT_URL,
    sha256: sha256(body),
    recipes: raw.length,
    lines: raw.reduce((sum, cocktail) => sum + cocktail.ingredients.length, 0),
    units: sorted(units),
    extras: sorted(extras),
    glasses: sorted(glasses),
    methods: sorted(methods),
    garnishes: sorted(garnishes),
    labels: list,
  })
  console.log(
    `${raw.length} recipes, ${list.length} labels, ${units.size} unit words, ${extras.size} extras, ${garnishes.size} garnishes`,
  )
}

void main()
