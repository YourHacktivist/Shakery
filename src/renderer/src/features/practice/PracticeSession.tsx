import { Check, RotateCcw, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { isRightAnswer, type PracticeMode, type Question } from '@core/practice'
import { Button } from '@renderer/components/Button'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { useFinishPractice } from '@renderer/lib/queries'
import type { PracticeAnswerInput } from '@shared/domain/workshop'

const t = fr.workshop.practice

export type Session = {
  collectionId: string
  mode: PracticeMode
  questions: Question[]
}

type Answer = { question: Question; response: string | null; correct: boolean | null; selfGraded: boolean }

/**
 * A running session (section 10.11): one question at a time, then the score and the mistakes with
 * their answer. Every answer is written when the last question is answered.
 */
export function PracticeSession({
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
      <div className="flex max-w-[760px] animate-fade-in flex-col gap-7">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-semibold tracking-[0.1em] text-fg-muted uppercase">
            {t.result.title}
          </span>
          <span className="nums text-display font-light text-copper">
            {t.result.score(score, answers.length)}
          </span>
        </div>
        <section aria-labelledby="practice-mistakes-title" className="flex flex-col">
          <SectionTitle id="practice-mistakes-title" className="pb-1">
            {t.result.mistakes}
          </SectionTitle>
          {mistakes.length === 0 ? (
            <p className="m-0 pt-2 text-small text-status-ok">{t.result.none}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {mistakes.map((answer) => (
                <li key={answer.question.key} className="flex flex-col gap-0.5 border-b border-border py-2.5">
                  <span className="text-caption text-fg-muted">{answer.question.topic}</span>
                  <p className="m-0 text-small text-fg">{answer.question.prompt}</p>
                  <p className="m-0 text-small whitespace-pre-line text-accent-soft">
                    {answer.question.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
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
    <div className="flex max-w-[760px] flex-col gap-4">
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

      <section key={question.key} className="flex animate-rise flex-col gap-4 pt-3">
        <span className="text-caption font-semibold tracking-[0.1em] text-accent-soft uppercase">
          {question.topic}
        </span>
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
                    'flex min-h-12 animate-rise cursor-pointer items-center gap-2 rounded-nested border px-3.5 py-2.5 text-left text-body transition-[background-color,border-color,color,transform] duration-200 ease-out-soft disabled:cursor-default',
                    state === 'idle' &&
                      'border-border-strong bg-surface-1 text-fg hover:-translate-y-px hover:border-accent/50 hover:bg-surface-2',
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
      </section>
    </div>
  )
}
