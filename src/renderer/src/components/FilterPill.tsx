import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'

const t = fr.components.forms.filterPill

export type FilterOption<T extends string> = {
  value: T
  label: string
}

type FilterPillBaseProps<T extends string> = {
  /** Name of the filter, e.g. « Famille » or « Tri ». Read before the selection by screen readers. */
  label: string
  options: readonly FilterOption<T>[]
  disabled?: boolean
  align?: 'start' | 'end'
  /** `field` among buttons: their corners and their text, so that the row reads as one. */
  shape?: 'pill' | 'field'
  /** Before the selection, e.g. the colour of a status. */
  lead?: ReactNode
  className?: string
}

const SHAPES = {
  pill: 'rounded-full bg-surface-2 text-caption font-medium',
  field: 'rounded-field bg-surface-1 text-body font-semibold',
}

type SingleProps<T extends string> = {
  multiple?: false
  value: T
  onChange: (value: T) => void
}

type MultipleProps<T extends string> = {
  multiple: true
  /** An empty list means no filter: the pill then shows allLabel. */
  value: readonly T[]
  onChange: (value: T[]) => void
  /** Text of the pill and first item of the menu when nothing is selected, e.g. « Toutes familles ». */
  allLabel?: string
}

export type FilterPillProps<T extends string> = FilterPillBaseProps<T> & (SingleProps<T> | MultipleProps<T>)

/** Text shown in the pill for the current selection. */
function summarize<T extends string>(props: FilterPillProps<T>): string {
  const labelOf = (value: T) => props.options.find((option) => option.value === value)?.label ?? value
  if (!props.multiple) return labelOf(props.value)
  const [first, ...others] = props.value
  if (first === undefined) return props.allLabel ?? t.all
  return others.length === 0 ? labelOf(first) : t.more(labelOf(first), others.length)
}

const ITEM_CLASS =
  'flex min-h-9 cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-small text-fg-secondary outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-border-strong data-[highlighted]:text-fg'

function ItemCheck() {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-accent">
      <DropdownMenu.ItemIndicator>
        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
      </DropdownMenu.ItemIndicator>
    </span>
  )
}

/** Compact rounded filter with a chevron, opening a menu of single or multiple choice. */
export function FilterPill<T extends string>(props: FilterPillProps<T>) {
  const { label, options, disabled = false, align = 'start', shape = 'pill', lead, className } = props
  const summary = summarize(props)
  const active = props.multiple === true && props.value.length > 0

  return (
    // Not modal: a modal menu would lock the scroll with an injected <style> tag, refused by the CSP.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={t.name(label, summary)}
        className={cn(
          'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 border border-border-strong px-3 whitespace-nowrap transition-colors duration-150 ease-out-soft select-none hover:text-fg disabled:cursor-not-allowed disabled:opacity-55 data-[state=open]:text-fg',
          SHAPES[shape],
          active ? 'text-fg' : 'text-fg-secondary',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {lead}
          <span className="nums min-w-0 truncate">{summary}</span>
        </span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className="animate-pop-in z-50 max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-nested border border-border-strong bg-surface-2 p-1 shadow-pop"
        >
          {props.multiple ? (
            <MultipleItems {...props} />
          ) : (
            <DropdownMenu.RadioGroup
              value={props.value}
              onValueChange={(next) => {
                const option = options.find((candidate) => candidate.value === next)
                if (option) props.onChange(option.value)
              }}
            >
              {options.map((option) => (
                <DropdownMenu.RadioItem key={option.value} value={option.value} className={ITEM_CLASS}>
                  <ItemCheck />
                  {option.label}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MultipleItems<T extends string>({
  options,
  value,
  onChange,
  allLabel,
}: FilterPillBaseProps<T> & MultipleProps<T>) {
  return (
    <>
      <DropdownMenu.CheckboxItem
        checked={value.length === 0}
        className={ITEM_CLASS}
        onCheckedChange={() => {
          onChange([])
        }}
      >
        <ItemCheck />
        {allLabel ?? t.all}
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.Separator className="mx-2 my-1 h-px bg-border-strong" />
      {options.map((option) => {
        const checked = value.includes(option.value)
        return (
          <DropdownMenu.CheckboxItem
            key={option.value}
            checked={checked}
            className={ITEM_CLASS}
            // Several choices in a row: the menu stays open after each one.
            onSelect={(event) => {
              event.preventDefault()
            }}
            onCheckedChange={() => {
              // Keep the order of the options, whatever the order of the clicks.
              const next = options
                .map((candidate) => candidate.value)
                .filter((candidate) => (candidate === option.value ? !checked : value.includes(candidate)))
              onChange(next)
            }}
          >
            <ItemCheck />
            {option.label}
          </DropdownMenu.CheckboxItem>
        )
      })}
    </>
  )
}
