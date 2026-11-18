// The best-before dates are checked in the time zone of the user, with its summer time.
process.env['TZ'] = 'Europe/Paris'

import { describe, expect, it } from 'vitest'
import { scaleBatch, type BatchLineInput } from './batch'
import {
  generateQuestions,
  isRightAnswer,
  mistakesToReview,
  type PracticeCorpus,
  type PracticeStrings,
} from './practice'
import { bestBeforeFrom, daysLeft, isExpired, startOfLocalDay } from './shelf-life'

const at = (iso: string) => new Date(iso).getTime()

describe('shelf life', () => {
  it('ends at the last millisecond of the local day, whatever the hour of making', () => {
    const late = bestBeforeFrom(at('2026-06-10T23:50:00'), 3)
    expect(new Date(late).toString()).toContain('Sat Jun 13 2026 23:59:59')
    const early = bestBeforeFrom(at('2026-06-10T00:00:00'), 3)
    expect(early).toBe(late)
    expect(bestBeforeFrom(at('2026-06-10T12:00:00'), 0)).toBe(at('2026-06-10T23:59:59.999'))
  })

  it('counts calendar days across the spring and autumn time changes', () => {
    // 29 March 2026 lasts 23 hours, 25 October 2026 lasts 25 hours in Paris.
    const spring = bestBeforeFrom(at('2026-03-28T23:30:00'), 1)
    expect(new Date(spring).getDate()).toBe(29)
    expect(new Date(spring).getHours()).toBe(23)
    const autumn = bestBeforeFrom(at('2026-10-24T12:00:00'), 2)
    expect(new Date(autumn).getDate()).toBe(26)
    expect(new Date(autumn).getHours()).toBe(23)
    expect(daysLeft(autumn, at('2026-10-24T08:00:00'))).toBe(2)
    expect(daysLeft(spring, at('2026-03-28T01:00:00'))).toBe(1)
    expect(startOfLocalDay(at('2026-03-29T12:00:00'))).toBe(at('2026-03-29T00:00:00'))
  })

  it('is still good on its last day until midnight, then expired', () => {
    const bestBefore = bestBeforeFrom(at('2026-11-01T10:00:00'), 2)
    expect(daysLeft(bestBefore, at('2026-11-03T23:59:00'))).toBe(0)
    expect(isExpired(bestBefore, bestBefore)).toBe(false)
    expect(isExpired(bestBefore, bestBefore + 1)).toBe(true)
    expect(daysLeft(bestBefore, at('2026-11-04T00:00:01'))).toBe(-1)
    expect(daysLeft(null, Date.now())).toBeNull()
    expect(isExpired(null, Date.now())).toBe(false)
    expect(() => bestBeforeFrom(0, -1)).toThrow(RangeError)
    expect(() => bestBeforeFrom(0, 1.5)).toThrow(RangeError)
  })
})

describe('batch', () => {
  const line = (
    id: string,
    quantity: number | null,
    unit: BatchLineInput['unit'],
    extra: Partial<BatchLineInput> = {},
  ) =>
    ({
      id,
      label: id,
      quantity,
      unit,
      topEstimateMl: null,
      hint: 'ok',
      isGarnish: false,
      isOptional: false,
      ...extra,
    }) satisfies BatchLineInput

  it('multiplies each line, adds the dilution water and sets the sparkling part aside', () => {
    const result = scaleBatch(
      [
        line('gin', 3, 'cl'),
        line('vermouth', 30, 'ml'),
        line('bitters', 2, 'dash'),
        line('soda', null, 'top', { topEstimateMl: 60, hint: 'add_at_service' }),
        line('orange', 1, 'slice', { isGarnish: true }),
      ],
      { servings: 10, dilution: 0.2, includeWater: true },
    )
    expect(result.lines.map((l) => [l.id, l.quantity, l.unit, l.ml])).toEqual([
      ['gin', 30, 'cl', 300],
      ['vermouth', 300, 'ml', 300],
      ['bitters', 20, 'dash', 5],
      ['soda', 600, 'ml', 600],
      ['orange', 10, 'slice', null],
    ])
    // Water on the whole drink: (300 + 300 + 5 + 600) × 0.2.
    expect(result.waterMl).toBe(241)
    expect(result.bottleMl).toBe(605 + 241)
    expect(result.serviceMl).toBe(600)
  })

  it('leaves the water out on request and counts sugar in grams through its density', () => {
    const result = scaleBatch([line('sugar', 159, 'g', { densityGPerMl: 1.59 })], {
      servings: 2,
      dilution: 0.25,
      includeWater: false,
    })
    expect(result.lines[0]?.ml).toBe(200)
    expect(result.waterMl).toBe(0)
    expect(() => scaleBatch([], { servings: 0, dilution: 0, includeWater: false })).toThrow(RangeError)
  })
})

const STRINGS: PracticeStrings = {
  dose: (ingredient) => `Dose de ${ingredient} ?`,
  intruder: 'Intrus ?',
  method: 'Méthode ?',
  glass: 'Verre ?',
  ice: 'Glace ?',
  garnish: 'Décor ?',
  length: 'Short ou long ?',
  moment: 'Moment ?',
  family: 'Famille ?',
  abv: 'TAV ?',
  recite: 'Récite',
  className: 'Classe ?',
  minAbv: 'TAV minimum ?',
  origin: 'Origine ?',
  takeaway: 'Quel produit ?',
  cell: (column) => `${column} ?`,
}

function recipe(
  id: string,
  lines: Array<[string, string | null]>,
  extra: Partial<PracticeCorpus['recipes'][number]> = {},
) {
  return {
    id,
    subjectType: 'recipe' as const,
    name: id,
    lines: lines.map(([label, dose], index) => ({ id: `${id}-${String(index)}`, label, dose })),
    method: null,
    glass: null,
    ice: null,
    garnish: null,
    steps: [],
    length: null,
    moment: null,
    family: null,
    statedAbv: null,
    ...extra,
  }
}

const CORPUS: PracticeCorpus = {
  recipes: [
    recipe(
      'Negroni',
      [
        ['Gin', '3 cl'],
        ['Campari', '3 cl'],
        ['Vermouth rouge', '3 cl'],
      ],
      {
        method: 'Verre à mélange',
        glass: 'Old fashioned',
        length: 'Short',
      },
    ),
    recipe(
      'Daiquiri',
      [
        ['Rhum', '6 cl'],
        ['Citron vert', '2 cl'],
        ['Sirop', '1,5 cl'],
      ],
      {
        method: 'Shaker',
        glass: 'Coupe',
        length: 'Short',
      },
    ),
    recipe(
      'Mojito',
      [
        ['Rhum', '4,5 cl'],
        ['Menthe', null],
        ['Soda', ''],
      ],
      {
        method: 'Directement au verre',
        glass: 'Highball',
        length: 'Long',
      },
    ),
    recipe(
      'Martini',
      [
        ['Gin', '6 cl'],
        ['Vermouth sec', '1 cl'],
      ],
      { method: 'Verre à mélange', glass: 'Martini' },
    ),
  ],
  sheets: [
    {
      id: 'rhum',
      title: 'Rhum agricole',
      classLabel: 'Eau-de-vie de canne',
      minAbv: '40 %',
      origin: 'Martinique',
      takeaway: 'Distillé à partir de jus de canne frais.',
      cards: [
        { id: 'q1', prompt: 'Qu’est-ce que la vesou ?', answer: 'Le jus de canne.' },
        { id: 'q2', prompt: '  ', answer: 'vide' },
      ],
    },
    {
      id: 'gin',
      title: 'Gin',
      classLabel: 'Spiritueux',
      minAbv: '37,5 %',
      origin: null,
      takeaway: null,
      cards: [],
    },
  ],
  rows: [],
}

/** Seeded random numbers, so a failing draw can be replayed. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}

describe('practice', () => {
  it('never generates an empty question, and the answer is always one of the distinct choices', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const questions = generateQuestions(CORPUS, STRINGS, { mode: 'quiz', limit: 500, random: seeded(seed) })
      expect(questions.length).toBeGreaterThan(10)
      for (const question of questions) {
        expect(question.prompt.trim()).not.toBe('')
        expect(question.answer.trim()).not.toBe('')
        if (question.format === 'choice') {
          expect(question.choices).toContain(question.answer)
          expect(new Set(question.choices).size).toBe(question.choices.length)
          expect(question.choices.length).toBeGreaterThanOrEqual(2)
        }
      }
      const keys = questions.map((q) => q.key)
      expect(new Set(keys).size).toBe(keys.length)
      // A missing dose, a blank question or an empty origin makes no question.
      expect(keys).not.toContain('dose:Mojito:Mojito-1')
      expect(keys).not.toContain('qa:q2')
      expect(keys).not.toContain('origin:gin')
    }
  })

  it('turns a question without enough wrong answers into a card, and everything into cards in flash card mode', () => {
    const questions = generateQuestions(CORPUS, STRINGS, { mode: 'quiz', limit: 500, random: seeded(3) })
    const byKey = new Map(questions.map((q) => [q.key, q]))
    expect(byKey.get('glass:Negroni')?.format).toBe('choice')
    // Two other methods only: a card.
    expect(byKey.get('method:Negroni')?.format).toBe('card')
    // Only one other class label exists: a card.
    expect(byKey.get('class:rhum')?.format).toBe('card')
    // Short or long has two values: two choices are enough.
    expect(byKey.get('length:Mojito')?.choices).toHaveLength(2)
    expect(byKey.get('qa:q1')?.format).toBe('card')
    const intruder = byKey.get('intruder:Negroni')
    expect(intruder?.choices).toContain(intruder?.answer)
    expect(['Gin', 'Campari', 'Vermouth rouge']).not.toContain(intruder?.answer)
    const cards = generateQuestions(CORPUS, STRINGS, { mode: 'flashcards', limit: 500, random: seeded(3) })
    expect(cards.every((q) => q.format === 'card')).toBe(true)
  })

  it('asks weak points first and respects the limit', () => {
    const weak = new Set(['glass:Martini', 'qa:q1'])
    const questions = generateQuestions(CORPUS, STRINGS, { mode: 'quiz', limit: 5, weak, random: seeded(9) })
    expect(questions).toHaveLength(5)
    expect(new Set(questions.slice(0, 2).map((q) => q.key))).toEqual(weak)
  })

  it('compares answers without case or accents and lists the last mistakes', () => {
    expect(isRightAnswer({ answer: 'Verre à mélange' }, 'verre a melange')).toBe(true)
    expect(isRightAnswer({ answer: 'Coupe' }, '')).toBe(false)
    expect(
      mistakesToReview([
        { questionKey: 'a', isCorrect: false, answeredAt: 1 },
        { questionKey: 'a', isCorrect: true, answeredAt: 2 },
        { questionKey: 'b', isCorrect: false, answeredAt: 3 },
        { questionKey: 'c', isCorrect: null, answeredAt: 4 },
      ]),
    ).toEqual(['b'])
  })
})
