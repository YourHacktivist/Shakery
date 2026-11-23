import { Check, GraduationCap, History, RotateCcw, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { generateQuestions, isRightAnswer, type PracticeMode, type Question } from '@core/practice'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { EmptyState } from '@renderer/components/EmptyState'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { Select } from '@renderer/components/Select'
import { notifyError } from '@renderer/features/shared/notify'
import { PRACTICE_STRINGS, toPracticeCorpus } from '@renderer/features/practice/corpus'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatRelative } from '@renderer/lib/format'
import {
  useCollections,
  useFinishPractice,
  usePracticeCorpus,
  usePracticeHistory,
  useWeakKeys,
} from '@renderer/lib/queries'
import type { PracticeAnswerInput } from '@shared/domain/workshop'

const t = fr.workshop.practice
const LENGTHS = [10, 20, 40] as const

type Session = {
  collectionId: string
  mode: PracticeMode
  questions: Question[]
}

/** Revision (section 10.11): flash cards and multiple choice on a collection. */
export function PracticePage() {
  const [params, setParams] = useSearchParams()
  const collections = useCollections()
  const list = collections.data ?? []
  const collectionId = params.get('collection') ?? list[0]?.id ?? null
  const [mode, setMode] = useState<PracticeMode>('quiz')
  const [length, setLength] = useState<number>(20)
  const [session, setSession] = useState<Session | null>(null)
  const corpus = usePracticeCorpus(collectionId)
  const weak = useWeakKeys()

  const available = useMemo(
    () =>
      corpus.data
        ? generateQuestions(toPracticeCorpus(corpus.data), PRACTICE_STRINGS, { mode: 'quiz', limit: 10_000 })
        : [],
    [corpus.data],
  )
  const weakHere = available.filter((question) => (weak.data ?? []).includes(question.key)).length

  function start() {
    if (!corpus.data || collectionId === null) return
    setSession({
      collectionId,
      mode,
      questions: generateQuestions(toPracticeCorpus(corpus.data), PRACTICE_STRINGS, {
        mode,
        limit: length,
        weak: new Set(weak.data ?? []),
      }),
    })
  }

  if (session) {
    return (
      <SessionView
        session={session}
        onRestart={start}
        onExit={() => {
          setSession(null)
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="text-caption text-fg-muted">{t.subtitle}</span>
        <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
      </header>

      {collections.isPending ? null : list.length === 0 ? (
        <EmptyState
          title={t.emptyCollections.title}
          description={t.emptyCollections.description}
          className="min-h-[320px] p-8"
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4">
          <Card className="gap-4">
            <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-4">
              <Select
                label={t.collection}
                value={collectionId ?? ''}
                options={list.map((collection) => ({ value: collection.id, label: collection.name }))}
                onChange={(event) => {
                  setParams({ collection: event.target.value }, { replace: true })
                }}
              />
              <Select
                label={t.length}
                value={String(length)}
                options={LENGTHS.map((value) => ({ value: String(value), label: String(value) }))}
                onChange={(event) => {
                  setLength(Number(event.target.value))
                }}
              />
            </div>
            <SegmentedControl
              label={t.mode}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'quiz', label: t.modes.quiz },
                { value: 'flashcards', label: t.modes.flashcards },
              ]}
            />
            {corpus.isSuccess && available.length === 0 ? (
              <p className="m-0 text-small text-fg-secondary">{t.noQuestion}</p>
            ) : (
              <p className="m-0 text-small text-fg-secondary">{t.weakFirst(weakHere)}</p>
            )}
            <Button
              className="self-start"
              icon={<GraduationCap size={16} aria-hidden="true" />}
              disabled={!corpus.isSuccess || available.length === 0}
              onClick={start}
            >
              {t.start}
            </Button>
          </Card>
          <HistoryCard />
        </div>
      )}
    </div>
  )
}

function HistoryCard() {
  const history = usePracticeHistory()
  const sessions = history.data ?? []
  return (
    <Card aria-label={t.history} className="gap-3">
      <h2 className="m-0 flex items-center gap-2 text-body font-semibold text-fg">
        <History size={15} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
        {t.history}
      </h2>
      {sessions.length === 0 ? (
        <p className="m-0 text-small text-fg-secondary">{t.historyEmpty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {sessions.slice(0, 12).map((entry) => {
            const ratio = entry.total === 0 ? 0 : entry.score / entry.total
            return (
              <li key={entry.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    'nums w-12 shrink-0 text-small font-semibold',
                    ratio >= 0.8
                      ? 'text-status-ok'
                      : ratio >= 0.5
                        ? 'text-accent-soft'
                        : 'text-status-danger',
                  )}
                >
                  {t.session(entry.score, entry.total)}
                </span>
                <span className="min-w-0 flex-1 truncate text-small text-fg">
                  {entry.collectionName ?? ''}
                </span>
                <span className="shrink-0 text-caption text-fg-muted">
                  {formatRelative(entry.finishedAt)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

type Answer = { question: Question; response: string | null; correct: boolean | null; selfGraded: boolean }

function SessionView({
  session,
  onRestart,
  onExit,
}: {
  session: Session
  onRestart: () => void
  onExit: () => void
}) {
  const finish = useFinishPractice()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const question = session.questions[index]

  function record(answer: Answer) {
    const next = [...answers, answer]
    setAnswers(next)
    return next
  }

  function advance(all: Answer[]) {
    setPicked(null)
    setRevealed(false)
    if (index + 1 < session.questions.length) {
      setIndex(index + 1)
      return
    }
    setDone(true)
    const now = Date.now()
    const payload: PracticeAnswerInput[] = all.map((answer) => ({
      questionKey: answer.question.key,
      generator: answer.question.generator,
      subjectType: answer.question.subjectType,
      subjectId: answer.question.subjectId,
      expected: answer.question.answer.slice(0, 4000),
      response: answer.response?.slice(0, 4000) ?? null,
      isCorrect: answer.correct,
      selfGraded: answer.selfGraded,
      answeredAt: now,
    }))
    finish.mutate(
      { collectionId: session.collectionId, mode: session.mode, answers: payload },
      { onError: notifyError },
    )
  }

  if (done || !question) {
    const score = answers.filter((answer) => answer.correct === true).length
    const mistakes = answers.filter((answer) => answer.correct === false)
    return (
      <div className="mx-auto flex max-w-[760px] animate-fade-in flex-col gap-4">
        <Card className="items-center gap-2 py-8 text-center">
          <span className="text-caption font-medium text-fg-muted">{t.result.title}</span>
          <span className="nums text-display font-light text-copper">
            {t.result.score(score, answers.length)}
          </span>
        </Card>
        <Card aria-label={t.result.mistakes} className="gap-3">
          <h2 className="m-0 text-body font-semibold text-fg">{t.result.mistakes}</h2>
          {mistakes.length === 0 ? (
            <p className="m-0 text-small text-status-ok">{t.result.none}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {mistakes.map((answer) => (
                <li
                  key={answer.question.key}
                  className="rounded-nested border border-border bg-surface-2 px-3 py-2"
                >
                  <span className="text-caption text-fg-muted">{answer.question.topic}</span>
                  <p className="m-0 text-small text-fg">{answer.question.prompt}</p>
                  <p className="m-0 text-small whitespace-pre-line text-accent-soft">
                    {answer.question.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex gap-2">
          <Button icon={<RotateCcw size={14} aria-hidden="true" />} onClick={onRestart}>
            {t.result.again}
          </Button>
          <Button variant="ghost" onClick={onExit}>
            {t.result.back}
          </Button>
        </div>
      </div>
    )
  }

  const total = session.questions.length
  const right = picked !== null && isRightAnswer(question, picked)

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="nums text-small font-medium text-fg-secondary">{t.progress(index + 1, total)}</span>
        <Button variant="ghost" size="sm" onClick={onExit}>
          {t.quit}
        </Button>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-label={t.progress(index + 1, total)}
        className="h-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="h-full origin-left bg-accent-gradient transition-transform duration-250 ease-out-soft"
          style={{ transform: `scaleX(${String(index / total)})` }}
        />
      </div>

      <Card key={question.key} className="animate-rise gap-4 p-6">
        <span className="text-caption font-medium text-accent-soft">{question.topic}</span>
        <h2 className="m-0 text-heading leading-snug font-medium text-fg">{question.prompt}</h2>

        {question.format === 'choice' ? (
          <div role="group" aria-label={question.prompt} className="grid grid-cols-2 gap-2">
            {question.choices.map((choice, choiceIndex) => {
              const isAnswer = isRightAnswer(question, choice)
              const state =
                picked === null ? 'idle' : isAnswer ? 'right' : picked === choice ? 'wrong' : 'other'
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={picked !== null}
                  className={cn(
                    'animate-rise flex min-h-12 cursor-pointer items-center gap-2 rounded-nested border px-3.5 py-2.5 text-left text-body transition-[background-color,border-color,color,transform] duration-200 ease-out-soft disabled:cursor-default',
                    state === 'idle' &&
                      'border-border-strong bg-surface-2 text-fg hover:-translate-y-px hover:border-accent/50 hover:bg-surface-3',
                    state === 'right' && 'border-status-ok/60 bg-status-ok/12 text-fg',
                    state === 'wrong' && 'border-status-danger/60 bg-status-danger/12 text-fg',
                    state === 'other' && 'border-border bg-surface-1 text-fg-muted',
                  )}
                  style={{ '--rise-index': choiceIndex } as CSSProperties}
                  onClick={() => {
                    setPicked(choice)
                  }}
                >
                  <span className="min-w-0 flex-1 whitespace-pre-line">{choice}</span>
                  {state === 'right' ? (
                    <Check size={16} aria-hidden="true" className="shrink-0 text-status-ok" />
                  ) : null}
                  {state === 'wrong' ? (
                    <X size={16} aria-hidden="true" className="shrink-0 text-status-danger" />
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : revealed ? (
          <p className="m-0 animate-fade-in rounded-nested border border-accent/25 bg-accent/8 px-4 py-3 text-body whitespace-pre-line text-fg">
            {question.answer}
          </p>
        ) : null}

        {question.format === 'choice' && picked !== null ? (
          <div className="flex animate-fade-in items-center justify-between gap-3">
            <p
              role="status"
              className={cn('m-0 text-small font-medium', right ? 'text-status-ok' : 'text-status-danger')}
            >
              {right ? t.right : t.wrong(question.answer)}
            </p>
            <Button
              data-autofocus=""
              onClick={() => {
                advance(record({ question, response: picked, correct: right, selfGraded: false }))
              }}
            >
              {index + 1 < total ? t.next : t.finish}
            </Button>
          </div>
        ) : null}

        {question.format === 'card' ? (
          revealed ? (
            <div className="flex gap-2">
              <Button
                icon={<Check size={14} aria-hidden="true" />}
                onClick={() => {
                  advance(record({ question, response: null, correct: true, selfGraded: true }))
                }}
              >
                {t.knew}
              </Button>
              <Button
                variant="outline"
                icon={<RotateCcw size={14} aria-hidden="true" />}
                onClick={() => {
                  advance(record({ question, response: null, correct: false, selfGraded: true }))
                }}
              >
                {t.didNotKnow}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="self-start"
              onClick={() => {
                setRevealed(true)
              }}
            >
              {t.reveal}
            </Button>
          )
        ) : null}
      </Card>
    </div>
  )
}
