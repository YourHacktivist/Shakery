/**
 * Reads a printed date label (« 1916 », « Vers 1650 », « XVIIIe s. », « Années 1920 »,
 * « 1920 ou 1933 »...) into the date columns of a knowledge item. The label itself is kept.
 */
export type DateKind =
  | 'year'
  | 'circa'
  | 'range'
  | 'decade'
  | 'century'
  | 'after'
  | 'before'
  | 'alternatives'
  | 'relative'
  | 'undated'

export type ParsedDate = { dateKind: DateKind; yearFrom: number | null; yearTo: number | null }

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 }

function roman(value: string): number {
  let total = 0
  for (let i = 0; i < value.length; i += 1) {
    const current = ROMAN[value[i] ?? ''] ?? 0
    const next = ROMAN[value[i + 1] ?? ''] ?? 0
    total += current < next ? -current : current
  }
  return total
}

/** 18th century: 1700 to 1799. */
function century(value: string): [number, number] {
  const n = roman(value.toUpperCase())
  return [(n - 1) * 100, n * 100 - 1]
}

const result = (dateKind: DateKind, yearFrom: number | null = null, yearTo: number | null = yearFrom) => ({
  dateKind,
  yearFrom,
  yearTo,
})

function parseSimple(label: string): ParsedDate {
  let m: RegExpExecArray | null
  if ((m = /^-\s*(\d+)$/.exec(label))) return result('year', -Number(m[1]))
  if ((m = /^(\d+) av\. J\.-C\.$/i.exec(label))) return result('year', -Number(m[1]))
  if ((m = /^(?:(?:début|fin|mi-?)\s*)?([IVX]+)e(?:\s*-\s*([IVX]+)e)?(?:\s*(?:s\.|siècle))?$/i.exec(label))) {
    const [from] = century(m[1] ?? '')
    const [, to] = century(m[2] ?? m[1] ?? '')
    return result(m[2] ? 'range' : 'century', from, to)
  }
  if ((m = /^(?:(?:fin|début)\s+)?années\s+(\d{3}0)(?:\s*-\s*(\d{4}))?$/i.exec(label))) {
    const from = Number(m[1])
    return m[2] ? result('range', from, Number(m[2]) + 9) : result('decade', from, from + 9)
  }
  if ((m = /^(?:(?:fin|début)\s+)?(\d{3}0)s$/i.exec(label)))
    return result('decade', Number(m[1]), Number(m[1]) + 9)
  if ((m = /^(\d{3,4})\s*-\s*(\d{2,4})(s?)$/.exec(label))) {
    const from = Number(m[1])
    const raw = m[2] ?? ''
    let to = raw.length < 4 ? Number(String(from).slice(0, 4 - raw.length) + raw) : Number(raw)
    if (m[3]) to += 9
    return result('range', from, Math.max(from, to))
  }
  if ((m = /^(?:vers|début|fin|mi-?)\s*(\d{4})$/i.exec(label))) return result('circa', Number(m[1]))
  if ((m = /^après\s+(\d{4})$/i.exec(label))) return result('after', Number(m[1]), null)
  if ((m = /^avant\s+(\d{4})$/i.exec(label))) return result('before', null, Number(m[1]))
  if ((m = /^(?:\d{1,2}\s+)?(?:[\p{L}.]+\s+)?(\d{4})$/u.exec(label))) return result('year', Number(m[1]))
  if ((m = /^[^\d]+:\s*(\d{4})$/.exec(label))) return result('year', Number(m[1]))
  if (/^(aujourd|ensuite|après-guerre)/i.test(label)) return result('relative', null)
  return result('undated', null)
}

export function parseDateLabel(raw: string): ParsedDate {
  // « 1807 (socle) », « 1944 (1953 à Hawaï) »: the bracket is a comment on the date.
  const label = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = label.split(/\s+\/\s+|\s+ou\s+/)
  if (parts.length > 1) {
    const dated = parts.map(parseSimple).filter((p) => p.yearFrom !== null || p.yearTo !== null)
    const years = dated.flatMap((p) => [p.yearFrom, p.yearTo]).filter((y): y is number => y !== null)
    if (years.length > 0) return result('alternatives', Math.min(...years), Math.max(...years))
  }
  return parseSimple(label)
}
