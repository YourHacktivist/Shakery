import { describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { frenchSpaces, typeset } from '@renderer/i18n/typography'

const NBSP = String.fromCharCode(0xa0)

function leaves(value: unknown, path: string, found: Array<[string, string]>): void {
  if (typeof value === 'string') found.push([path, value])
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, path ? `${path}.${key}` : key, found)
  }
}

const texts: Array<[string, string]> = []
leaves(fr, '', texts)

/** Words and turns that the user's writing rules forbid (D-052). */
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ['long dash', new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)],
  [
    'hollow word',
    /\b(crucia(l|le|ux|les)|essentiel(le)?s?|véritables?|majeur(e)?s?|leviers?|enjeux?|au cœur de|dans un monde|à l['’]ère|en somme|force est de constater|il convient)\b/i,
  ],
  ['opposition', /(n['’]est pas[^.]{0,60}, c['’]est|ne suffit pas|plus qu['’]une? |il ne s['’]agit pas)/i],
  ['ordinary space before a sign', /[ \t][:;?!»]|«[ \t]/],
  ['sign glued to its word', /[\p{L}\d)][;?!](?=\s|$)/u],
]

describe('French typography', () => {
  it('puts a no-break space before the high signs and inside the quotation marks', () => {
    expect(frenchSpaces('Supprimer « Gin » ?')).toBe(`Supprimer «${NBSP}Gin${NBSP}»${NBSP}?`)
    expect(frenchSpaces('Note : rien ; vraiment !')).toBe(`Note${NBSP}: rien${NBSP}; vraiment${NBSP}!`)
    expect(frenchSpaces('«Annuler»')).toBe(`«${NBSP}Annuler${NBSP}»`)
  })

  it('leaves times, addresses and text already right alone', () => {
    for (const text of ['12:30', 'https://exemple.fr', 'Ratio 2:1', `Déjà${NBSP}: bien`, '?', 'Ctrl+?']) {
      expect(frenchSpaces(text)).toBe(text)
    }
  })

  it('reaches the texts built by a function', () => {
    expect(fr.shell.version('1.0.0')).toBe('Version 1.0.0')
    expect(fr.settings.updates.checkedAt('maintenant')).toBe(`Dernière recherche${NBSP}: maintenant.`)
  })
})

describe('writing rules', () => {
  it('reads more than two thousand texts', () => {
    expect(texts.length).toBeGreaterThan(2000)
  })

  it.each(FORBIDDEN.map(([rule, pattern]) => [rule, pattern] as const))(
    'no %s in the interface',
    (_rule, pattern) => {
      expect(
        texts.filter(([, text]) => pattern.test(text)).map(([path, text]) => `${path} = ${text}`),
      ).toEqual([])
    },
  )
})

describe('typeset', () => {
  it('keeps a block shared by two screens as one object', () => {
    const shared = { title: 'Bloc : partagé' }
    const tree = typeset({ a: [shared], b: [shared] })
    expect(tree.a[0]).toBe(tree.b[0])
    expect(tree.a[0]?.title).toBe(`Bloc${NBSP}: partagé`)
  })
})
