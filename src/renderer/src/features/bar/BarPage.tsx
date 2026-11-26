import { ChevronRight, CircleAlert, Merge, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { normalizeName } from '@core/normalize'
import { ArrowLink } from '@renderer/components/ArrowLink'
import { Button, IconButton } from '@renderer/components/Button'
import { Checkbox } from '@renderer/components/Checkbox'
import { Combobox, filterOptions } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { NoValue } from '@renderer/components/NoValue'
import { SectionTitle } from '@renderer/components/SectionTitle'
import { SegmentedControl } from '@renderer/components/SegmentedControl'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { IngredientFormDialog } from '@renderer/features/bar/IngredientFormDialog'
import { useInventory, useSetIngredientOwned } from '@renderer/features/bar/inventory'
import { ProductFormDialog } from '@renderer/features/bar/ProductFormDialog'
import { useRecipeFilters } from '@renderer/features/recipes/filters'
import { categoryPath } from '@renderer/features/shared/categories'
import { AllergenList } from '@renderer/features/shared/fields'
import { errorMessage, isConflict, notifyError } from '@renderer/features/shared/notify'
import { useTonight } from '@renderer/features/shared/tonight'
import { fr } from '@renderer/i18n/fr'
import { cn } from '@renderer/lib/cn'
import { formatEuros, formatNumber } from '@renderer/lib/format'
import {
  useCategories,
  useDeleteIngredient,
  useDeleteProduct,
  useIngredient,
  useIngredients,
  useMergeIngredients,
  useProducts,
  useRecipes,
  useSetProductOwned,
} from '@renderer/lib/queries'
import type { IngredientDetail, IngredientSummary, Product } from '@shared/domain/catalog'
import type { Category } from '@shared/domain/reference'

const t = fr.bar
/** No-break space before the colon, as French typography wants. */
const NBSP = String.fromCharCode(0xa0)
const td = t.detail
const tw = fr.workshop.bar

type IngredientDialog = { kind: 'create' } | { kind: 'edit' } | { kind: 'merge' } | { kind: 'delete' } | null
type Show = 'all' | 'owned' | 'missing'

/** Columns of a line: check box, name, recipes using it, chevron. The category column comes first. */
const ROW = 'grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem_1.25rem] items-center gap-x-2'
const SUB = 'grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-2'

type Subgroup = { id: string; label: string; items: IngredientSummary[] }
type Family = { id: string; label: string; total: number; owned: number; subgroups: Subgroup[] }

/**
 * Families and their subgroups: the root of the category tree, then its child (« Spiritueux »,
 * then « Whiskies »). An ingredient filed deeper joins the subgroup of its ancestor.
 */
function familiesOf(
  items: readonly IngredientSummary[],
  counted: readonly IngredientSummary[],
  categories: readonly Category[],
  owned: ReadonlySet<string>,
): Family[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const order = new Map(categories.map((category, index) => [category.id, index]))
  const lineage = (id: string): Category[] => {
    const chain: Category[] = []
    let current = byId.get(id)
    while (current && chain.length < 10) {
      chain.unshift(current)
      current = current.parentId === null ? undefined : byId.get(current.parentId)
    }
    return chain
  }
  const families = new Map<string, Family>()
  const familyOf = (ingredient: IngredientSummary) => {
    const chain = lineage(ingredient.categoryId)
    const root = chain[0]
    const id = root?.id ?? ingredient.categoryId
    let family = families.get(id)
    if (!family) {
      family = { id, label: root?.name ?? '', total: 0, owned: 0, subgroups: [] }
      families.set(id, family)
    }
    return { family, sub: chain[1] }
  }
  for (const ingredient of counted) {
    const { family } = familyOf(ingredient)
    family.total += 1
    if (owned.has(ingredient.id)) family.owned += 1
  }
  const collator = new Intl.Collator('fr', { sensitivity: 'base' })
  for (const ingredient of items) {
    const { family, sub } = familyOf(ingredient)
    const subId = sub?.id ?? family.id
    let group = family.subgroups.find((candidate) => candidate.id === subId)
    if (!group) {
      group = { id: subId, label: sub?.name ?? '', items: [] }
      family.subgroups.push(group)
    }
    group.items.push(ingredient)
  }
  const rank = (id: string) => (id === '' ? -1 : (order.get(id) ?? Number.MAX_SAFE_INTEGER))
  return [...families.values()]
    .filter((family) => family.subgroups.length > 0)
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((family) => ({
      ...family,
      subgroups: family.subgroups
        .sort((a, b) => (a.id === family.id ? -1 : b.id === family.id ? 1 : rank(a.id) - rank(b.id)))
        .map((group) => ({ ...group, items: group.items.sort((a, b) => collator.compare(a.name, b.name)) })),
    }))
}

/**
 * « Ingrédients » (section 10.8, D-057): every ingredient on a line with its « Au bar » box, grouped
 * by family; beside it, what the bar allows tonight and what to buy, or the chosen ingredient.
 */
export function BarPage() {
  const ingredients = useIngredients()
  const categories = useCategories()
  const inventory = useInventory()
  const setIngredientOwned = useSetIngredientOwned()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('all')
  const [dialog, setDialog] = useState<IngredientDialog>(null)
  const selectedId = params.get('ingredient')
  const selected = useIngredient(selectedId)

  function select(id: string | null) {
    setParams(id === null ? {} : { ingredient: id }, { replace: true })
  }

  const matched = useMemo(() => {
    const list = ingredients.data ?? []
    if (query.trim() === '') return list
    const indexed = list.map((ingredient) => {
      const names = [ingredient.name, ...ingredient.aliases].map(normalizeName)
      return { ingredient, normalized: names.join(' | '), words: names.join(' ').split(' ') }
    })
    return filterOptions(indexed, query).map((entry) => entry.ingredient)
  }, [ingredients.data, query])

  const counts = useMemo(() => {
    const owned = matched.filter((ingredient) => inventory.owned.has(ingredient.id)).length
    return { all: matched.length, owned, missing: matched.length - owned }
  }, [matched, inventory.owned])

  const families = useMemo(() => {
    const shown =
      show === 'all'
        ? matched
        : matched.filter((ingredient) => inventory.owned.has(ingredient.id) === (show === 'owned'))
    return familiesOf(shown, matched, categories.data ?? [], inventory.owned)
  }, [matched, show, categories.data, inventory.owned])

  const total = ingredients.data?.length ?? 0
  const newIngredient = (
    <Button
      icon={<Plus size={16} aria-hidden="true" />}
      onClick={() => {
        setDialog({ kind: 'create' })
      }}
    >
      {t.newIngredient}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="nums text-caption text-fg-muted">{t.count(total)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        {newIngredient}
      </header>

      {ingredients.isError ? (
        <p role="alert" className="m-0 text-body text-status-danger">
          {t.loadError}
        </p>
      ) : ingredients.isPending ? null : total === 0 ? (
        <EmptyState
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={newIngredient}
        />
      ) : (
        <>
          <p className="m-0 -mt-2 max-w-[680px] text-body text-fg-secondary">{t.description}</p>
          <div
            className={cn(
              'grid items-start pt-2',
              selectedId === null
                ? 'grid-cols-[minmax(0,1fr)_clamp(16rem,30%,22.5rem)]'
                : 'grid-cols-[minmax(0,1fr)_clamp(22rem,40%,28rem)]',
            )}
          >
            <section aria-label={t.listLabel} className="flex min-w-0 flex-col pr-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <SegmentedControl<Show>
                  label={t.show.listLabel}
                  value={show}
                  onChange={setShow}
                  options={[
                    { value: 'all', label: t.show.modes.all, count: formatNumber(counts.all) },
                    { value: 'owned', label: t.show.modes.owned, count: formatNumber(counts.owned) },
                    { value: 'missing', label: t.show.modes.missing, count: formatNumber(counts.missing) },
                  ]}
                />
                <Input
                  variant="search"
                  label={t.search}
                  hideLabel
                  placeholder={t.searchPlaceholder}
                  value={query}
                  className="w-64 max-w-full min-w-0 shrink"
                  onChange={(event) => {
                    setQuery(event.target.value)
                  }}
                />
              </div>
              {families.length === 0 ? (
                <p className="m-0 py-3 text-small text-fg-muted">{t.noMatch}</p>
              ) : (
                <>
                  <div aria-hidden="true" className={cn(SUB, 'mb-3 text-caption text-fg-muted')}>
                    <span>{t.columns.category}</span>
                    <span className={ROW}>
                      <span className="text-center">{t.columns.owned}</span>
                      <span>{t.columns.ingredient}</span>
                      <span className="text-right">{t.columns.usedIn}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-6">
                    {families.map((family) => (
                      <FamilySection
                        key={family.id}
                        family={family}
                        selectedId={selectedId}
                        owned={inventory.owned}
                        usage={inventory.usage}
                        onSelect={select}
                        onOwned={(ingredient, owned) => {
                          void setIngredientOwned(ingredient.id, ingredient.name, owned)
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            <aside
              aria-label={t.side.region}
              className="sticky top-0 flex max-h-[calc(100vh-5rem)] min-w-0 flex-col gap-8 overflow-y-auto border-l border-border pb-4 pl-8"
            >
              {selectedId === null ? (
                <>
                  <TonightSection />
                  <ShoppingSection onSelect={select} />
                </>
              ) : selected.isPending ? (
                <p className="m-0 text-body text-fg-muted" aria-busy="true">
                  {td.loading}
                </p>
              ) : selected.isError ? (
                <EmptyState title={fr.errors.NOT_FOUND} className="min-h-[240px] p-6" />
              ) : (
                <IngredientPanel
                  ingredient={selected.data}
                  owned={inventory.owned.has(selected.data.id)}
                  onClose={() => {
                    select(null)
                  }}
                  onEdit={() => {
                    setDialog({ kind: 'edit' })
                  }}
                  onMerge={() => {
                    setDialog({ kind: 'merge' })
                  }}
                  onDelete={() => {
                    setDialog({ kind: 'delete' })
                  }}
                />
              )}
            </aside>
          </div>
        </>
      )}

      <IngredientFormDialog
        open={dialog?.kind === 'create' || (dialog?.kind === 'edit' && selected.data !== undefined)}
        ingredient={dialog?.kind === 'edit' ? (selected.data ?? null) : null}
        onClose={() => {
          setDialog(null)
        }}
        onSaved={(ingredient) => {
          setDialog(null)
          select(ingredient.id)
        }}
      />
      {selected.data ? (
        <>
          <MergeDialog
            open={dialog?.kind === 'merge'}
            source={selected.data}
            options={ingredients.data ?? []}
            onClose={() => {
              setDialog(null)
            }}
            onMerged={(target) => {
              setDialog(null)
              select(target.id)
            }}
          />
          <DeleteIngredientDialog
            open={dialog?.kind === 'delete'}
            ingredient={selected.data}
            onClose={() => {
              setDialog(null)
            }}
            onDeleted={() => {
              setDialog(null)
              select(null)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

function FamilySection({
  family,
  selectedId,
  owned,
  usage,
  onSelect,
  onOwned,
}: {
  family: Family
  selectedId: string | null
  owned: ReadonlySet<string>
  usage: ReadonlyMap<string, number>
  onSelect: (id: string) => void
  onOwned: (ingredient: IngredientSummary, owned: boolean) => void
}) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col">
      <SectionTitle
        id={titleId}
        action={
          <span className="nums shrink-0 text-caption text-fg-muted">
            {t.familyCount(family.owned, family.total)}
          </span>
        }
      >
        {family.label}
      </SectionTitle>
      {family.subgroups.map((group, index) => (
        <div key={group.id} className={cn(SUB, index > 0 && 'border-t border-border')}>
          <span className="flex min-h-9 min-w-0 items-center text-small break-words text-fg-muted">
            {group.label}
          </span>
          <ul className="m-0 flex list-none flex-col p-0">
            {group.items.map((ingredient) => {
              const isOwned = owned.has(ingredient.id)
              const isSelected = ingredient.id === selectedId
              const extra = [
                ingredient.aliases.slice(0, 2).join(', '),
                ingredient.prepRecipeId ? t.prep : '',
                ingredient.isStaple ? t.staple : '',
              ].filter((part) => part !== '')
              return (
                <li
                  key={ingredient.id}
                  className={cn(ROW, 'min-h-9 border-t border-border first:border-t-0')}
                >
                  <Checkbox
                    label={t.ownedLabel(ingredient.name)}
                    hideLabel
                    checked={isOwned}
                    className="justify-self-center"
                    onChange={(event) => {
                      onOwned(ingredient, event.target.checked)
                    }}
                  />
                  <span className="flex min-w-0 items-baseline gap-2.5 py-1.5">
                    <button
                      type="button"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => {
                        onSelect(ingredient.id)
                      }}
                      className={cn(
                        'min-w-0 cursor-pointer rounded-sm text-left text-body break-words transition-colors duration-150 ease-out-soft hover:text-fg',
                        isSelected
                          ? 'font-medium text-accent-soft'
                          : isOwned
                            ? 'font-medium text-fg'
                            : 'text-fg-secondary',
                      )}
                    >
                      {ingredient.name}
                    </button>
                    {extra.length > 0 ? (
                      <span className="min-w-0 truncate text-caption text-fg-muted">{extra.join(', ')}</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'nums text-right text-small',
                      isOwned ? 'text-fg-secondary' : 'text-fg-muted',
                    )}
                  >
                    {t.usage(usage.get(ingredient.id) ?? 0)}
                  </span>
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className="justify-self-end text-fg-muted opacity-70"
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}

/** Recipes that can be made with what is checked, the first five by name, then a link to all. */
function TonightSection() {
  const recipes = useRecipes()
  const titleId = useId()
  const makeable = useMemo(() => {
    const collator = new Intl.Collator('fr', { sensitivity: 'base' })
    return (recipes.data ?? [])
      .filter((recipe) => recipe.kind === 'cocktail' && recipe.missingIngredientIds.length === 0)
      .sort(
        (a, b) =>
          Number(b.isFavorite) - Number(a.isFavorite) ||
          Number(b.origin === 'mine') - Number(a.origin === 'mine') ||
          collator.compare(a.name, b.name),
      )
  }, [recipes.data])
  const count = makeable.length

  return (
    <section aria-labelledby={titleId} className="flex flex-col">
      <SectionTitle id={titleId}>{t.side.tonight}</SectionTitle>
      <p className="m-0 mt-3.5 mb-2.5 flex items-baseline gap-2.5">
        <span className="nums text-metric leading-none font-semibold text-accent-soft">{count}</span>
        <span className="text-small text-fg-secondary">{t.side.tonightText(count)}</span>
      </p>
      {count === 0 ? (
        <p className="m-0 text-small text-fg-muted">{t.side.none}</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col p-0">
            {makeable.slice(0, 5).map((recipe) => (
              <li
                key={recipe.id}
                className="flex min-h-[34px] items-center justify-between gap-3 border-t border-border"
              >
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="min-w-0 truncate text-body text-fg transition-colors duration-150 hover:text-accent-soft"
                >
                  {recipe.name}
                </Link>
                {recipe.method ? (
                  <span className="shrink-0 text-caption text-fg-muted">
                    {fr.recipes.methods[recipe.method]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <ArrowLink
            to="/recipes"
            onClick={() => {
              const filters = useRecipeFilters.getState()
              filters.reset()
              filters.set({ view: 'makeable' })
            }}
            className="mt-3 w-fit"
          >
            {t.side.more(count)}
          </ArrowLink>
        </>
      )}
    </section>
  )
}

/** The bottles that would unlock the most recipes, each being the only one they miss (section 10.8). */
function ShoppingSection({ onSelect }: { onSelect: (id: string) => void }) {
  const tonight = useTonight()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <SectionTitle id={titleId}>{tw.shopping.title}</SectionTitle>
      <p className="m-0 mt-1 text-small text-fg-secondary">{tw.shopping.description}</p>
      {tonight.unlockers.length === 0 ? (
        <p className="m-0 text-small text-fg-muted">{tw.shopping.empty}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {tonight.unlockers.slice(0, 10).map((entry) => (
            <li key={entry.ingredientId} className="border-t border-border">
              <button
                type="button"
                className="group/buy flex w-full cursor-pointer items-baseline gap-3 py-2 text-left"
                onClick={() => {
                  onSelect(entry.ingredientId)
                }}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-medium text-fg transition-colors duration-150 group-hover/buy:text-accent-soft">
                    {entry.name}
                  </span>
                  <span className="truncate text-caption text-fg-muted">
                    {`${tw.shopping.unlocks(entry.recipes.length)}${NBSP}: ${entry.recipes
                      .slice(0, 4)
                      .map((recipe) => recipe.name)
                      .join(', ')}`}
                  </span>
                </span>
                <span className="nums shrink-0 text-lead font-semibold text-accent-soft">
                  {`+${String(entry.recipes.length)}`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** How many recipes using it are named before « et N autres fiches ». */
const USED_BY_SHOWN = 24

function IngredientPanel({
  ingredient,
  owned,
  onClose,
  onEdit,
  onMerge,
  onDelete,
}: {
  ingredient: IngredientDetail
  owned: boolean
  onClose: () => void
  onEdit: () => void
  onMerge: () => void
  onDelete: () => void
}) {
  const categories = useCategories()
  const titleId = useId()
  const compositionMissing = ingredient.sugarGPerL === null || ingredient.acidGPerL === null
  const source = ingredient.compositionSource ? t.sources[ingredient.compositionSource] : null
  const confidence = ingredient.compositionConfidence ? t.confidences[ingredient.compositionConfidence] : null
  const tags: string[] = []
  if (ingredient.prepRecipeId) tags.push(t.prep)
  if (ingredient.isStaple) tags.push(t.staple)
  const figures = [
    { label: td.abv, value: ingredient.defaultAbv, unit: td.abvUnit },
    { label: td.sugar, value: ingredient.sugarGPerL, unit: td.perLitre },
    { label: td.acid, value: ingredient.acidGPerL, unit: td.perLitre },
    { label: td.density, value: ingredient.densityGPerMl, unit: td.densityUnit },
  ]

  return (
    <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 pt-1 text-caption text-fg-muted">
            {categoryPath(categories.data, ingredient.categoryId)}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            label={td.close}
            icon={<X size={16} aria-hidden="true" />}
            onClick={onClose}
          />
        </div>
        <h2 id={titleId} className="m-0 text-heading font-semibold tracking-tight break-words text-fg">
          {ingredient.name}
        </h2>
        {tags.length > 0 ? <p className="m-0 text-caption text-fg-muted">{tags.join(', ')}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" icon={<Pencil size={14} aria-hidden="true" />} onClick={onEdit}>
            {td.edit}
          </Button>
          <Button variant="ghost" size="sm" icon={<Merge size={14} aria-hidden="true" />} onClick={onMerge}>
            {td.merge}
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} aria-hidden="true" />} onClick={onDelete}>
            {td.delete}
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <dl className="m-0 flex flex-col">
          {figures.map((figure) => (
            <div
              key={figure.label}
              className="flex items-baseline justify-between gap-3 border-t border-border py-2 first:border-t-0"
            >
              <dt className="text-small text-fg-secondary">{figure.label}</dt>
              <dd className="nums m-0 text-body text-fg">
                {figure.value === null ? <NoValue /> : `${formatNumber(figure.value)} ${figure.unit}`}
              </dd>
            </div>
          ))}
        </dl>
        {source ? <p className="m-0 text-caption text-fg-muted">{td.source(source, confidence)}</p> : null}
        {ingredient.defaultAbv === null ? (
          <Notice>{td.abvMissing}</Notice>
        ) : ingredient.defaultAbv > 0 ? (
          <p className="m-0 text-caption text-fg-muted">{td.abvHint}</p>
        ) : null}
        {compositionMissing ? <Notice>{td.compositionMissing}</Notice> : null}
      </div>

      <BottlesSection ingredientId={ingredient.id} ingredientName={ingredient.name} owned={owned} />

      <Block title={td.usedBy}>
        {ingredient.usedBy.length === 0 ? (
          <p className="m-0 text-small text-fg-secondary">{td.notUsed}</p>
        ) : (
          <p className="m-0 text-small leading-relaxed">
            {ingredient.usedBy.slice(0, USED_BY_SHOWN).map((recipe, index) => (
              <span key={recipe.id}>
                {index > 0 ? ', ' : null}
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="font-semibold text-accent-soft transition-colors duration-150 hover:text-accent"
                >
                  {recipe.name}
                </Link>
              </span>
            ))}
            {ingredient.usedBy.length > USED_BY_SHOWN ? (
              <span className="text-fg-muted">{` ${td.usedByMore(ingredient.usedBy.length - USED_BY_SHOWN)}`}</span>
            ) : null}
          </p>
        )}
      </Block>
      <Block title={td.allergens}>
        <AllergenList codes={ingredient.allergens} empty={td.noAllergen} />
      </Block>
      <Block title={td.flavors}>
        <p className="m-0 text-small text-fg-secondary">
          {ingredient.flavorTags.length === 0 ? td.noFlavor : ingredient.flavorTags.join(', ')}
        </p>
      </Block>
      <Block title={td.aliases}>
        <p className="m-0 text-small text-fg-secondary">
          {ingredient.aliases.length === 0 ? td.noAlias : ingredient.aliases.join(', ')}
        </p>
      </Block>
    </article>
  )
}

function BottlesSection({
  ingredientId,
  ingredientName,
  owned,
}: {
  ingredientId: string
  ingredientName: string
  owned: boolean
}) {
  const products = useProducts(ingredientId)
  const setIngredientOwned = useSetIngredientOwned()
  const setOwned = useSetIngredientBottle()
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const list = products.data ?? []

  return (
    <Block
      title={td.bottles}
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={14} aria-hidden="true" />}
          onClick={() => {
            setEditing({ product: null })
          }}
        >
          {td.addBottle}
        </Button>
      }
    >
      <Toggle
        label={tw.owned(ingredientName)}
        hideLabel
        showState
        checked={owned}
        disabled={products.isPending}
        onCheckedChange={(next) => {
          void setIngredientOwned(ingredientId, ingredientName, next)
        }}
      />
      {list.length === 0 ? (
        <p className="m-0 text-small text-fg-secondary">{td.noBottle}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((product) => {
            const name = product.brand ? `${product.brand} ${product.name}` : product.name
            const details = [
              product.volumeMl === null ? null : t.bottle.volume(formatNumber(product.volumeMl)),
              product.abv === null ? null : t.bottle.abv(formatNumber(product.abv)),
              product.purchasePriceCents === null || product.purchasePriceBasis === null
                ? null
                : t.bottle.price(
                    formatEuros(product.purchasePriceCents),
                    t.productForm.basisOptions[product.purchasePriceBasis],
                  ),
            ].filter((part): part is string => part !== null)
            return (
              <li
                key={product.id}
                className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
              >
                <Toggle
                  label={t.bottle.ownedLabel(name)}
                  hideLabel
                  checked={product.owned}
                  onCheckedChange={(next) => {
                    setOwned(product.id, next)
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('truncate text-body', product.owned ? 'text-fg' : 'text-fg-secondary')}>
                    {name}
                  </span>
                  {details.length > 0 ? (
                    <span className="nums text-small text-fg-muted">{details.join(', ')}</span>
                  ) : null}
                  {product.source === 'off' ? (
                    <span className="text-caption text-fg-muted">{t.offAttribution}</span>
                  ) : null}
                </div>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t.bottle.edit(name)}
                  icon={<Pencil size={14} aria-hidden="true" />}
                  onClick={() => {
                    setEditing({ product })
                  }}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t.bottle.delete(name)}
                  icon={<Trash2 size={14} aria-hidden="true" />}
                  onClick={() => {
                    setDeleting(product)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}
      <ProductFormDialog
        open={editing !== null}
        ingredientId={ingredientId}
        product={editing?.product ?? null}
        onClose={() => {
          setEditing(null)
        }}
      />
      <DeleteProductDialog
        product={deleting}
        onClose={() => {
          setDeleting(null)
        }}
      />
    </Block>
  )
}

/** One bottle owned or not, from its own switch. */
function useSetIngredientBottle() {
  const setOwned = useSetProductOwned()
  return (id: string, owned: boolean) => {
    setOwned.mutate({ id, owned }, { onError: notifyError })
  }
}

/** A titled block of the calm column: small capitals, a hairline, then its content. */
function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <SectionTitle as="h3" tone="muted" action={action}>
        {title}
      </SectionTitle>
      {children}
    </section>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 text-small text-fg">
      <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-status-warning" />
      {children}
    </p>
  )
}

function MergeDialog({
  open,
  source,
  options,
  onClose,
  onMerged,
}: {
  open: boolean
  source: IngredientDetail
  options: readonly IngredientSummary[]
  onClose: () => void
  onMerged: (target: IngredientSummary) => void
}) {
  const tm = t.merge
  const merge = useMergeIngredients()
  const products = useProducts(source.id)
  const [targetId, setTargetId] = useState<string | null>(null)
  const target = options.find((candidate) => candidate.id === targetId)
  const comboOptions = useMemo(
    () =>
      options
        .filter((candidate) => candidate.id !== source.id)
        .map((candidate) => ({ id: candidate.id, label: candidate.name, keywords: candidate.aliases })),
    [options, source.id],
  )

  function close() {
    setTargetId(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={tm.title(source.name)}
      description={tm.description}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {tm.cancel}
          </Button>
          <Button
            disabled={!target || merge.isPending}
            onClick={() => {
              if (!target) return
              merge.mutate(
                { sourceId: source.id, targetId: target.id },
                {
                  onSuccess: (merged) => {
                    toast.show({ message: tm.done(source.name, merged.name) })
                    setTargetId(null)
                    onMerged(merged)
                  },
                  onError: notifyError,
                },
              )
            }}
          >
            {tm.confirm}
          </Button>
        </>
      }
    >
      <Combobox
        label={tm.target}
        placeholder={tm.targetPlaceholder}
        options={comboOptions}
        value={targetId}
        onSelect={setTargetId}
      />
      {target ? (
        <section
          aria-label={tm.preview}
          className="flex flex-col gap-1.5 rounded-nested border border-border-strong bg-surface-1/60 p-4"
        >
          <h3 className="m-0 text-caption font-medium text-fg-muted">{tm.preview}</h3>
          <p className="m-0 text-small text-fg">{tm.previewAlias(source.name, target.name)}</p>
          {source.aliases.length > 0 ? (
            <p className="m-0 text-small text-fg-secondary">{tm.previewAliases(source.aliases.length)}</p>
          ) : null}
          <p className="m-0 text-small text-fg-secondary">{tm.previewRecipes(source.usedBy.length)}</p>
          <p className="m-0 text-small text-fg-secondary">{tm.previewBottles(products.data?.length ?? 0)}</p>
        </section>
      ) : null}
    </Dialog>
  )
}

function DeleteIngredientDialog({
  open,
  ingredient,
  onClose,
  onDeleted,
}: {
  open: boolean
  ingredient: IngredientDetail
  onClose: () => void
  onDeleted: () => void
}) {
  const tr = t.remove
  const remove = useDeleteIngredient()
  const [failure, setFailure] = useState<string | null>(null)
  const used = ingredient.usedBy.length > 0

  function close() {
    setFailure(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={tr.title(ingredient.name)}
      description={tr.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" data-autofocus="" onClick={close}>
            {tr.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={used || remove.isPending}
            onClick={() => {
              remove.mutate(
                { id: ingredient.id },
                {
                  onSuccess: () => {
                    toast.show({ message: tr.done(ingredient.name) })
                    setFailure(null)
                    onDeleted()
                  },
                  onError: (error) => {
                    setFailure(isConflict(error) ? tr.refused : errorMessage(error))
                  },
                },
              )
            }}
          >
            {tr.confirm}
          </Button>
        </>
      }
    >
      {used || failure ? (
        <p role="alert" className="m-0 flex items-start gap-2 text-small font-medium text-status-danger">
          <CircleAlert size={16} aria-hidden="true" className="mt-px shrink-0" />
          {failure ?? tr.used(ingredient.usedBy.length)}
        </p>
      ) : null}
    </Dialog>
  )
}

function DeleteProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const tr = t.removeBottle
  const remove = useDeleteProduct()
  const name = product ? (product.brand ? `${product.brand} ${product.name}` : product.name) : ''
  return (
    <Dialog
      open={product !== null}
      onClose={onClose}
      title={tr.title(name)}
      description={tr.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" data-autofocus="" onClick={onClose}>
            {tr.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => {
              if (!product) return
              remove.mutate(
                { id: product.id },
                {
                  onSuccess: () => {
                    toast.show({ message: t.bottle.deleted(name) })
                    onClose()
                  },
                  onError: notifyError,
                },
              )
            }}
          >
            {tr.confirm}
          </Button>
        </>
      }
    />
  )
}
