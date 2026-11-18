import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChefHat, CopyPlus, FlaskConical, NotebookPen, Pencil, Star, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { FilterPill } from '@renderer/components/FilterPill'
import { Input } from '@renderer/components/Input'
import { StatusBadge, VersionBadge } from '@renderer/components/StatusBadge'
import { toast } from '@renderer/components/Toast'
import { ComputedPanel } from '@renderer/features/recipes/ComputedPanel'
import { detailToInput, formatDose } from '@renderer/features/recipes/model'
import { categoryPath } from '@renderer/features/shared/categories'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatDate, formatNumber } from '@renderer/lib/format'
import {
  recordView,
  restoreRecipe,
  useCategories,
  useCreateVariant,
  useDeleteRecipe,
  useGlasses,
  useIceTypes,
  useIngredients,
  useProducts,
  useRecipe,
  useRecipes,
  useSetRecipeFavorite,
  useSetRecipeStatus,
} from '@renderer/lib/queries'
import { STATUS_VALUES, type RecipeDetail } from '@shared/domain/catalog'

const t = fr.recipes
const td = t.detail
const withUnit = fr.components.display.withUnit

const statusOptions = STATUS_VALUES.map((value) => ({ value, label: fr.components.display.status[value] }))

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
        className="mx-auto min-h-[320px] max-w-[1120px] p-8"
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
  const tasteHintId = useId()

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
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
      <Link
        to="/recipes"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-small font-medium text-fg-secondary hover:text-fg"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {td.back}
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-small text-fg-muted">{context.join(' · ')}</span>
          <h1 className="m-0 text-title leading-tight font-semibold tracking-[-0.02em] text-fg">
            {recipe.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={recipe.status} />
            <VersionBadge version={recipe.version} />
            {recipe.credit ? (
              <span className="text-small text-fg-secondary">{td.credit(recipe.credit)}</span>
            ) : null}
            {parent ? (
              <span className="text-small text-fg-secondary">
                {`${td.variantOf} `}
                <Link
                  to={`/recipes/${parent.id}`}
                  className="font-semibold text-accent-soft hover:text-accent"
                >
                  {parent.name}
                </Link>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<Pencil size={16} aria-hidden="true" />}
            onClick={() => void navigate(`/recipes/${recipe.id}/edit`)}
          >
            {td.edit}
          </Button>
          <Button
            variant="outline"
            icon={<CopyPlus size={16} aria-hidden="true" />}
            onClick={() => {
              setVariantOpen(true)
            }}
          >
            {td.variant}
          </Button>
          <Button
            variant="outline"
            icon={<ChefHat size={16} aria-hidden="true" />}
            aria-keyshortcuts="F11"
            onClick={() => void navigate(`/prepare/${recipe.id}`)}
          >
            {fr.recipes.prepare.open}
          </Button>
          <FilterPill
            label={td.status}
            options={statusOptions}
            value={recipe.status}
            onChange={(status) => {
              setStatus.mutate(
                { id: recipe.id, status },
                {
                  onSuccess: () => {
                    toast.show({ message: td.statusChanged(fr.components.display.status[status]) })
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
          <Button
            variant="outline"
            icon={<FlaskConical size={16} aria-hidden="true" />}
            aria-keyshortcuts="Control+E"
            onClick={() => void navigate(`/lab/${recipe.id}`)}
          >
            {td.lab}
          </Button>
          <SoonButton
            icon={<NotebookPen size={16} aria-hidden="true" />}
            phase={td.tastePhase}
            hint={td.tasteSoon}
            hintId={tasteHintId}
          >
            {td.taste}
          </SoonButton>
          <Button
            variant="danger"
            className="ml-auto"
            icon={<Trash2 size={16} aria-hidden="true" />}
            disabled={deleteRecipe.isPending}
            onClick={remove}
          >
            {td.delete}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_356px] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <LinesCard recipe={recipe} names={names} />
          <Card aria-label={td.sections.steps}>
            <h2 className="m-0 text-body font-semibold text-fg">{td.sections.steps}</h2>
            {recipe.steps.length === 0 ? (
              <p className="m-0 text-small text-fg-muted">{td.noSteps}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {recipe.steps.map((step, index) => (
                  <li
                    key={`${String(index)}-${step}`}
                    className="flex gap-3 text-body leading-relaxed text-fg"
                  >
                    <span className="nums flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-caption text-fg-secondary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 pt-px whitespace-pre-wrap">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          {recipe.garnish || recipe.notes ? (
            <div className="grid grid-cols-2 gap-4">
              {recipe.garnish ? (
                <TextCard
                  title={td.sections.garnish}
                  text={recipe.garnish}
                  className={recipe.notes ? '' : 'col-span-2'}
                />
              ) : null}
              {recipe.notes ? (
                <TextCard
                  title={td.sections.notes}
                  text={recipe.notes}
                  className={recipe.garnish ? '' : 'col-span-2'}
                />
              ) : null}
            </div>
          ) : null}
          <Card aria-label={td.sections.service}>
            <h2 className="m-0 text-body font-semibold text-fg">{td.sections.service}</h2>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact label={td.fields.glass} value={glass?.name} />
              <Fact label={td.fields.ice} value={ice?.name} />
              <Fact label={td.fields.method} value={recipe.method ? t.methods[recipe.method] : null} />
              <Fact label={td.fields.family} value={recipe.family ? t.families[recipe.family] : null} />
              <Fact
                label={td.fields.length}
                value={recipe.drinkLength ? t.lengths[recipe.drinkLength] : null}
              />
              <Fact
                label={td.fields.moment}
                value={recipe.servingMoment ? t.moments[recipe.servingMoment] : null}
              />
              <Fact label={td.fields.profile} value={recipe.profile} />
              <Fact label={td.fields.origin} value={t.origins[recipe.origin]} />
              {recipe.dilutionOverridePct === null ? null : (
                <Fact
                  label={td.fields.dilution}
                  value={withUnit(formatNumber(recipe.dilutionOverridePct), t.panel.units.pct)}
                />
              )}
              {recipe.tags.length > 0 ? <Fact label={td.fields.tags} value={recipe.tags.join(', ')} /> : null}
            </dl>
          </Card>
          {recipe.kind === 'prep' ? (
            <Card aria-label={td.sections.prep}>
              <h2 className="m-0 text-body font-semibold text-fg">{td.sections.prep}</h2>
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
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
                <Fact label={td.fields.storage} value={recipe.storageNotes} />
              </dl>
            </Card>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <ComputedPanel data={recipe.lines.length > 0 ? computationInput : null} names={names} />
          <Card aria-label={td.sections.history}>
            <h2 className="m-0 text-body font-semibold text-fg">{td.sections.history}</h2>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {recipe.history.map((entry) => (
                <li key={entry.version} className="flex items-center gap-3">
                  <VersionBadge version={entry.version} />
                  <span className="min-w-0 flex-1 truncate text-small text-fg-secondary">
                    {entry.label ?? formatDate(entry.createdAt)}
                    {entry.version === recipe.version ? (
                      <span className="text-fg-muted">{` · ${td.current}`}</span>
                    ) : null}
                  </span>
                  {entry.label ? (
                    <span className="nums shrink-0 text-caption text-fg-muted">
                      {formatDate(entry.createdAt)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      <VariantDialog
        open={variantOpen}
        recipe={recipe}
        onClose={() => {
          setVariantOpen(false)
        }}
      />
    </div>
  )
}

/** An action of a later phase: focusable, announced as unavailable, with its phase written on it. */
function SoonButton({
  icon,
  phase,
  hint,
  hintId,
  children,
}: {
  icon: ReactNode
  phase: string
  hint: string
  hintId: string
  children: ReactNode
}) {
  return (
    <>
      <Button
        variant="outline"
        icon={icon}
        aria-disabled="true"
        aria-describedby={hintId}
        title={hint}
        className="cursor-not-allowed text-fg-muted hover:bg-transparent"
      >
        {children}
        <span className="rounded-full border border-border-strong px-1.5 text-[11px] font-semibold text-fg-muted">
          {phase}
        </span>
      </Button>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </>
  )
}

function LinesCard({ recipe, names }: { recipe: RecipeDetail; names: ReadonlyMap<string, string> }) {
  return (
    <Card aria-label={td.sections.lines}>
      <h2 className="m-0 text-body font-semibold text-fg">{td.sections.lines}</h2>
      {recipe.lines.length === 0 ? (
        <p className="m-0 text-small text-fg-muted">{td.noLines}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {recipe.lines.map((line) => (
            <li
              key={line.id}
              className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3 border-b border-border py-2 last:border-b-0"
            >
              <span
                className={cn(
                  'nums text-right text-body',
                  line.quantity === null && line.unit !== 'top' && line.unit !== 'to_taste'
                    ? 'text-fg-muted italic'
                    : 'text-fg',
                )}
              >
                {formatDose(line)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-body text-fg">
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
          ))}
        </ul>
      )}
    </Card>
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
  return (
    <span className="rounded-full border border-dashed border-border-strong px-2 text-caption text-fg-secondary">
      {children}
    </span>
  )
}

function TextCard({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <Card aria-label={title} className={className}>
      <h2 className="m-0 text-body font-semibold text-fg">{title}</h2>
      <p className="m-0 text-body leading-relaxed whitespace-pre-wrap text-fg-secondary">{text}</p>
    </Card>
  )
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption font-medium text-fg-muted">{label}</dt>
      <dd className={cn('m-0 text-body', value ? 'text-fg' : 'text-fg-muted')}>{value ?? t.none}</dd>
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
