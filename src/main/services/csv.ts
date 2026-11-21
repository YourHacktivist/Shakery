/**
 * CSV export (section 12.4: recipes, journal, ingredients; export only in version 1). The files
 * are made for a spreadsheet in French: semicolon separator, UTF-8 with BOM, CRLF line ends. A
 * cell starting with = + - @ is prefixed with an apostrophe so that a spreadsheet never runs it
 * as a formula (CSV injection). Column headers live here: they belong to the file, not to the
 * interface.
 */
import type { Db } from '../db/client'

export type CsvTable = 'recipes' | 'journal' | 'ingredients'

type Row = Record<string, unknown>

const STATUS: Record<string, string> = {
  idea: 'Idée',
  draft: 'Brouillon',
  testing: 'En test',
  final: 'Finale',
  archived: 'Archivée',
}
const ORIGIN: Record<string, string> = { mine: 'Ma création', classic: 'Classique', other: 'Autre' }
const UNIT: Record<string, string> = {
  ml: 'ml',
  cl: 'cl',
  oz: 'oz',
  dash: 'trait',
  drop: 'goutte',
  barspoon: 'cuillère de bar',
  tsp: 'cuillère à café',
  g: 'g',
  piece: 'pièce',
  leaf: 'feuille',
  slice: 'tranche',
  wedge: 'quartier',
  top: 'compléter',
  to_taste: 'à goût',
}

/** Byte order mark: tells a spreadsheet the file is UTF-8. */
const BOM = String.fromCharCode(0xfeff)

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'number' ? String(value).replace('.', ',') : value
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const cell = (value: unknown) =>
    csvCell(typeof value === 'number' || typeof value === 'string' ? value : null)
  const lines = [headers, ...rows].map((row) => row.map(cell).join(';'))
  return `${BOM}${lines.join('\r\n')}\r\n`
}

function lineText(line: Row): string {
  const unit = UNIT[String(line['unit'])] ?? String(line['unit'])
  const quantity =
    typeof line['quantity'] === 'number' ? `${String(line['quantity']).replace('.', ',')} ` : ''
  const note = typeof line['note'] === 'string' && line['note'] !== '' ? ` (${line['note']})` : ''
  return unit === 'compléter' || unit === 'à goût'
    ? `${String(line['ingredient'])}, ${unit}${note}`
    : `${quantity}${unit} ${String(line['ingredient'])}${note}`
}

const date = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString().slice(0, 10) : '')

export function buildCsv(db: Db, table: CsvTable): string {
  const sqlite = db.$client
  const all = (sql: string) => sqlite.prepare(sql).all() as Row[]
  if (table === 'recipes') {
    const lines = new Map<string, string[]>()
    for (const line of all(
      `SELECT l.recipe_id, l.quantity, l.unit, l.note, i.name AS ingredient FROM recipe_lines l
       JOIN ingredients i ON i.id = l.ingredient_id WHERE l.deleted_at IS NULL ORDER BY l.recipe_id, l.sort_order`,
    )) {
      const list = lines.get(String(line['recipe_id'])) ?? []
      list.push(lineText(line))
      lines.set(String(line['recipe_id']), list)
    }
    const rows = all(
      `SELECT r.id, r.name, r.kind, r.status, r.origin, r.family, r.method, r.garnish, r.version, r.credit,
              g.name AS glass, r.updated_at
       FROM recipes r LEFT JOIN glasses g ON g.id = r.glass_id
       WHERE r.deleted_at IS NULL ORDER BY r.name`,
    )
    return toCsv(
      [
        'Nom',
        'Type',
        'Statut',
        'Origine',
        'Famille',
        'Méthode',
        'Verre',
        'Ingrédients',
        'Décoration',
        'Version',
        'Crédit',
        'Modifiée le',
      ],
      rows.map((r) => [
        r['name'],
        r['kind'] === 'prep' ? 'Préparation' : 'Cocktail',
        STATUS[String(r['status'])] ?? r['status'],
        ORIGIN[String(r['origin'])] ?? r['origin'],
        r['family'],
        r['method'],
        r['glass'],
        (lines.get(String(r['id'])) ?? []).join(' | '),
        r['garnish'],
        r['version'],
        r['credit'],
        date(r['updated_at']),
      ]),
    )
  }
  if (table === 'journal') {
    const rows = all(
      `SELECT t.tasted_at, r.name, t.recipe_version, t.overall, t.comment, t.next_step, t.next_step_done, t.context
       FROM tasting_notes t JOIN recipes r ON r.id = t.recipe_id
       WHERE t.deleted_at IS NULL ORDER BY t.tasted_at DESC`,
    )
    return toCsv(
      ['Date', 'Fiche', 'Version', 'Note', 'Commentaire', 'Prochaine étape', 'Étape testée', 'Contexte'],
      rows.map((r) => [
        date(r['tasted_at']),
        r['name'],
        r['recipe_version'],
        r['overall'],
        r['comment'],
        r['next_step'],
        r['next_step'] ? (r['next_step_done'] === 1 ? 'oui' : 'non') : '',
        r['context'],
      ]),
    )
  }
  const owned = new Set(
    all('SELECT DISTINCT ingredient_id FROM products WHERE owned = 1 AND deleted_at IS NULL').map((r) =>
      String(r['ingredient_id']),
    ),
  )
  const rows = all(
    `SELECT i.id, i.name, c.name AS category, i.default_abv, i.sugar_g_per_l, i.acid_g_per_l, i.is_staple,
            (SELECT group_concat(a.alias, ', ') FROM ingredient_aliases a WHERE a.ingredient_id = i.id AND a.deleted_at IS NULL) AS aliases
     FROM ingredients i JOIN categories c ON c.id = i.category_id
     WHERE i.deleted_at IS NULL ORDER BY c.name, i.name`,
  )
  return toCsv(
    ['Ingrédient', 'Catégorie', 'Degré (% vol.)', 'Sucre (g/L)', 'Acidité (g/L)', 'Alias', 'Au bar'],
    rows.map((r) => [
      r['name'],
      r['category'],
      r['default_abv'],
      r['sugar_g_per_l'],
      r['acid_g_per_l'],
      r['aliases'],
      owned.has(String(r['id'])) || r['is_staple'] === 1 ? 'oui' : 'non',
    ]),
  )
}
