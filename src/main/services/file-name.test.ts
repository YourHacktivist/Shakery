import { describe, expect, it } from 'vitest'
import { safeFileName } from './file-name'

const char = (...codes: number[]) => String.fromCharCode(...codes)

describe('safeFileName', () => {
  it('keeps an ordinary name with its accents and emoji', () => {
    expect(safeFileName('Négroni du soir')).toBe('Négroni du soir')
    expect(safeFileName(`Martini ${String.fromCodePoint(0x1f378)}`)).toBe(
      `Martini ${String.fromCodePoint(0x1f378)}`,
    )
  })

  it('replaces what Windows refuses and never builds a folder path', () => {
    expect(safeFileName('Gin/Tonic: le "vrai" <1> | ou ?*')).toBe('Gin Tonic le vrai 1 ou')
    expect(safeFileName('..\\..\\Windows\\system32')).toBe('.. .. Windows system32')
    expect(safeFileName(`a${char(0, 9, 10, 13, 0x7f)}b`)).toBe('a b')
  })

  it('renames the device names of Windows, with or without extension', () => {
    for (const name of ['CON', 'con', 'Nul', 'aux', 'PRN', 'COM1', 'lpt9', 'nul.txt', 'CON .tar']) {
      expect(safeFileName(name).endsWith('_'), name).toBe(true)
    }
    expect(safeFileName('Console')).toBe('Console')
    expect(safeFileName('Aux fruits')).toBe('Aux fruits')
  })

  it('drops trailing dots and spaces, and falls back on an empty name', () => {
    expect(safeFileName('Daisy No. 2...  ')).toBe('Daisy No. 2')
    for (const empty of ['', '   ', '...', '/\\:', char(0x200b, 0xfeff), char(0xd800)]) {
      expect(safeFileName(empty, 'Fiche')).toBe('Fiche')
    }
  })

  it('removes invisible direction marks that could disguise the extension', () => {
    expect(safeFileName(`fiche${char(0x202e)}fdp.exe`)).toBe('fichefdp.exe')
  })

  it('cuts a long name between two characters, never inside an emoji', () => {
    const cocktail = String.fromCodePoint(0x1f378)
    const name = safeFileName(cocktail.repeat(150))
    expect(Array.from(name)).toHaveLength(100)
    expect(/\p{Cs}/u.test(name)).toBe(false)
    expect(safeFileName(`${'a'.repeat(99)} b`)).toBe('a'.repeat(99))
  })
})
