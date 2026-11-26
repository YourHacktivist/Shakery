import { CalendarClock, Check, FlaskRound, Plus, Tag, Trash2, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { bestBeforeFrom } from '@core/shelf-life'
import { Button, IconButton } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { ExpiryPill, expiryState, expiryText } from '@renderer/components/ExpiryPill'
import { Input } from '@renderer/components/Input'
import { NoValue } from '@renderer/components/NoValue'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { toast } from '@renderer/components/Toast'
import { LabelDialog } from '@renderer/features/preps/LabelDialog'
import { errorMessage, notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { daysLeftFromNow, formatDate, formatNumber } from '@renderer/lib/format'
import {
  useCreateBatch,
  useDeleteBatch,
  usePreps,
  useSetBatchStatus,
  useSetting,
} from '@renderer/lib/queries'
import type { Batch, PrepOverview } from '@shared/domain/workshop'

const t = fr.workshop.preps

/** Same columns for the header and for every row of the list. */
const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_150px_150px_170px_auto] items-start gap-x-6'

/** « 2026-11-18 » of a timestamp, in local time, for a date field. */
function dateValue(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The chosen day at the current hour: today stays « now », another day keeps its date. */
function fromDateValue(value: string, now: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const clock = new Date(now)
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    clock.getHours(),
    clock.getMinutes(),
  )
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

/** « Citron vert, sucre »: the names after the first one start in lower case. */
function listed(names: readonly string[]): string[] {
  return names.map((name, index) =>
    index === 0 ? name : `${name.charAt(0).toLocaleLowerCase('fr')}${name.slice(1)}`,
  )
}

/**
 * Homemade preparations and their batches (section 10.9, D-057): a list of ruled rows, the
 * preparations with a batch in use first.
 */
export function PrepsPage() {
  const navigate = useNavigate()
  const preps = usePreps()
  const [making, setMaking] = useState<PrepOverview | null>(null)
  const [labelling, setLabelling] = useState<Batch | null>(null)
  const list = preps.data ?? []
  const inUse = (prep: PrepOverview) => prep.batches.some((batch) => batch.status === 'active')
  const running = list.filter(inUse)
  const idle = list.filter((prep) => !inUse(prep))
  const activeBatches = list.reduce(
    (total, prep) => total + prep.batches.filter((batch) => batch.status === 'active').length,
    0,
  )

  const newPrep = (
    <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => void navigate('/recipes/new')}>
      {t.newPrep}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-page flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.summary(list.length, activeBatches)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
          <p className="m-0 mt-2 max-w-[700px] text-body text-fg-secondary">{t.description}</p>
        </div>
        {list.length > 0 ? newPrep : null}
      </header>

      {preps.isPending ? null : list.length === 0 ? (
        <EmptyState
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={newPrep}
        />
      ) : (
        <section aria-label={t.listLabel} className="flex flex-col gap-6">
          <div aria-hidden="true" className={cn(COLUMNS, 'text-caption text-fg-muted')}>
            <span>{t.columns.prep}</span>
            <span>{t.columns.shelfLife}</span>
            <span>{t.columns.lastBatch}</span>
            <span>{t.columns.useBy}</span>
            <span className="w-[148px]" />
          </div>
          {running.length > 0 ? (
            <PrepGroup
              id="preps-active"
              title={t.groups.active}
              preps={running}
              onMake={setMaking}
              onLabel={setLabelling}
            />
          ) : null}
          {idle.length > 0 ? (
            <PrepGroup
              id="preps-idle"
              title={t.groups.idle}
              preps={idle}
              onMake={setMaking}
              onLabel={setLabelling}
            />
          ) : null}
        </section>
      )}

      <LabelDialog
        batch={labelling}
        onClose={() => {
          setLabelling(null)
        }}
      />
      <BatchDialog
        prep={making}
        onClose={() => {
          setMaking(null)
        }}
      />
    </div>
  )
}

function PrepGroup({
  id,
  title,
  preps,
  onMake,
  onLabel,
}: {
  id: string
  title: string
  preps: readonly PrepOverview[]
  onMake: (prep: PrepOverview) => void
  onLabel: (batch: Batch) => void
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <SectionTitle id={id} tone="muted" className="pb-1">
        {title}
      </SectionTitle>
      <ul className="m-0 list-none p-0">
        {preps.map((prep, index) => (
          <PrepRow
            key={prep.recipeId}
            prep={prep}
            index={index}
            onMake={() => {
              onMake(prep)
            }}
            onLabel={onLabel}
          />
        ))}
      </ul>
    </section>
  )
}

function PrepRow({
  prep,
  index,
  onMake,
  onLabel,
}: {
  prep: PrepOverview
  index: number
  onMake: () => void
  onLabel: (batch: Batch) => void
}) {
  const warningDays = useSetting('preps.warningDays')
  const active = prep.batches.filter((batch) => batch.status === 'active')
  const past = prep.batches.filter((batch) => batch.status !== 'active')
  const last = prep.batches.reduce<Batch | null>(
    (latest, batch) => (latest === null || batch.madeAt > latest.madeAt ? batch : latest),
    null,
  )
  // Batches in use come soonest best-before first: the first one is the next to use.
  const next = active[0] ?? null
  const days = next ? daysLeftFromNow(next.bestBefore) : null
  const state = expiryState(days, warningDays)
  const composition = listed(prep.composition)
  return (
    <li
      className="animate-rise border-b border-border py-2.5"
      style={{ '--rise-index': Math.min(index, 8) } as CSSProperties}
    >
      <div className={COLUMNS}>
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/recipes/${prep.recipeId}`}
            className="w-fit max-w-full truncate rounded-sm text-body leading-5 font-medium text-fg transition-colors duration-150 hover:text-accent-soft"
          >
            {prep.name}
          </Link>
          {composition.length > 0 ? (
            <span className="truncate text-caption leading-4 text-fg-muted">
              {t.composition(composition)}
            </span>
          ) : null}
        </div>
        <span className="text-body leading-5 text-fg-secondary">
          {prep.shelfLifeDays === null ? <NoValue /> : t.keeps(prep.shelfLifeDays)}
        </span>
        <div className="nums flex flex-col text-body leading-5 text-fg-secondary">
          <span className={cn(last?.status === 'active' && 'font-medium text-fg')}>
            {last === null
              ? t.lastBatch.none
              : last.status === 'active'
                ? t.lastBatch.active(formatDate(last.madeAt))
                : t.lastBatch.past(formatDate(last.madeAt))}
          </span>
          {last?.status === 'active' && last.quantityMl !== null ? (
            <span className="text-caption leading-4 text-fg-muted">{`${formatNumber(last.quantityMl)} ml`}</span>
          ) : null}
        </div>
        <div className="nums flex flex-col text-body leading-5 text-fg-secondary">
          {next?.bestBefore ? (
            <>
              <span className="font-medium text-fg">{formatDate(next.bestBefore)}</span>
              <span
                className={cn(
                  'text-caption leading-4',
                  state === 'expired'
                    ? 'font-semibold text-status-danger'
                    : state === 'expiring'
                      ? 'font-semibold text-accent-soft'
                      : 'text-fg-muted',
                )}
              >
                {expiryText(days, warningDays)}
              </span>
            </>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-mt-1 justify-self-end text-fg-muted"
          aria-label={t.makeOf(prep.name)}
          icon={<FlaskRound size={14} aria-hidden="true" />}
          onClick={onMake}
        >
          {t.newBatch}
        </Button>
      </div>
      {active.length > 0 ? (
        <ul aria-label={t.batchesOf(prep.name)} className="m-0 mt-1.5 flex list-none flex-col p-0">
          {active.map((batch) => (
            <BatchRow key={batch.id} batch={batch} onLabel={onLabel} />
          ))}
        </ul>
      ) : null}
      {past.length > 0 ? (
        <details className="mt-1">
          <summary className="w-fit cursor-pointer rounded-sm text-caption font-medium text-fg-muted transition-colors hover:text-fg-secondary">
            {t.batch.history}
          </summary>
          <ul className="m-0 mt-2 flex max-w-[420px] list-none flex-col gap-1 p-0">
            {past.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between text-caption text-fg-muted">
                <span>{t.batch.madeOn(formatDate(batch.madeAt))}</span>
                <span>{t.batch.statuses[batch.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  )
}

function BatchRow({ batch, onLabel }: { batch: Batch; onLabel: (batch: Batch) => void }) {
  const setStatus = useSetBatchStatus()
  const remove = useDeleteBatch()
  const recreate = useCreateBatch()
  const warningDays = useSetting('preps.warningDays')
  const days = daysLeftFromNow(batch.bestBefore)
  const expired = days !== null && days < 0

  function close(status: 'finished' | 'discarded') {
    setStatus.mutate(
      { id: batch.id, status },
      {
        onSuccess: () => {
          toast.undo(status === 'finished' ? t.batch.finished : t.batch.discarded, () => {
            setStatus.mutate({ id: batch.id, status: 'active' }, { onError: notifyError })
          })
        },
        onError: notifyError,
      },
    )
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-nested px-2 py-1',
        expired && 'bg-status-danger/6',
      )}
    >
      <span className="nums min-w-0 flex-1 truncate text-small text-fg-secondary">
        {[
          t.batch.madeOn(formatDate(batch.madeAt)),
          batch.quantityMl === null ? null : `${formatNumber(batch.quantityMl)} ml`,
          batch.bestBefore === null ? null : t.batch.bestBefore(formatDate(batch.bestBefore)),
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      <ExpiryPill days={days} warningDays={warningDays} />
      <div className="flex items-center">
        <IconButton
          variant="ghost"
          size="sm"
          label={t.label.action}
          icon={<Tag size={14} aria-hidden="true" />}
          onClick={() => {
            onLabel(batch)
          }}
        />
        <IconButton
          variant="ghost"
          size="sm"
          label={t.batch.finish}
          icon={<Check size={14} aria-hidden="true" />}
          onClick={() => {
            close('finished')
          }}
        />
        <IconButton
          variant="ghost"
          size="sm"
          label={t.batch.discard}
          icon={<X size={14} aria-hidden="true" />}
          onClick={() => {
            close('discarded')
          }}
        />
        <IconButton
          variant="ghost"
          size="sm"
          label={t.batch.delete}
          icon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => {
            remove.mutate(
              { id: batch.id },
              {
                onSuccess: () => {
                  toast.undo(t.batch.deleted, () => {
                    recreate.mutate(
                      {
                        recipeId: batch.recipeId,
                        madeAt: batch.madeAt,
                        quantityMl: batch.quantityMl,
                        notes: batch.notes,
                      },
                      { onError: notifyError },
                    )
                  })
                },
                onError: notifyError,
              },
            )
          }}
        />
      </div>
    </li>
  )
}

/** « Nouvelle fabrication »: today and the yield are filled in, the best-before date shown. */
function BatchDialog({ prep, onClose }: { prep: PrepOverview | null; onClose: () => void }) {
  return (
    <Dialog
      open={prep !== null}
      onClose={onClose}
      title={prep ? t.batch.title(prep.name) : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.batch.cancel}
          </Button>
          <Button type="submit" form="batch-form">
            {t.batch.create}
          </Button>
        </>
      }
    >
      {prep ? <BatchForm prep={prep} onClose={onClose} /> : null}
    </Dialog>
  )
}

function BatchForm({ prep, onClose }: { prep: PrepOverview; onClose: () => void }) {
  const create = useCreateBatch()
  const [opened] = useState(() => Date.now())
  const [day, setDay] = useState(() => dateValue(opened))
  const [quantity, setQuantity] = useState<number | null>(prep.yieldMl)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const madeAt = fromDateValue(day, opened)
  const bestBefore =
    madeAt === null || prep.shelfLifeDays === null ? null : bestBeforeFrom(madeAt, prep.shelfLifeDays)

  return (
    <form
      id="batch-form"
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (madeAt === null) return
        create.mutate(
          { recipeId: prep.recipeId, madeAt, quantityMl: quantity, notes },
          {
            onSuccess: () => {
              toast.show({ message: t.batch.created(prep.name) })
              onClose()
            },
            onError: (failure) => {
              setError(errorMessage(failure))
            },
          },
        )
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          label={t.batch.madeAt}
          value={day}
          max={dateValue(opened)}
          data-autofocus=""
          onChange={(event) => {
            setDay(event.target.value)
          }}
        />
        <NumberWithUnit
          label={t.batch.quantity}
          value={quantity}
          onChange={setQuantity}
          unit="ml"
          min={1}
          max={100_000}
          step={50}
        />
      </div>
      <p
        className={cn(
          'm-0 flex items-center gap-2 rounded-nested border px-3 py-2 text-small',
          bestBefore === null ? 'border-border text-fg-muted' : 'border-accent/25 bg-accent/8 text-fg',
        )}
      >
        <CalendarClock size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-accent" />
        {bestBefore === null ? t.batch.noBestBefore : t.batch.bestBefore(formatDate(bestBefore))}
      </p>
      <Input
        label={t.batch.notes}
        value={notes}
        maxLength={1000}
        autoComplete="off"
        onChange={(event) => {
          setNotes(event.target.value)
        }}
      />
      {error ? (
        <p role="alert" className="m-0 text-small font-medium text-status-danger">
          {error}
        </p>
      ) : null}
    </form>
  )
}
