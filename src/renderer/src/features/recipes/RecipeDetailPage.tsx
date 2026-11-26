import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CopyPlus,
  Ellipsis,
  FlaskConical,
  Layers,
  NotebookPen,
  Pencil,
  Printer,
  Share2,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { Button, IconButton } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { FilterPill } from '@renderer/components/FilterPill'
import { Input } from '@renderer/components/Input'
import { Kbd } from '@renderer/components/Kbd'
import { NoValue } from '@renderer/components/NoValue'
import { InlineText, RichText } from '@renderer/components/RichText'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { Sparkline } from '@renderer/components/Sparkline'
import { StatusDot } from '@renderer/components/StatusBadge'
import { toast } from '@renderer/components/Toast'
import { ComputedPanel } from '@renderer/features/recipes/ComputedPanel'
import { detailToInput, formatDose } from '@renderer/features/recipes/model'
import { RecipePhoto } from '@renderer/features/recipes/RecipePhoto'
import { RecipeTastingNote } from '@renderer/features/recipes/RecipeTastingNote'
import { ShareRecipeDialog } from '@renderer/features/recipes/ShareRecipeDialog'
import { categoryPath } from '@renderer/features/shared/categories'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate, formatNumber } from '@renderer/lib/format'
import {
  recordView,
  restoreRecipe,
  useAddToCollection,
  useCategories,
  useCollections,
  useCreateVariant,
  useDeleteRecipe,
  useDisplayUnit,
  useGlasses,
  useIceTypes,
  useIngredients,
  useProducts,
  useRecipe,
  useRecipes,
  useSetRecipeFavorite,
  useSetRecipeStatus,
  useTastings,
} from '@renderer/lib/queries'
import { shortcutText } from '@renderer/lib/shortcuts'
import { TYPICAL_STEPS_CREDIT } from '@shared/classics'
import { STATUS_VALUES, type RecipeDetail } from '@shared/domain/catalog'
import type { TastingNote } from '@shared/domain/journal'

const t = fr.recipes
const td = t.detail
const display = fr.components.display
const withUnit = display.withUnit

const statusOptions = STATUS_VALUES.map((value) => ({ value, label: display.status[value] }))

/** Detail of a recipe (section 10.4): what it is, how to make it, what it computes to, its versions. */
export function RecipeDetailPage() {
  const { id = '' } = useParams()
  const recipe = useRecipe(id)
  const loaded = recipe.data?.id
  // Opened recipes rank higher in the search (section 12.1).
  useEffect(() => {
    if (loaded) recordView('recipe', loaded)
  }, [loaded])

  if (recipe.isPending) {
    return (
      <p className="m-0 text-body text-fg-muted" aria-busy="true">
        {td.loading}
      </p>
    )
  }
  if (recipe.isError) {
    return (
      <EmptyState
        title={td.notFound}
        className="mx-auto min-h-[320px] max-w-page p-8"
        action={
          <Link to="/recipes" className="text-body font-semibold text-accent-soft hover:text-accent">
            {td.backToList}
          </Link>
        }
      />
    )
  }
  return <RecipeDetailView recipe={recipe.data} />
}

/**
 * The page reads as the preparation mode (D-057): an editorial header, four actions in sight and
 * the others in « Plus », the recipe without card on the left, a calmer column on the right.
 */
function RecipeDetailView({ recipe }: { recipe: RecipeDetail }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ingredients = useIngredients()
  const glasses = useGlasses()
  const iceTypes = useIceTypes()
  const categories = useCategories()
  const recipes = useRecipes()
  const setStatus = useSetRecipeStatus()
  const setFavorite = useSetRecipeFavorite()
  const deleteRecipe = useDeleteRecipe()
  const [variantOpen, setVariantOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const displayUnit = useDisplayUnit()
  const openPrint = useOverlayStore((state) => state.open)
  const openTasting = useOverlayStore((state) => state.openTasting)
  const tastings = useTastings({ recipeId: recipe.id })
  const notes = useMemo(() => tastings.data ?? [], [tastings.data])
  const ids = {
    lines: useId(),
    steps: useId(),
    garnish: useId(),
    notes: useId(),
    service: useId(),
    prep: useId(),
    history: useId(),
    tastings: useId(),
  }

  const names = useMemo(
    () => new Map((ingredients.data ?? []).map((ingredient) => [ingredient.id, ingredient.name])),
    [ingredients.data],
  )
  const computationInput = useMemo(() => detailToInput(recipe), [recipe])
  const parent =
    recipe.parentRecipeId === null
      ? undefined
      : recipes.data?.find((candidate) => candidate.id === recipe.parentRecipeId)
  const glass = glasses.data?.find((candidate) => candidate.id === recipe.glassId)
  const ice = iceTypes.data?.find((candidate) => candidate.id === recipe.iceId)
  const credit = recipe.credit && recipe.credit !== TYPICAL_STEPS_CREDIT ? recipe.credit : null

  const context = [
    recipe.kind === 'prep' ? t.kinds.prep : null,
    recipe.family ? t.families[recipe.family] : null,
    t.origins[recipe.origin],
  ].filter((part): part is string => part !== null)

  function remove() {
    deleteRecipe.mutate(
      { id: recipe.id },
      {
        onSuccess: () => {
          void navigate('/recipes')
          toast.undo(td.deleted(recipe.name), () => {
            restoreRecipe(queryClient, recipe.id).then((restored) => {
              toast.show({ message: td.restored(restored.name) })
            }, notifyError)
          })
        },
        onError: notifyError,
      },
    )
  }

  return (
    <div className="@container mx-auto flex w-full max-w-page flex-col">
      <Link
        to="/recipes"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-small font-medium text-fg-secondary hover:text-fg"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {td.back}
      </Link>

      <header className="flex flex-col border-b border-border pt-3.5 pb-5">
        <p className="m-0 mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-accent-soft uppercase">
          {context.join(' · ')}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="m-0 min-w-0 text-title leading-tight font-semibold tracking-[-0.02em] break-words text-fg">
            {recipe.name}
          </h1>
          <div data-row="state" className="flex shrink-0 items-center gap-2">
            <FilterPill
              label={td.status}
              shape="field"
              align="end"
              lead={<StatusDot status={recipe.status} />}
              options={statusOptions}
              value={recipe.status}
              onChange={(status) => {
                setStatus.mutate(
                  { id: recipe.id, status },
                  {
                    onSuccess: () => {
                      toast.show({ message: td.statusChanged(display.status[status]) })
                    },
                    onError: notifyError,
                  },
                )
              }}
            />
            <IconButton
              label={recipe.isFavorite ? td.favoriteRemove : td.favoriteAdd}
              aria-pressed={recipe.isFavorite}
              icon={
                <Star
                  size={16}
                  aria-hidden="true"
                  className={cn(recipe.isFavorite ? 'fill-accent text-accent' : 'text-fg-secondary')}
                />
              }
              onClick={() => {
                setFavorite.mutate(
                  { id: recipe.id, favorite: !recipe.isFavorite },
                  {
                    onSuccess: (summary) => {
                      toast.show({ message: summary.isFavorite ? td.favoriteAdded : td.favoriteRemoved })
                    },
                    onError: notifyError,
                  },
                )
              }}
            />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-small text-fg-secondary">
          <strong className="nums font-semibold text-fg">
            <span aria-hidden="true">{display.version(recipe.version)}</span>
            <span className="sr-only">{display.versionLong(recipe.version)}</span>
          </strong>
          {parent ? (
            <>
              <MetaRule />
              <span>
                {`${td.variantOf} `}
                <Link
                  to={`/recipes/${parent.id}`}
                  className="font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
                >
                  {parent.name}
                </Link>
              </span>
            </>
          ) : null}
          {credit ? (
            <>
              <MetaRule />
              <span>{td.credit(credit)}</span>
            </>
          ) : null}
        </div>

        {/* Four actions in sight, Modifier the only solid one; the others wait in « Plus » (D-057). */}
        <div data-row="actions" className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            icon={<Pencil size={16} aria-hidden="true" />}
            onClick={() => void navigate(`/recipes/${recipe.id}/edit`)}
          >
            {td.edit}
          </Button>
          <Button
            variant="outline"
            icon={<FlaskConical size={16} aria-hidden="true" />}
            aria-keyshortcuts="Control+E"
            onClick={() => void navigate(`/lab/${recipe.id}`)}
          >
            {td.lab}
          </Button>
          <Button
            variant="outline"
            icon={<ChefHat size={16} aria-hidden="true" />}
            aria-keyshortcuts="F11"
            onClick={() => void navigate(`/prepare/${recipe.id}`)}
          >
            {t.prepare.open}
          </Button>
          <Button
            variant="outline"
            icon={<NotebookPen size={16} aria-hidden="true" />}
            aria-keyshortcuts="Control+J"
            onClick={() => {
              openTasting(recipe.id, recipe.version)
            }}
          >
            {td.taste}
          </Button>
          <RecipeActionsMenu
            recipe={recipe}
            deleting={deleteRecipe.isPending}
            onVariant={() => {
              setVariantOpen(true)
            }}
            onPrint={() => {
              openPrint('print')
            }}
            onShare={() => {
              setShareOpen(true)
            }}
            onDelete={remove}
          />
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8 pt-[22px] @min-[56rem]:grid-cols-[minmax(0,1fr)_340px] @min-[56rem]:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby={ids.lines} className="flex flex-col gap-1">
            <SectionTitle id={ids.lines}>{td.sections.lines}</SectionTitle>
            <Lines recipe={recipe} names={names} />
          </section>

          <section aria-labelledby={ids.steps} className="flex flex-col gap-1">
            <SectionTitle id={ids.steps}>{td.sections.steps}</SectionTitle>
            {recipe.steps.length === 0 ? (
              <p className="m-0 mt-2 text-body text-fg-muted">{td.noSteps}</p>
            ) : (
              <ol className="m-0 list-none p-0">
                {recipe.steps.map((step, index) => (
                  <li
                    key={`${String(index)}-${step}`}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-baseline gap-3.5 border-b border-border py-2.5 text-lead leading-[1.6] text-fg last:border-b-0"
                  >
                    <span aria-hidden="true" className="nums text-right font-semibold text-accent-soft">
                      {index + 1}
                    </span>
                    <span className="min-w-0 whitespace-pre-wrap">
                      <InlineText text={step} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {recipe.steps.length > 0 && recipe.credit === TYPICAL_STEPS_CREDIT ? (
              <p className="m-0 text-caption text-fg-muted">{td.typicalStepsNote}</p>
            ) : null}
          </section>

          {recipe.garnish ? (
            <section aria-labelledby={ids.garnish} className="flex flex-col gap-1">
              <SectionTitle id={ids.garnish}>{td.sections.garnish}</SectionTitle>
              <RichText text={recipe.garnish} className="mt-2 text-lead leading-[1.6] text-fg" />
            </section>
          ) : null}

          <section aria-labelledby={ids.service} className="flex flex-col gap-1">
            <SectionTitle id={ids.service}>{td.sections.service}</SectionTitle>
            <Facts>
              <Fact label={td.fields.method} value={recipe.method ? t.methods[recipe.method] : null} />
              <Fact label={td.fields.glass} value={glass?.name} />
              <Fact label={td.fields.ice} value={ice?.name} />
              <Fact label={td.fields.family} value={recipe.family ? t.families[recipe.family] : null} />
              <Fact
                label={td.fields.length}
                value={recipe.drinkLength ? t.lengths[recipe.drinkLength] : null}
              />
              <Fact
                label={td.fields.moment}
                value={recipe.servingMoment ? t.moments[recipe.servingMoment] : null}
              />
              {/* Shown when they are given: the origin already heads the page. */}
              {recipe.profile ? <Fact label={td.fields.profile} value={recipe.profile} /> : null}
              {recipe.dilutionOverridePct === null ? null : (
                <Fact
                  label={td.fields.dilution}
                  value={withUnit(formatNumber(recipe.dilutionOverridePct), t.panel.units.pct)}
                />
              )}
              {recipe.tags.length > 0 ? <Fact label={td.fields.tags} value={recipe.tags.join(', ')} /> : null}
            </Facts>
          </section>

          {recipe.kind === 'prep' ? (
            <section aria-labelledby={ids.prep} className="flex flex-col gap-1">
              <SectionTitle id={ids.prep}>{td.sections.prep}</SectionTitle>
              <Facts>
                <Fact
                  label={td.fields.yield}
                  value={
                    recipe.yieldMl === null ? null : withUnit(formatNumber(recipe.yieldMl), t.panel.units.ml)
                  }
                />
                <Fact
                  label={td.fields.shelfLife}
                  value={
                    recipe.shelfLifeDays === null ? td.shelfLifeUnset : td.shelfLifeDays(recipe.shelfLifeDays)
                  }
                />
                <Fact
                  label={td.fields.category}
                  value={recipe.prepCategoryId ? categoryPath(categories.data, recipe.prepCategoryId) : null}
                />
              </Facts>
              {recipe.storageNotes ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  <span className={FACT_LABEL}>{td.fields.storage}</span>
                  <RichText text={recipe.storageNotes} className="text-body leading-relaxed text-fg" />
                </div>
              ) : null}
            </section>
          ) : null}

          {recipe.notes ? (
            <section aria-labelledby={ids.notes} className="flex flex-col gap-1">
              <SectionTitle id={ids.notes}>{td.sections.notes}</SectionTitle>
              <RichText text={recipe.notes} className="mt-2 text-body leading-relaxed text-fg-secondary" />
            </section>
          ) : null}
        </div>

        <aside
          aria-label={td.sections.side}
          className="flex min-w-0 flex-col gap-5 border-l border-border pl-8"
        >
          <ComputedPanel
            variant="side"
            data={recipe.lines.length > 0 ? computationInput : null}
            names={names}
          />
          <section aria-labelledby={ids.history} className="flex flex-col">
            <SectionTitle id={ids.history} tone="muted">
              {td.sections.history}
            </SectionTitle>
            <VersionRatings recipe={recipe} tastings={notes} />
            <ol className="m-0 list-none p-0">
              {recipe.history.map((entry) => (
                <li
                  key={entry.version}
                  className="flex min-w-0 items-baseline gap-2 border-b border-border py-2 text-small text-fg-secondary last:border-b-0"
                >
                  <b className="nums shrink-0 font-semibold text-fg">
                    <span aria-hidden="true">{display.version(entry.version)}</span>
                    <span className="sr-only">{display.versionLong(entry.version)}</span>
                  </b>
                  <span className="nums shrink-0">{formatDate(entry.createdAt)}</span>
                  {entry.label ? <span className="min-w-0 truncate">{entry.label}</span> : null}
                  {entry.version === recipe.version ? (
                    <span className="shrink-0 text-fg-muted">{td.current}</span>
                  ) : null}
                  <VersionAverage notes={notes.filter((note) => note.recipeVersion === entry.version)} />
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby={ids.tastings} className="flex flex-col gap-1">
            <SectionTitle id={ids.tastings} tone="muted">
              {td.sections.tastings}
            </SectionTitle>
            {notes.length === 0 ? (
              <p className="m-0 mt-1 text-small text-fg-muted">{td.neverTasted}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col divide-y divide-border p-0">
                {[...notes]
                  .sort((a, b) => b.tastedAt - a.tastedAt)
                  .slice(0, 3)
                  .map((note) => (
                    <li key={note.id} className="py-2 first:pt-0 last:pb-0">
                      <RecipeTastingNote note={note} />
                    </li>
                  ))}
              </ol>
            )}
          </section>
          <RecipePhoto id={recipe.id} name={recipe.name} />
        </aside>
      </div>

      <VariantDialog
        open={variantOpen}
        recipe={recipe}
        onClose={() => {
          setVariantOpen(false)
        }}
      />
      <ShareRecipeDialog
        open={shareOpen}
        onClose={() => {
          setShareOpen(false)
        }}
        recipe={recipe}
        context={{
          ingredientName: (id) => names.get(id) ?? id,
          glass: glass?.name ?? null,
          ice: ice?.name ?? null,
          display: displayUnit,
        }}
      />
    </div>
  )
}

/** Thin upright rule between two facts of the line under the title. */
function MetaRule() {
  return <span aria-hidden="true" className="h-3 w-px shrink-0 bg-border-strong" />
}

const MENU_ITEM =
  'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-body text-fg outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent/14 data-[state=open]:bg-accent/14 [&>svg]:shrink-0'

/**
 * « Plus »: the actions used less often, the deletion last, under a hairline and in red, so that
 * nothing destructive sits one click away (D-057).
 */
function RecipeActionsMenu({
  recipe,
  deleting,
  onVariant,
  onPrint,
  onShare,
  onDelete,
}: {
  recipe: RecipeDetail
  deleting: boolean
  onVariant: () => void
  onPrint: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const collections = useCollections()
  const add = useAddToCollection()
  const tc = fr.workshop.collections
  const list = collections.data ?? []
  // A dialog opened from the menu keeps the focus: the menu does not give it back to « Plus ».
  const keepFocus = useRef(false)
  const open = (action: () => void) => () => {
    keepFocus.current = true
    action()
  }

  return (
    // Not modal, as FilterPill: a modal menu injects a style that the CSP refuses.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          icon={<Ellipsis size={16} aria-hidden="true" />}
          className="data-[state=open]:bg-surface-2 data-[state=open]:text-fg"
        >
          {td.more}
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 min-w-[240px] animate-pop-in rounded-nested border border-border-strong bg-surface-2 p-1 shadow-float"
          onCloseAutoFocus={(event) => {
            if (keepFocus.current) event.preventDefault()
            keepFocus.current = false
          }}
        >
          <DropdownMenu.Item className={MENU_ITEM} onSelect={open(onVariant)}>
            <CopyPlus size={16} aria-hidden="true" className="text-fg-secondary" />
            <span className="truncate">{td.variant}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={MENU_ITEM}>
              <Layers size={16} aria-hidden="true" className="text-fg-secondary" />
              <span className="truncate">{tc.addToCollection}</span>
              <ChevronRight size={14} aria-hidden="true" className="ml-auto text-fg-muted" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                collisionPadding={8}
                className="z-50 max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-[240px] animate-pop-in overflow-y-auto rounded-nested border border-border-strong bg-surface-2 p-1 shadow-float"
              >
                {list.length === 0 ? (
                  <p className="m-0 max-w-[260px] px-2.5 py-2 text-small text-fg-secondary">
                    {tc.noCollection}
                  </p>
                ) : (
                  list.map((collection) => {
                    const inside = collection.recipeIds.includes(recipe.id)
                    return (
                      <DropdownMenu.Item
                        key={collection.id}
                        disabled={inside}
                        className={cn(
                          MENU_ITEM,
                          'data-[disabled]:cursor-default data-[disabled]:opacity-100 data-[disabled]:text-fg-muted',
                        )}
                        onSelect={() => {
                          add.mutate(
                            { id: collection.id, recipeIds: [recipe.id] },
                            {
                              onSuccess: () => {
                                toast.show({ message: tc.addedTo(recipe.name, collection.name) })
                              },
                              onError: notifyError,
                            },
                          )
                        }}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center text-accent">
                          {inside ? <Check size={14} aria-hidden="true" /> : null}
                        </span>
                        <span className="truncate">{collection.name}</span>
                        <span className="ml-auto text-caption text-fg-muted">
                          {tc.kinds[collection.kind]}
                        </span>
                      </DropdownMenu.Item>
                    )
                  })
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item className={MENU_ITEM} aria-keyshortcuts="Control+P" onSelect={open(onPrint)}>
            <Printer size={16} aria-hidden="true" className="text-fg-secondary" />
            <span className="truncate">{t.sheet.open}</span>
            <Kbd className="ml-auto">{shortcutText('print')}</Kbd>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={MENU_ITEM} onSelect={open(onShare)}>
            <Share2 size={16} aria-hidden="true" className="text-fg-secondary" />
            <span className="truncate">{t.share.open}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={cn(MENU_ITEM, 'text-status-danger data-[highlighted]:bg-status-danger/10')}
            disabled={deleting}
            onSelect={onDelete}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span className="truncate">{td.delete}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** The doses in copper and tabular figures in a column of their own, as in the preparation mode. */
function Lines({ recipe, names }: { recipe: RecipeDetail; names: ReadonlyMap<string, string> }) {
  const display = useDisplayUnit()
  if (recipe.lines.length === 0) return <p className="m-0 mt-2 text-body text-fg-muted">{td.noLines}</p>
  return (
    <ul className="m-0 grid list-none grid-cols-[fit-content(14rem)_minmax(0,1fr)] p-0">
      {recipe.lines.map((line) => {
        const undefinedDose = line.quantity === null && line.unit !== 'top' && line.unit !== 'to_taste'
        return (
          <li
            key={line.id}
            className="col-span-2 grid grid-cols-subgrid items-baseline gap-x-3 border-b border-border py-2.5 last:border-b-0"
          >
            <span
              className={cn(
                'nums min-w-[4.75rem] text-heading',
                undefinedDose ? 'font-normal text-fg-muted italic' : 'font-semibold text-accent-soft',
              )}
            >
              {formatDose(line, display)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2 text-heading text-fg">
                {names.get(line.ingredientId) ?? line.ingredientId}
                {line.isOptional ? <LineTag>{td.optional}</LineTag> : null}
                {line.isGarnish ? <LineTag>{td.garnishLine}</LineTag> : null}
              </span>
              {line.preferredProductId ? (
                <PreferredBottle ingredientId={line.ingredientId} productId={line.preferredProductId} />
              ) : null}
              {line.note ? <span className="text-small text-fg-muted">{line.note}</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PreferredBottle({ ingredientId, productId }: { ingredientId: string; productId: string }) {
  const products = useProducts(ingredientId)
  const product = products.data?.find((candidate) => candidate.id === productId)
  if (!product) return null
  const name = product.brand ? `${product.brand} ${product.name}` : product.name
  return <span className="text-small text-fg-secondary">{td.bottle(name)}</span>
}

function LineTag({ children }: { children: ReactNode }) {
  return <span className="text-caption text-fg-muted">{children}</span>
}

const FACT_LABEL = 'text-[10.5px] font-semibold tracking-[0.09em] text-fg-muted uppercase'

/**
 * Facts on one line, cut by upright hairlines, wrapping onto a second line when the column is
 * narrow. The list is pulled left by its first rule and padding, which the frame then hides.
 */
function Facts({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 overflow-hidden">
      <dl className="m-0 -ml-[17px] grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-y-4">
        {children}
      </dl>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-l border-border pr-2 pl-4">
      <dt className={FACT_LABEL}>{label}</dt>
      <dd className="m-0 flex min-h-[22px] min-w-0 items-center text-lead break-words text-fg">
        {value ?? <NoValue />}
      </dd>
    </div>
  )
}

function VariantDialog({
  open,
  recipe,
  onClose,
}: {
  open: boolean
  recipe: RecipeDetail
  onClose: () => void
}) {
  const tv = td.variantDialog
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tv.title}
      description={tv.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tv.cancel}
          </Button>
          <Button type="submit" form="variant-form">
            {tv.confirm}
          </Button>
        </>
      }
    >
      <VariantForm recipe={recipe} onClose={onClose} />
    </Dialog>
  )
}

function VariantForm({ recipe, onClose }: { recipe: RecipeDetail; onClose: () => void }) {
  const tv = td.variantDialog
  const navigate = useNavigate()
  const createVariant = useCreateVariant()
  const [name, setName] = useState(tv.defaultName(recipe.name))
  const empty = name.trim() === ''
  return (
    <form
      id="variant-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (empty || createVariant.isPending) return
        createVariant.mutate(
          { id: recipe.id, name: name.trim() },
          {
            onSuccess: (variant) => {
              onClose()
              toast.show({ message: tv.created(variant.name) })
              void navigate(`/recipes/${variant.id}`)
            },
            onError: notifyError,
          },
        )
      }}
    >
      <Input
        label={tv.name}
        value={name}
        maxLength={120}
        data-autofocus=""
        error={empty ? t.form.required : undefined}
        onChange={(event) => {
          setName(event.target.value)
        }}
      />
    </form>
  )
}

/** Mean of the overall ratings, or null when none of the notes has one. */
function meanOverall(notes: readonly TastingNote[]): number | null {
  const rated = notes.map((note) => note.overall).filter((value): value is number => value !== null)
  return rated.length === 0 ? null : rated.reduce((sum, value) => sum + value, 0) / rated.length
}

/** Mean rating of one version and its number of notes, at the end of its row. */
function VersionAverage({ notes }: { notes: readonly TastingNote[] }) {
  const mean = meanOverall(notes)
  if (notes.length === 0) return null
  return (
    <span className="nums ml-auto flex shrink-0 items-baseline gap-1.5 text-caption text-fg-muted">
      {mean === null ? null : (
        <span className="text-small font-semibold text-accent-soft">
          {fr.journal.recipe.mean(formatNumber(mean, 1))}
        </span>
      )}
      <span>{fr.journal.recipe.notes(notes.length)}</span>
    </span>
  )
}

/** Curve of the mean rating version after version (section 10.6), from two rated versions. */
function VersionRatings({ recipe, tastings }: { recipe: RecipeDetail; tastings: readonly TastingNote[] }) {
  const values = [...recipe.history]
    .sort((a, b) => a.version - b.version)
    .map((entry) => meanOverall(tastings.filter((note) => note.recipeVersion === entry.version)))
    .filter((value): value is number => value !== null)
  if (values.length < 2) return null
  return (
    <div className="mt-2">
      <Sparkline
        values={values}
        label={fr.journal.recipe.byVersion}
        min={1}
        max={5}
        height={56}
        formatValue={(value) => formatNumber(value, 1)}
      />
    </div>
  )
}
