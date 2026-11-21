import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createUuidV7Generator } from '../../core/uuid'
import { createDb } from '../db/client'
import { openDatabase } from '../db/connection'
import { runMigrations } from '../db/migrate'
import { BUNDLED_SEED } from '../seed/bundled'
import { loadSeedData } from '../seed/load'
import { buildCsv, csvCell, toCsv } from './csv'

describe('CSV export', () => {
  it('quotes separators, quotes and line breaks, and never lets a cell run as a formula', () => {
    expect(csvCell('Gin; tonic')).toBe('"Gin; tonic"')
    expect(csvCell('Le "vrai"')).toBe('"Le ""vrai"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+33 6')).toBe("'+33 6")
    expect(csvCell('-2')).toBe("'-2")
    expect(csvCell(22.5)).toBe('22,5')
    expect(csvCell(null)).toBe('')
    const csv = toCsv(['A', 'B'], [['x', 1]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('A;B\r\nx;1\r\n')
  })

  it('lists the recipes with their ingredients', () => {
    const sqlite = openDatabase(':memory:')
    runMigrations(sqlite, path.resolve(__dirname, '../../../resources/migrations'))
    const db = createDb(sqlite)
    loadSeedData(
      db,
      {
        now: () => 1,
        newId: createUuidV7Generator(
          () => 1,
          (b) => b.fill(4),
        ),
      },
      BUNDLED_SEED,
    )
    const lines = buildCsv(db, 'recipes').slice(1).split('\r\n')
    expect(lines[0]).toMatch(/^Nom;Type;Statut;Origine;/)
    const negroni = lines.find((line) => line.startsWith('Negroni;'))
    expect(negroni).toContain('Cocktail;Finale;Classique')
    expect(negroni).toMatch(/30 ml Gin/)
    expect(buildCsv(db, 'ingredients').split('\r\n').length).toBeGreaterThan(BUNDLED_SEED.ingredients.length)
    expect(buildCsv(db, 'journal').slice(1)).toBe(
      'Date;Fiche;Version;Note;Commentaire;Prochaine étape;Étape testée;Contexte\r\n',
    )
    sqlite.close()
  })
})
