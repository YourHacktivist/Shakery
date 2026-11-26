import { GraduationCap } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { generateQuestions, type PracticeCorpus, type PracticeMode, type Question } from '@core/practice'
import { Button } from '@renderer/components/Button'
import { ControlRow } from '@renderer/components/ControlRow'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Toggle } from '@renderer/components/Toggle'
import { PRACTICE_STRINGS, toPracticeCorpus } from '@renderer/features/practice/corpus'
import { PracticeSession, type Session } from '@renderer/features/practice/PracticeSession'
import { SessionScore } from '@renderer/features/practice/SessionScore'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate } from '@renderer/lib/format'
import { usePracticeCorpus, usePracticeHistory, useWeakKeys } from '@renderer/lib/queries'

const t = fr.workshop.practice
const LENGTHS = ['10', '20', '40'] as const
/** Questions drawn to count what a collection can give: far more than a session asks. */
const ALL = 10_000
const SHOWN_SESSIONS = 5
const SHOWN_WEAK = 6

type Length = (typeof LENGTHS)[number]
type Order = 'random' | 'collection'

/** Position of each subject in the collection: a recipe, a sheet and its cards, a row. */
function subjectRanks(corpus: PracticeCorpus): Map<string, number> {
  const ranks = new Map<string, number>()
  let rank = 0
  for (const recipe of corpus.recipes) ranks.set(recipe.id, rank++)
  for (const sheet of corpus.sheets) {
    ranks.set(sheet.id, rank)
    for (const card of sheet.cards) ranks.set(card.id, rank)
    rank += 1
  }
  for (const row of corpus.rows) ranks.set(row.id, rank++)
  return ranks
}

/** The questions of a session in the order of the collection, those to review first if asked. */
function inCollectionOrder(
  questions: readonly Question[],
  ranks: Map<string, number>,
  weak: ReadonlySet<string>,
): Question[] {
  const rankOf = (question: Question) => ranks.get(question.subjectId) ?? ranks.size
  return [...questions].sort(
    (a, b) => Number(weak.has(b.key)) - Number(weak.has(a.key)) || rankOf(a) - rankOf(b),
  )
}

/**
 * Tab « Réviser » of a collection (section 10.11, D-057): the mode, the settings as rows, one
 * button to start; the last sessions and the questions to review in the calm column.
 */
export function PracticePanel({ collectionId, itemCount }: { collectionId: string; itemCount: number }) {
  const [mode, setMode] = useState<PracticeMode>('quiz')
  const [length, setLength] = useState<Length>('20')
  const [order, setOrder] = useState<Order>('random')
  const [weakFirst, setWeakFirst] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const corpus = usePracticeCorpus(collectionId)
  const weak = useWeakKeys()
  const weakKeys = useMemo(() => new Set(weak.data ?? []), [weak.data])

  const available = useMemo(
    () =>
      corpus.data
        ? generateQuestions(toPracticeCorpus(corpus.data), PRACTICE_STRINGS, { mode: 'quiz', limit: ALL })
        : [],
    [corpus.data],
  )
  const toReview = available.filter((question) => weakKeys.has(question.key))
  const count = Math.min(Number(length), available.length)

  function start() {
    if (!corpus.data) return
    const source = toPracticeCorpus(corpus.data)
    const priority = weakFirst ? weakKeys : new Set<string>()
    const limit = Number(length)
    const drawn = generateQuestions(source, PRACTICE_STRINGS, {
      mode,
      limit: order === 'random' ? limit : ALL,
      weak: priority,
    })
    setSession({
      collectionId,
      mode,
      questions:
        order === 'random' ? drawn : inCollectionOrder(drawn, subjectRanks(source), priority).slice(0, limit),
    })
  }

  if (session) {
    return (
      <PracticeSession
        session={session}
        onRestart={start}
        onExit={() => {
          setSession(null)
        }}
      />
    )
  }

  return (
    <div className="@container">
      <div className="grid items-start gap-x-14 gap-y-10 @min-[56rem]:grid-cols-[minmax(0,1fr)_272px]">
        <div className="flex min-w-0 flex-col gap-7">
          <section aria-labelledby="practice-mode-title" className="flex flex-col gap-3">
            <SectionTitle id="practice-mode-title">{t.mode}</SectionTitle>
            <ModeChoice value={mode} onChange={setMode} labelledBy="practice-mode-title" />
          </section>

          <section aria-labelledby="practice-options-title" className="flex flex-col gap-1">
            <SectionTitle id="practice-options-title">{t.options}</SectionTitle>
            <div>
              <ControlRow label={t.length}>
                <SegmentedControl<Length>
                  label={t.length}
                  value={length}
                  onChange={setLength}
                  options={LENGTHS.map((value) => ({ value, label: value }))}
                />
              </ControlRow>
              <ControlRow label={t.order}>
                <SegmentedControl<Order>
                  label={t.order}
                  value={order}
                  onChange={setOrder}
                  options={[
                    { value: 'random', label: t.orders.random },
                    { value: 'collection', label: t.orders.collection },
                  ]}
                />
              </ControlRow>
              <ControlRow label={t.weakFirst} hint={t.weakFirstHint(toReview.length)}>
                <Toggle
                  label={t.weakFirst}
                  hideLabel
                  showState
                  checked={weakFirst}
                  onCheckedChange={setWeakFirst}
                />
              </ControlRow>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5">
            <Button
              icon={<GraduationCap size={16} aria-hidden="true" />}
              disabled={!corpus.isSuccess || available.length === 0}
              onClick={start}
            >
              {t.start}
            </Button>
            {corpus.isSuccess ? (
              <p className="m-0 text-small text-fg-muted">
                {available.length === 0 ? t.noQuestion : t.summary(count, itemCount)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-7">
          <LastSessions collectionId={collectionId} />
          {toReview.length > 0 ? <ToReview questions={toReview} /> : null}
        </div>
      </div>
    </div>
  )
}

const MODES = [
  { value: 'flashcards', label: t.modes.flashcards, hint: t.flashcardsHint },
  { value: 'quiz', label: t.modes.quiz, hint: t.quizHint },
] as const satisfies ReadonlyArray<{ value: PracticeMode; label: string; hint: string }>

const MOVE: Partial<Record<string, number>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/** The two modes as rows to choose from, the chosen one marked like the current screen of the sidebar. */
function ModeChoice({
  value,
  onChange,
  labelledBy,
}: {
  value: PracticeMode
  onChange: (mode: PracticeMode) => void
  labelledBy: string
}) {
  const groupRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = MOVE[event.key]
    if (step === undefined) return
    event.preventDefault()
    const current = MODES.findIndex((mode) => mode.value === value)
    const next = (current + step + MODES.length) % MODES.length
    const target = MODES[next]
    if (!target) return
    onChange(target.value)
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-1"
      onKeyDown={onKeyDown}
    >
      {MODES.map((mode) => {
        const on = mode.value === value
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-labelledby={`practice-mode-${mode.value}`}
            aria-describedby={`practice-mode-${mode.value}-hint`}
            tabIndex={on ? 0 : -1}
            className={cn(
              'relative flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-nested border px-3.5 py-2.5 text-left transition-[background-color,border-color] duration-150 ease-out-soft',
              on
                ? "border-accent/20 bg-[linear-gradient(90deg,rgb(239_120_43/0.13),rgb(239_120_43/0.03))] before:absolute before:top-[13px] before:-left-px before:h-4 before:w-[3px] before:rounded-full before:bg-accent before:shadow-[0_0_10px_rgb(239_120_43/0.8)] before:content-['']"
                : 'border-transparent hover:bg-tint/4',
            )}
            onClick={() => {
              onChange(mode.value)
            }}
          >
            <span
              id={`practice-mode-${mode.value}`}
              className={cn('text-lead font-semibold', on ? 'text-fg' : 'text-fg-secondary')}
            >
              {mode.label}
            </span>
            <span
              id={`practice-mode-${mode.value}-hint`}
              className={cn('text-small', on ? 'text-fg-secondary' : 'text-fg-muted')}
            >
              {mode.hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The last sessions of this collection, with their score. */
function LastSessions({ collectionId }: { collectionId: string }) {
  const history = usePracticeHistory()
  const sessions = (history.data ?? [])
    .filter((entry) => entry.collectionId === collectionId && entry.mode !== 'calc')
    .slice(0, SHOWN_SESSIONS)
  return (
    <section aria-labelledby="practice-history-title" className="flex flex-col">
      <SectionTitle id="practice-history-title" tone="muted" className="pb-1">
        {t.history}
      </SectionTitle>
      {sessions.length === 0 ? (
        <p className="m-0 pt-2 text-small text-fg-muted">{t.historyEmpty}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {sessions.map((entry) => (
            <li
              key={entry.id}
              className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-2.5"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold text-fg">
                  {entry.mode === 'flashcards' ? t.modes.flashcards : t.modes.quiz}
                </span>
                <span className="nums text-small text-fg-muted">{formatDate(entry.finishedAt)}</span>
              </div>
              <SessionScore score={entry.score} total={entry.total} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** What was missed last time in this collection, grouped by recipe or sheet. */
function ToReview({ questions }: { questions: readonly Question[] }) {
  const topics = new Map<string, { topic: string; recipeId: string | null; count: number }>()
  for (const question of questions) {
    const entry = topics.get(question.topic) ?? {
      topic: question.topic,
      recipeId: question.subjectType === 'recipe' ? question.subjectId : null,
      count: 0,
    }
    entry.count += 1
    topics.set(question.topic, entry)
  }
  return (
    <section aria-labelledby="practice-weak-title" className="flex flex-col">
      <SectionTitle id="practice-weak-title" tone="muted" className="pb-1">
        {t.weakTitle}
      </SectionTitle>
      <ul className="m-0 list-none p-0">
        {[...topics.values()].slice(0, SHOWN_WEAK).map((entry) => (
          <li
            key={entry.topic}
            className="flex min-h-14 flex-col justify-center gap-0.5 border-b border-border py-2.5"
          >
            {entry.recipeId ? (
              <Link
                to={`/recipes/${entry.recipeId}`}
                className="w-fit max-w-full truncate rounded-sm text-body font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
              >
                {entry.topic}
              </Link>
            ) : (
              <span className="truncate text-body font-semibold text-fg">{entry.topic}</span>
            )}
            <span className="text-small text-fg-secondary">{t.weakCount(entry.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
