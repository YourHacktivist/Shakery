/**
 * Revision (section 10.11 and docs/proposals/2026-11-17-modele-donnees-maf.md, part C.3).
 *
 * Questions are generated from the items of a collection: recipes (or their frozen socle
 * reference), culture sheets and rows of summary tables. Wrong answers come from the same
 * generator, first in the collection; with fewer distinct wrong answers than the generator
 * needs, the question becomes a flash card graded by the user. Empty data makes no question.
 * Question keys are stable between devices: `<generator>:<subject id>[:<sub key>]`.
 */
import { normalizeName } from './normalize'

export type PracticeSubjectType = 'recipe' | 'reference_spec' | 'sheet' | 'item' | 'table_row'

/** A recipe as revised: labels already written in French by the caller. */
export type PracticeRecipe = {
  readonly id: string
  readonly subjectType: 'recipe' | 'reference_spec'
  readonly name: string
  readonly lines: ReadonlyArray<{ readonly id: string; readonly label: string; readonly dose: string | null }>
  readonly method: string | null
  readonly glass: string | null
  readonly ice: string | null
  readonly garnish: string | null
  readonly steps: readonly string[]
  readonly length: string | null
  readonly moment: string | null
  readonly family: string | null
  readonly statedAbv: string | null
}

export type PracticeSheet = {
  readonly id: string
  readonly title: string
  readonly classLabel: string | null
  readonly minAbv: string | null
  readonly origin: string | null
  readonly takeaway: string | null
  /** Jury questions and other question and answer items. */
  readonly cards: ReadonlyArray<{ readonly id: string; readonly prompt: string; readonly answer: string }>
}

export type PracticeRow = {
  readonly id: string
  readonly table: string
  /** First cell of the row, which names it. */
  readonly label: string
  /** Columns that can be asked, with the value of this row. */
  readonly cells: ReadonlyArray<{
    readonly column: number
    readonly name: string
    readonly value: string | null
  }>
}

export type PracticeCorpus = {
  readonly recipes: readonly PracticeRecipe[]
  readonly sheets: readonly PracticeSheet[]
  readonly rows: readonly PracticeRow[]
}

export type Question = {
  readonly key: string
  readonly generator: string
  readonly subjectType: PracticeSubjectType
  readonly subjectId: string
  /** What the question is about (recipe, product, table), shown above the prompt. */
  readonly topic: string
  readonly prompt: string
  readonly format: 'choice' | 'card'
  /** Shuffled choices, the answer among them; empty for a card. */
  readonly choices: readonly string[]
  readonly answer: string
}

export type PracticeMode = 'quiz' | 'flashcards'

export type GenerateOptions = {
  readonly mode: PracticeMode
  /** Number of questions at most. */
  readonly limit: number
  /** Keys answered wrongly last time: asked first (« priorité aux points faibles »). */
  readonly weak?: ReadonlySet<string>
  /** Source of randomness in [0, 1), so the tests are reproducible. */
  readonly random?: () => number
}

/** French prompts, given by the caller (core/ has no interface strings). */
export type PracticeStrings = {
  readonly dose: (ingredient: string) => string
  readonly intruder: string
  readonly method: string
  readonly glass: string
  readonly ice: string
  readonly garnish: string
  readonly length: string
  readonly moment: string
  readonly family: string
  readonly abv: string
  readonly recite: string
  readonly className: string
  readonly minAbv: string
  readonly origin: string
  readonly takeaway: string
  readonly cell: (column: string) => string
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = copy[i] as T
    copy[i] = copy[j] as T
    copy[j] = a
  }
  return copy
}

/** Distinct wrong answers (normalised), never equal to the answer. */
function distinctWrong(answer: string, pool: readonly (string | null)[]): string[] {
  const seen = new Set([normalizeName(answer)])
  const wrong: string[] = []
  for (const value of pool) {
    const text = clean(value)
    if (text === null) continue
    const key = normalizeName(text)
    if (seen.has(key)) continue
    seen.add(key)
    wrong.push(text)
  }
  return wrong
}

type Draft = Omit<Question, 'format' | 'choices'> & {
  /** Wrong answers available; null for a question that is always a card. */
  readonly pool: readonly (string | null)[] | null
  /** Wrong answers needed for a multiple choice question (3 by default). */
  readonly minWrong?: number
}

function finish(draft: Draft, mode: PracticeMode, random: () => number): Question {
  const { pool, minWrong = 3, ...base } = draft
  if (mode === 'quiz' && pool !== null) {
    const wrong = shuffle(distinctWrong(draft.answer, pool), random).slice(0, 3)
    if (wrong.length >= minWrong) {
      return { ...base, format: 'choice', choices: shuffle([draft.answer, ...wrong], random) }
    }
  }
  return { ...base, format: 'card', choices: [] }
}

function recipeDrafts(corpus: PracticeCorpus, s: PracticeStrings, random: () => number): Draft[] {
  const drafts: Draft[] = []
  const all = corpus.recipes
  const others = (recipe: PracticeRecipe, pick: (other: PracticeRecipe) => string | null) =>
    all.filter((other) => other.id !== recipe.id).map(pick)

  for (const recipe of all) {
    const subject = { subjectType: recipe.subjectType, subjectId: recipe.id, topic: recipe.name }
    const lines = recipe.lines.filter((line) => clean(line.label) !== null)
    const labels = new Set(lines.map((line) => normalizeName(line.label)))

    for (const line of lines) {
      const dose = clean(line.dose)
      if (dose === null) continue
      drafts.push({
        ...subject,
        key: `dose:${recipe.id}:${line.id}`,
        generator: 'dose',
        prompt: s.dose(line.label.trim()),
        answer: dose,
        pool: [
          ...lines.filter((other) => other.id !== line.id).map((other) => other.dose),
          ...all.flatMap((other) => other.lines.map((l) => l.dose)),
        ],
      })
    }

    if (lines.length >= 3) {
      const outsiders = distinctWrong(
        '',
        all
          .filter((other) => other.id !== recipe.id)
          .flatMap((other) => other.lines.map((line) => line.label))
          .filter((label) => !labels.has(normalizeName(label))),
      )
      const intruder = outsiders[Math.floor(random() * outsiders.length)]
      if (intruder !== undefined) {
        drafts.push({
          ...subject,
          key: `intruder:${recipe.id}`,
          generator: 'intruder',
          prompt: s.intruder,
          answer: intruder,
          pool: lines.map((line) => line.label),
        })
      }
    }

    const fields: Array<[string, string, string | null, (r: PracticeRecipe) => string | null, number]> = [
      ['method', s.method, recipe.method, (r) => r.method, 3],
      ['glass', s.glass, recipe.glass, (r) => r.glass, 3],
      ['ice', s.ice, recipe.ice, (r) => r.ice, 2],
      ['garnish', s.garnish, recipe.garnish, (r) => r.garnish, 3],
      ['length', s.length, recipe.length, (r) => r.length, 1],
      ['moment', s.moment, recipe.moment, (r) => r.moment, 1],
      ['family', s.family, recipe.family, (r) => r.family, 2],
      ['abv', s.abv, recipe.statedAbv, (r) => r.statedAbv, 3],
    ]
    for (const [generator, prompt, value, pick, minWrong] of fields) {
      const answer = clean(value)
      if (answer === null) continue
      drafts.push({
        ...subject,
        key: `${generator}:${recipe.id}`,
        generator,
        prompt,
        answer,
        pool: others(recipe, pick),
        minWrong,
      })
    }

    const recital = [
      ...lines.map((line) => [clean(line.dose), line.label.trim()].filter(Boolean).join(' ')),
      ...[recipe.method, recipe.glass, recipe.garnish].map(clean).filter((v): v is string => v !== null),
    ]
    if (lines.length > 0) {
      drafts.push({
        ...subject,
        key: `recite:${recipe.id}`,
        generator: 'recite',
        prompt: s.recite,
        answer: recital.join('\n'),
        pool: null,
      })
    }
  }
  return drafts
}

function sheetDrafts(corpus: PracticeCorpus, s: PracticeStrings): Draft[] {
  const drafts: Draft[] = []
  const all = corpus.sheets
  for (const sheet of all) {
    const title = clean(sheet.title)
    if (title === null) continue
    const subject = { subjectType: 'sheet' as const, subjectId: sheet.id, topic: title }
    const fields: Array<[string, string, string | null, (other: PracticeSheet) => string | null]> = [
      ['class', s.className, sheet.classLabel, (other) => other.classLabel],
      ['minabv', s.minAbv, sheet.minAbv, (other) => other.minAbv],
      ['origin', s.origin, sheet.origin, (other) => other.origin],
    ]
    for (const [generator, prompt, value, pick] of fields) {
      const answer = clean(value)
      if (answer === null) continue
      drafts.push({
        ...subject,
        key: `${generator}:${sheet.id}`,
        generator,
        prompt,
        answer,
        pool: all.filter((other) => other.id !== sheet.id).map(pick),
      })
    }
    const takeaway = clean(sheet.takeaway)
    // Inverse question, unless the sentence gives the name away.
    if (takeaway !== null && !normalizeName(takeaway).includes(normalizeName(title))) {
      drafts.push({
        subjectType: 'sheet',
        subjectId: sheet.id,
        topic: takeaway,
        key: `takeaway:${sheet.id}`,
        generator: 'takeaway',
        prompt: s.takeaway,
        answer: title,
        pool: all.filter((other) => other.id !== sheet.id).map((other) => other.title),
      })
    }
    for (const card of sheet.cards) {
      const prompt = clean(card.prompt)
      const answer = clean(card.answer)
      if (prompt === null || answer === null) continue
      drafts.push({
        subjectType: 'item',
        subjectId: card.id,
        topic: title,
        key: `qa:${card.id}`,
        generator: 'qa',
        prompt,
        answer,
        pool: null,
      })
    }
  }
  return drafts
}

function rowDrafts(corpus: PracticeCorpus, s: PracticeStrings): Draft[] {
  const drafts: Draft[] = []
  for (const row of corpus.rows) {
    const label = clean(row.label)
    if (label === null) continue
    for (const cell of row.cells) {
      const answer = clean(cell.value)
      if (answer === null) continue
      drafts.push({
        subjectType: 'table_row',
        subjectId: row.id,
        topic: `${row.table} · ${label}`,
        key: `cell:${row.id}:${String(cell.column)}`,
        generator: 'cell',
        prompt: s.cell(cell.name),
        answer,
        pool: corpus.rows
          .filter((other) => other.id !== row.id && other.table === row.table)
          .map((other) => other.cells.find((c) => c.column === cell.column)?.value ?? null),
      })
    }
  }
  return drafts
}

/**
 * Questions of a session: weak points first, then a random draw, at most `limit`.
 * Every question has a prompt and an answer; a multiple choice question has distinct
 * choices, the answer being one of them.
 */
export function generateQuestions(
  corpus: PracticeCorpus,
  strings: PracticeStrings,
  options: GenerateOptions,
): Question[] {
  const random = options.random ?? Math.random
  const weak = options.weak ?? new Set<string>()
  const drafts = [
    ...recipeDrafts(corpus, strings, random),
    ...sheetDrafts(corpus, strings),
    ...rowDrafts(corpus, strings),
  ]
  const ordered = [
    ...shuffle(
      drafts.filter((draft) => weak.has(draft.key)),
      random,
    ),
    ...shuffle(
      drafts.filter((draft) => !weak.has(draft.key)),
      random,
    ),
  ]
  return ordered.slice(0, Math.max(0, options.limit)).map((draft) => finish(draft, options.mode, random))
}

/** True when a typed or chosen answer matches, ignoring case, accents and spaces. */
export function isRightAnswer(question: Pick<Question, 'answer'>, response: string): boolean {
  return normalizeName(response) !== '' && normalizeName(response) === normalizeName(question.answer)
}

export type PracticeAnswerFact = {
  readonly questionKey: string
  readonly isCorrect: boolean | null
  readonly answeredAt: number
}

/** Keys whose last answer was wrong: the « erreurs à revoir » between sessions. */
export function mistakesToReview(answers: readonly PracticeAnswerFact[]): string[] {
  const last = new Map<string, PracticeAnswerFact>()
  for (const answer of answers) {
    const previous = last.get(answer.questionKey)
    if (!previous || answer.answeredAt >= previous.answeredAt) last.set(answer.questionKey, answer)
  }
  return [...last.values()]
    .filter((answer) => answer.isCorrect === false)
    .sort((a, b) => b.answeredAt - a.answeredAt)
    .map((answer) => answer.questionKey)
}
