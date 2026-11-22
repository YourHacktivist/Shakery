import { describe, expect, it } from 'vitest'
import {
  hasFormatting,
  parseInline,
  parseRichText,
  plainText,
  toggleList,
  toggleMark,
  type TextEdit,
} from './rich-text'

const text = (value: string) => ({ kind: 'text', text: value }) as const

function applied(value: string, edit: TextEdit): string {
  return value.slice(0, edit.from) + edit.text + value.slice(edit.to)
}

describe('parseInline (D-044)', () => {
  it('reads bold, italic and one inside the other', () => {
    expect(parseInline('**fort** puis *doux*, _aussi_')).toEqual([
      { kind: 'bold', children: [text('fort')] },
      text(' puis '),
      { kind: 'italic', children: [text('doux')] },
      text(', '),
      { kind: 'italic', children: [text('aussi')] },
    ])
    expect(parseInline('***les deux***')).toEqual([
      { kind: 'bold', children: [{ kind: 'italic', children: [text('les deux')] }] },
    ])
    expect(parseInline('**un *mot* fort**')).toEqual([
      { kind: 'bold', children: [text('un '), { kind: 'italic', children: [text('mot')] }, text(' fort')] },
    ])
  })

  it.each([
    '2 * 3 = 6',
    'TAV* selon la loi*',
    'mon_fichier_final',
    '**jamais fermé',
    'a ** b **',
    '4*5*6',
    '****',
    '<img src=x onerror=alert(1)>',
    '[lien](https://exemple.fr)',
  ])('leaves « %s » as typed', (value) => {
    expect(parseInline(value)).toEqual([text(value)])
  })

  it('writes an escaped sign as itself', () => {
    expect(parseInline(String.raw`\*pas italique\*`)).toEqual([text('*pas italique*')])
  })

  it('stays fast on a hostile text', () => {
    const started = performance.now()
    parseRichText('*a '.repeat(10_000))
    parseRichText('a* '.repeat(10_000))
    parseRichText('**b *c '.repeat(3000))
    expect(performance.now() - started).toBeLessThan(1000)
  })
})

describe('parseRichText (D-044)', () => {
  it('cuts paragraphs and lists, and keeps the number a list starts at', () => {
    const blocks = parseRichText('Ligne un\nligne deux\n- menthe\n• basilic\n3. filtrer\n4) servir')
    expect(blocks).toEqual([
      { kind: 'paragraph', content: [text('Ligne un\nligne deux')] },
      { kind: 'bullets', items: [[text('menthe')], [text('basilic')]] },
      { kind: 'numbers', start: 3, items: [[text('filtrer')], [text('servir')]] },
    ])
  })

  it('takes neither a year, a temperature nor a footnote for a list', () => {
    for (const value of ['2024. Une bonne année', '-4 °C au congélateur', '* selon la carte']) {
      expect(hasFormatting(value), value).toBe(false)
    }
  })

  it('gives the text without its marks', () => {
    expect(plainText('**Fort**\n\n- *menthe*')).toBe('Fort\n\n• menthe')
  })
})

describe('editing (D-044)', () => {
  it('puts a mark and takes it off, the space of a double click left out', () => {
    const put = toggleMark('un mot ici', 3, 7, '**')
    expect(applied('un mot ici', put)).toBe('un **mot** ici')
    const again = toggleMark('un **mot** ici', put.select[0], put.select[1], '**')
    expect(applied('un **mot** ici', again)).toBe('un mot ici')
    expect(again.select).toEqual([3, 6])
  })

  it('adds italic inside bold instead of eating a star of it', () => {
    expect(applied('**mot**', toggleMark('**mot**', 2, 5, '*'))).toBe('***mot***')
  })

  it('makes a list of the lines selected, and back', () => {
    const value = 'Avant\nmenthe\nbasilic\nAprès'
    const listed = applied(value, toggleList(value, 8, 18, 'numbers'))
    expect(listed).toBe('Avant\n1. menthe\n2. basilic\nAprès')
    expect(applied(listed, toggleList(listed, 6, 26, 'numbers'))).toBe(value)
    expect(applied('', toggleList('', 0, 0, 'bullets'))).toBe('- ')
  })
})
