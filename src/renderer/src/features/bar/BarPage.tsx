import { CircleAlert, Merge, Pencil, Plus, ShoppingBasket, Trash2, Wine } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { normalizeName } from '@core/normalize'
import { Button, IconButton } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { Combobox, filterOptions } from '@renderer/components/Combobox'
import { Dialog } from '@renderer/components/Dialog'
import { EmptyState } from '@renderer/components/EmptyState'
import { Input } from '@renderer/components/Input'
import { StatTile } from '@renderer/components/StatTile'
import { toast } from '@renderer/components/Toast'
import { Toggle } from '@renderer/components/Toggle'
import { IngredientFormDialog } from '@renderer/features/bar/IngredientFormDialog'
import { ProductFormDialog } from '@renderer/features/bar/ProductFormDialog'
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
  useCreateProduct,
  useSetProductOwned,
} from '@renderer/lib/queries'
import type { IngredientDetail, IngredientSummary, Product } from '@shared/domain/catalog'

const t = fr.bar
const td = t.detail

type IngredientDialog = { kind: 'create' } | { kind: 'edit' } | { kind: 'merge' } | { kind: 'delete' } | null

/**
 * « Mon bar » for phase 3 (section 10.8): ingredients grouped by category, their composition,
 * aliases and allergens, merge of duplicates, deletion refused while used, and their bottles.
 */
export function BarPage() {
  const ingredients = useIngredients()
  const categories = useCategories()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<IngredientDialog>(null)
  const selectedId = params.get('ingredient')
  const selected = useIngredient(selectedId)

  function select(id: string | null) {
    setParams(id === null ? {} : { ingredient: id }, { replace: true })
  }

  const groups = useMemo(() => {
    const list = ingredients.data ?? []
    const indexed = list.map((ingredient) => {
      const names = [ingredient.name, ...ingredient.aliases].map(normalizeName)
      return { ingredient, normalized: names.join(' | '), words: names.join(' ').split(' ') }
    })
    const kept = query.trim() === '' ? indexed : filterOptions(indexed, query)
    const order = new Map((categories.data ?? []).map((category, index) => [category.id, index]))
    const byCategory = new Map<string, IngredientSummary[]>()
    for (const { ingredient } of kept) {
      const group = byCategory.get(ingredient.categoryId) ?? []
      group.push(ingredient)
      byCategory.set(ingredient.categoryId, group)
    }
    const collator = new Intl.Collator('fr', { sensitivity: 'base' })
    return [...byCategory.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .map(([categoryId, items]) => ({
        categoryId,
        label: categoryPath(categories.data, categoryId) ?? '',
        items: items.sort((a, b) => collator.compare(a.name, b.name)),
      }))
  }, [ingredients.data, categories.data, query])

  const total = ingredients.data?.length ?? 0

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-fg-muted">{t.count(total)}</span>
          <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
        </div>
        <Button
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={() => {
            setDialog({ kind: 'create' })
          }}
        >
          {t.newIngredient}
        </Button>
      </header>

      {ingredients.isError ? (
        <p role="alert" className="m-0 text-body text-status-danger">
          {t.loadError}
        </p>
      ) : ingredients.isPending ? null : total === 0 ? (
        <EmptyState
          icon={<Wine size={16} strokeWidth={1.75} aria-hidden="true" />}
          title={t.empty.title}
          description={t.empty.description}
          className="min-h-[320px] p-8"
          action={
            <Button
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => {
                setDialog({ kind: 'create' })
              }}
            >
              {t.newIngredient}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-4">
          <Card className="sticky top-0 max-h-[calc(100vh-220px)] gap-4 overflow-hidden p-4">
            <Input
              variant="search"
              label={t.search}
              hideLabel
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
            />
            <nav aria-label={t.listLabel} className="-mx-1 min-h-0 overflow-y-auto px-1">
              {groups.length === 0 ? (
                <p className="m-0 px-2 py-3 text-small text-fg-muted">{t.noMatch}</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {groups.map((group) => (
                    <li key={group.categoryId} className="flex flex-col gap-1">
                      <h2 className="m-0 px-2 text-caption font-medium text-fg-muted">{group.label}</h2>
                      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {group.items.map((ingredient) => (
                          <li key={ingredient.id}>
                            <button
                              type="button"
                              aria-current={ingredient.id === selectedId ? 'true' : undefined}
                              onClick={() => {
                                select(ingredient.id)
                              }}
                              className={cn(
                                'flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 text-left text-small transition-colors duration-150 ease-out-soft',
                                ingredient.id === selectedId
                                  ? 'bg-surface-2 text-fg shadow-[inset_2px_0_0_var(--color-accent)]'
                                  : 'text-fg-secondary hover:bg-surface-2/60 hover:text-fg',
                              )}
                            >
                              <span className="min-w-0 truncate">{ingredient.name}</span>
                              {ingredient.prepRecipeId ? (
                                <span className="shrink-0 text-caption text-fg-muted">{t.prep}</span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </Card>

          {selectedId === null ? (
            <BarOverview onSelect={select} />
          ) : selected.isPending ? (
            <p className="m-0 text-body text-fg-muted" aria-busy="true">
              {td.loading}
            </p>
          ) : selected.isError ? (
            <EmptyState title={fr.errors.NOT_FOUND} className="min-h-[320px] p-8" />
          ) : (
            <IngredientPanel
              ingredient={selected.data}
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
        </div>
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

function IngredientPanel({
  ingredient,
  onEdit,
  onMerge,
  onDelete,
}: {
  ingredient: IngredientDetail
  onEdit: () => void
  onMerge: () => void
  onDelete: () => void
}) {
  const categories = useCategories()
  const compositionMissing = ingredient.sugarGPerL === null || ingredient.acidGPerL === null
  const source = ingredient.compositionSource ? t.sources[ingredient.compositionSource] : null
  const confidence = ingredient.compositionConfidence ? t.confidences[ingredient.compositionConfidence] : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-small text-fg-muted">
            {categoryPath(categories.data, ingredient.categoryId)}
          </span>
          <div className="flex items-center justify-between gap-4">
            <h2 className="m-0 min-w-0 text-title font-semibold tracking-tight break-words text-fg">
              {ingredient.name}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Pencil size={14} aria-hidden="true" />}
                onClick={onEdit}
              >
                {td.edit}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Merge size={14} aria-hidden="true" />}
                onClick={onMerge}
              >
                {td.merge}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} aria-hidden="true" />}
                onClick={onDelete}
              >
                {td.delete}
              </Button>
            </div>
          </div>
          {ingredient.prepRecipeId || ingredient.isStaple ? (
            <div className="flex flex-wrap gap-2">
              {ingredient.prepRecipeId ? <Tag>{t.prep}</Tag> : null}
              {ingredient.isStaple ? <Tag>{t.staple}</Tag> : null}
            </div>
          ) : null}
        </div>

        <div className="@container">
          <div className="grid grid-cols-2 gap-3 @min-[34rem]:grid-cols-4">
            <StatTile label={td.abv} value={ingredient.defaultAbv} unit={td.abvUnit} />
            <StatTile label={td.sugar} value={ingredient.sugarGPerL} unit={td.perLitre} />
            <StatTile label={td.acid} value={ingredient.acidGPerL} unit={td.perLitre} />
            <StatTile label={td.density} value={ingredient.densityGPerMl} unit={td.densityUnit} />
          </div>
        </div>
        {source ? <p className="m-0 text-small text-fg-secondary">{td.source(source, confidence)}</p> : null}
        {ingredient.defaultAbv === null ? (
          <Notice>{td.abvMissing}</Notice>
        ) : ingredient.defaultAbv > 0 ? (
          <p className="m-0 text-caption text-fg-muted">{td.abvHint}</p>
        ) : null}
        {compositionMissing ? <Notice>{td.compositionMissing}</Notice> : null}

        <div className="grid grid-cols-2 gap-4">
          <Block title={td.allergens}>
            <AllergenList codes={ingredient.allergens} empty={td.noAllergen} />
          </Block>
          <Block title={td.flavors}>
            {ingredient.flavorTags.length === 0 ? (
              <p className="m-0 text-small text-fg-secondary">{td.noFlavor}</p>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {ingredient.flavorTags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block title={td.aliases}>
            {ingredient.aliases.length === 0 ? (
              <p className="m-0 text-small text-fg-secondary">{td.noAlias}</p>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {ingredient.aliases.map((alias) => (
                  <li key={alias}>
                    <Tag>{alias}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
        <Block title={td.usedBy}>
          {ingredient.usedBy.length === 0 ? (
            <p className="m-0 text-small text-fg-secondary">{td.notUsed}</p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
              {ingredient.usedBy.map((recipe) => (
                <li key={recipe.id}>
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="text-small font-semibold text-accent-soft hover:text-accent"
                  >
                    {recipe.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </Card>

      <BottlesCard ingredientId={ingredient.id} ingredientName={ingredient.name} />
    </div>
  )
}

/** Tonight's count and the shopping list, while no ingredient is selected (section 10.8). */
function BarOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const tonight = useTonight()
  const tw = fr.workshop.bar
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/14 text-accent">
            <Wine size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-lead font-semibold text-fg">{tw.makeable(tonight.makeable)}</span>
            <span className="text-small text-fg-secondary">{t.noSelection.hint}</span>
          </div>
        </div>
      </Card>
      <Card aria-label={tw.shopping.title} className="gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 flex items-center gap-2 text-body font-semibold text-fg">
            <ShoppingBasket size={15} strokeWidth={1.75} aria-hidden="true" className="text-accent" />
            {tw.shopping.title}
          </h2>
          <p className="m-0 text-small text-fg-secondary">{tw.shopping.description}</p>
        </div>
        {tonight.unlockers.length === 0 ? (
          <p className="m-0 text-small text-fg-muted">{tw.shopping.empty}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {tonight.unlockers.slice(0, 10).map((entry, index) => (
              <li
                key={entry.ingredientId}
                className="animate-rise"
                style={{ '--rise-index': index } as CSSProperties}
              >
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-nested border border-transparent px-3 py-2 text-left transition-colors duration-150 hover:border-border hover:bg-surface-2"
                  onClick={() => {
                    onSelect(entry.ingredientId)
                  }}
                >
                  <span className="nums flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-small font-bold text-accent-ink">
                    {entry.recipes.length}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-medium text-fg">{entry.name}</span>
                    <span className="truncate text-caption text-fg-muted">
                      {`${tw.shopping.unlocks(entry.recipes.length)} : ${entry.recipes
                        .slice(0, 4)
                        .map((recipe) => recipe.name)
                        .join(', ')}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}

function BottlesCard({ ingredientId, ingredientName }: { ingredientId: string; ingredientName: string }) {
  const products = useProducts(ingredientId)
  const setOwned = useSetProductOwned()
  const createProduct = useCreateProduct()
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const list = products.data ?? []

  return (
    <Card aria-label={td.bottles}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-body font-semibold text-fg">{td.bottles}</h2>
        <Toggle
          label={fr.workshop.bar.owned(ingredientName)}
          hideLabel
          showState
          className="mr-auto ml-2"
          checked={list.some((product) => product.owned)}
          disabled={products.isPending || setOwned.isPending || createProduct.isPending}
          onCheckedChange={(owned) => {
            // One click: the first bottle, or a bottle named after the ingredient.
            const first = list[0]
            if (!owned) {
              for (const product of list.filter((p) => p.owned)) {
                setOwned.mutate({ id: product.id, owned: false }, { onError: notifyError })
              }
            } else if (first) {
              setOwned.mutate({ id: first.id, owned: true }, { onError: notifyError })
            } else {
              createProduct.mutate(
                { ingredientId, name: ingredientName, owned: true },
                { onError: notifyError },
              )
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={14} aria-hidden="true" />}
          onClick={() => {
            setEditing({ product: null })
          }}
        >
          {td.addBottle}
        </Button>
      </div>
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
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <Toggle
                  label={t.bottle.ownedLabel(name)}
                  hideLabel
                  checked={product.owned}
                  onCheckedChange={(owned) => {
                    setOwned.mutate({ id: product.id, owned }, { onError: notifyError })
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body text-fg">{name}</span>
                  {details.length > 0 ? (
                    <span className="nums text-small text-fg-muted">{details.join(' · ')}</span>
                  ) : null}
                  {product.source === 'off' ? (
                    <span className="text-caption text-fg-muted">{t.offAttribution}</span>
                  ) : null}
                </div>
                {product.owned ? (
                  <span className="text-caption font-semibold text-status-ok">{t.bottle.owned}</span>
                ) : null}
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t.bottle.edit(name)}
                  icon={<Pencil size={16} aria-hidden="true" />}
                  onClick={() => {
                    setEditing({ product })
                  }}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t.bottle.delete(name)}
                  icon={<Trash2 size={16} aria-hidden="true" />}
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
    </Card>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="m-0 text-caption font-medium tracking-[0.01em] text-fg-muted">{title}</h3>
      {children}
    </div>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-border-strong bg-surface-2 px-2.5 text-caption font-medium text-fg-secondary">
      {children}
    </span>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-nested border border-status-warning/30 bg-status-warning/8 p-3 text-small text-fg">
      <CircleAlert size={16} aria-hidden="true" className="mt-px shrink-0 text-status-warning" />
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
