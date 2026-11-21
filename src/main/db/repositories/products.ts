/** Bottles (section 10.8): the branded products, owned or not, linked to a generic ingredient. */
import { and, asc, eq, isNull } from 'drizzle-orm'
import { productInputSchema, type Product, type ProductInput } from '../../../shared/domain/catalog'
import { DomainError } from '../../errors'
import type { Db, Ids } from '../client'
import { ingredients, products } from '../schema'
import { indexEntity, removeFromIndex } from './search-index'

type ProductRow = typeof products.$inferSelect

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    brand: row.brand,
    name: row.name,
    abv: row.abv,
    volumeMl: row.volumeMl,
    sugarGPerL: row.sugarGPerL,
    acidGPerL: row.acidGPerL,
    barcode: row.barcode,
    purchasePriceCents: row.purchasePriceCents,
    purchasePriceBasis: row.purchasePriceBasis,
    packQuantity: row.packQuantity,
    packUnit: row.packUnit,
    owned: row.owned,
    personalNotes: row.personalNotes,
    allergens: row.allergens as Product['allergens'],
    source: row.source,
  }
}

export class ProductRepository {
  constructor(
    private readonly db: Db,
    private readonly ids: Ids,
  ) {}

  listByIngredient(ingredientId: string): Product[] {
    return this.db
      .select()
      .from(products)
      .where(and(eq(products.ingredientId, ingredientId), isNull(products.deletedAt)))
      .orderBy(asc(products.name))
      .all()
      .map(toProduct)
  }

  get(id: string): Product {
    const row = this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown bottle')
    return toProduct(row)
  }

  create(input: ProductInput): Product {
    const data = productInputSchema.parse(input)
    this.assertIngredient(data.ingredientId)
    const id = this.ids.newId()
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db
        .insert(products)
        .values({ id, createdAt: now, updatedAt: now, ...data })
        .run()
      indexEntity(this.db.$client, 'product', id, {
        title: data.name,
        aliases: [data.brand ?? ''],
        body: [data.personalNotes],
      })
    })
    return this.get(id)
  }

  update(id: string, input: ProductInput): Product {
    const data = productInputSchema.parse(input)
    this.get(id)
    this.assertIngredient(data.ingredientId)
    this.db.transaction(() => {
      this.db
        .update(products)
        .set({ ...data, updatedAt: this.ids.now() })
        .where(eq(products.id, id))
        .run()
      indexEntity(this.db.$client, 'product', id, {
        title: data.name,
        aliases: [data.brand ?? ''],
        body: [data.personalNotes],
      })
    })
    return this.get(id)
  }

  setOwned(id: string, owned: boolean): Product {
    this.get(id)
    this.db.update(products).set({ owned, updatedAt: this.ids.now() }).where(eq(products.id, id)).run()
    return this.get(id)
  }

  delete(id: string): void {
    this.get(id)
    const now = this.ids.now()
    this.db.transaction(() => {
      this.db.update(products).set({ deletedAt: now, updatedAt: now }).where(eq(products.id, id)).run()
      removeFromIndex(this.db.$client, 'product', id)
    })
  }

  private assertIngredient(ingredientId: string): void {
    const row = this.db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(and(eq(ingredients.id, ingredientId), isNull(ingredients.deletedAt)))
      .get()
    if (!row) throw new DomainError('NOT_FOUND', 'Unknown ingredient')
  }
}
