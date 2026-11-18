/**
 * Step 2 of the seed pipeline: sugar and acid of juices, sweeteners and sodas from the Ciqual
 * 2020 table (Anses, Licence Ouverte), through the hand-written ciqual-map.json.
 *
 * Ciqual gives grams per 100 g. They become grams per litre with a density of 1 kg/L, which
 * underestimates a juice by about 2 to 5 % (decision D-029). « Acides organiques » is only
 * partly filled in the table: an acid of 0, « traces » or a bound (« < 0,5 ») is not a
 * measurement and is left empty rather than used.
 *
 * Output: scripts/seed/review/ciqual-values.json, read by build.ts.
 *
 * Usage: npx tsx scripts/seed/ciqual.ts [--refresh]
 */
import path from 'node:path'
import { promisify } from 'node:util'
import yauzl from 'yauzl'
import { fetchCached, readJson, REVIEW_DIR, SEED_DIR, sha256, writeJson } from './lib'

export const CIQUAL_URL =
  'https://web.archive.org/web/20250727022008id_/https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip'

const SUGAR = '32000'
const ACID = '65000'

type MapEntry = { sugar?: string; acid?: string }

export type CiqualValue = {
  sugar_g_per_l: number | null
  acid_g_per_l: number | null
  sugar_food: string | null
  acid_food: string | null
}

const fromBuffer = promisify(yauzl.fromBuffer) as (
  buffer: Buffer,
  options: yauzl.Options,
) => Promise<yauzl.ZipFile>

async function readEntries(zip: Buffer, names: readonly string[]): Promise<Map<string, string>> {
  const archive = await fromBuffer(zip, { lazyEntries: true })
  const result = new Map<string, string>()
  await new Promise<void>((resolve, reject) => {
    archive.on('entry', (entry: yauzl.Entry) => {
      if (!names.includes(entry.fileName)) {
        archive.readEntry()
        return
      }
      archive.openReadStream(entry, (error, stream) => {
        if (error) {
          reject(error)
          return
        }
        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => {
          // The table is encoded in windows-1252.
          result.set(entry.fileName, new TextDecoder('windows-1252').decode(Buffer.concat(chunks)))
          archive.readEntry()
        })
        stream.on('error', reject)
      })
    })
    archive.on('end', resolve)
    archive.on('error', reject)
    archive.readEntry()
  })
  return result
}

const field = (block: string, name: string): string =>
  new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`).exec(block)?.[1]?.trim() ?? ''

/** « 9,61 » becomes 9.61 ; « - », « traces » and bounds are not measurements. */
function measurement(text: string): number | null {
  if (!/^\d+(,\d+)?$/.test(text)) return null
  return Number(text.replace(',', '.'))
}

async function main(): Promise<void> {
  const zip = await fetchCached(CIQUAL_URL, 'ciqual/ciqual-2020-xml.zip', 'application/zip')
  console.log(`Ciqual 2020 XML, sha256 ${sha256(zip)}`)
  const files = await readEntries(zip, ['alim_2020_07_07.xml', 'compo_2020_07_07.xml'])
  const foods = new Map<string, string>()
  for (const match of (files.get('alim_2020_07_07.xml') ?? '').matchAll(/<ALIM>([\s\S]*?)<\/ALIM>/g)) {
    const block = match[1] ?? ''
    foods.set(field(block, 'alim_code'), field(block, 'alim_nom_fr'))
  }
  const values = new Map<string, number | null>()
  for (const match of (files.get('compo_2020_07_07.xml') ?? '').matchAll(/<COMPO>([\s\S]*?)<\/COMPO>/g)) {
    const block = match[1] ?? ''
    const constituent = field(block, 'const_code')
    if (constituent !== SUGAR && constituent !== ACID) continue
    values.set(`${field(block, 'alim_code')}:${constituent}`, measurement(field(block, 'teneur')))
  }

  const { map } = await readJson<{ map: Record<string, MapEntry> }>(path.join(SEED_DIR, 'ciqual-map.json'))
  const out: Record<string, CiqualValue> = {}
  for (const [name, entry] of Object.entries(map)) {
    const sugar = entry.sugar ? (values.get(`${entry.sugar}:${SUGAR}`) ?? null) : null
    const rawAcid = entry.acid ? (values.get(`${entry.acid}:${ACID}`) ?? null) : null
    const acid = rawAcid === 0 ? null : rawAcid
    if (entry.sugar && !foods.has(entry.sugar))
      throw new Error(`Unknown Ciqual code ${entry.sugar} for ${name}`)
    if (entry.acid && !foods.has(entry.acid)) throw new Error(`Unknown Ciqual code ${entry.acid} for ${name}`)
    out[name] = {
      // g per 100 g to g per litre, density taken as 1 kg/L.
      sugar_g_per_l: sugar === null ? null : Math.round(sugar * 100) / 10,
      acid_g_per_l: acid === null ? null : Math.round(acid * 100) / 10,
      sugar_food: entry.sugar ? `${entry.sugar} ${foods.get(entry.sugar) ?? ''}` : null,
      acid_food: entry.acid && acid !== null ? `${entry.acid} ${foods.get(entry.acid) ?? ''}` : null,
    }
  }
  await writeJson(path.join(REVIEW_DIR, 'ciqual-values.json'), out)
  console.log(`${Object.keys(out).length} ingredients matched`)
}

void main()
