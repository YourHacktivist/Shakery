import { CalendarClock, Check, FlaskRound, Milk, Plus, Trash2, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { bestBeforeFrom } from '@core/shelf-life'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { ExpiryPill } from '@renderer/components/ExpiryPill'
import { Input } from '@renderer/components/Input'
import { NumberWithUnit } from '@renderer/components/NumberWithUnit'
import { toast } from '@renderer/components/Toast'
import { errorMessage, notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { daysLeftFromNow, formatDate, formatNumber } from '@renderer/lib/format'
import { useCreateBatch, useDeleteBatch, usePreps, useSetBatchStatus } from '@renderer/lib/queries'
import type { Batch, PrepOverview } from '@shared/domain/workshop'

const t = fr.workshop.preps

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

/** Homemade preparations and their batches (section 10.9). */
export function PrepsPage() {
  const navigate = useNavigate()
  const preps = usePreps()
  const [making, setMaking] = useState<PrepOverview | null>(null)
  const list = preps.data ?? []

  const newPrep = (
    <Button
      variant="outline"
      icon={<Plus size={16} aria-hidden="true" />}
      onClick={() => void navigate('/recipes/new')}
    >
      {t.newPrep}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(list.length)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {newPrep}
      </header>

      {preps.isPending ? null : list.length === 0 ? (
        <EmptyState
          icon={<Milk size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={newPrep}
        />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0">
          {list.map((prep, index) => (
            <li
              key={prep.recipeId}
              className="animate-rise"
              style={{ '--rise-index': Math.min(index, 10) } as CSSProperties}
            >
              <PrepCard
                prep={prep}
                onMake={() => {
                  setMaking(prep)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <BatchDialog
        prep={making}
        onClose={() => {
          setMaking(null)
        }}
      />
    </div>
  )
}

function PrepCard({ prep, onMake }: { prep: PrepOverview; onMake: () => void }) {
  const active = prep.batches.filter((batch) => batch.status === 'active')
  const past = prep.batches.filter((batch) => batch.status !== 'active')
  return (
    <Card as="article" className="h-full gap-3 transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={`/recipes/${prep.recipeId}`}
            className="truncate text-lead font-semibold text-fg transition-colors duration-150 hover:text-accent-soft"
          >
            {prep.name}
          </Link>
          <span className="flex items-center gap-1.5 text-caption text-fg-muted">
            <CalendarClock size={12} strokeWidth={1.75} aria-hidden="true" />
            {t.shelfLife(prep.shelfLifeDays)}
            {prep.yieldMl === null ? null : <span>{` · ${t.yield(prep.yieldMl)}`}</span>}
          </span>
        </div>
        <Button size="sm" icon={<FlaskRound size={14} aria-hidden="true" />} onClick={onMake}>
          {t.newBatch}
        </Button>
      </div>
      {active.length === 0 ? (
        <p className="m-0 text-small text-fg-secondary">{t.noBatch}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {active.map((batch) => (
            <BatchRow key={batch.id} batch={batch} name={prep.name} />
          ))}
        </ul>
      )}
      {past.length > 0 ? (
        <details className="group/past">
          <summary className="cursor-pointer text-caption font-medium text-fg-muted transition-colors hover:text-fg-secondary">
            {t.batch.history}
          </summary>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
            {past.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between text-caption text-fg-muted">
                <span>{t.batch.madeOn(formatDate(batch.madeAt))}</span>
                <span>{t.batch.statuses[batch.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  )
}

function BatchRow({ batch, name }: { batch: Batch; name: string }) {
  const setStatus = useSetBatchStatus()
  const remove = useDeleteBatch()
  const recreate = useCreateBatch()
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
        'flex items-center gap-3 rounded-nested border px-3 py-2',
        expired ? 'border-status-danger/30 bg-status-danger/6' : 'border-border bg-surface-2',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="nums text-small text-fg">{t.batch.madeOn(formatDate(batch.madeAt))}</span>
        <span className="nums text-caption text-fg-muted">
          {[
            batch.quantityMl === null ? null : `${formatNumber(batch.quantityMl)} ml`,
            batch.bestBefore === null ? null : t.batch.bestBefore(formatDate(batch.bestBefore)),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <ExpiryPill days={days} />
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
      <span className="sr-only">{name}</span>
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
