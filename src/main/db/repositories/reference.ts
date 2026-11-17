import { asc, isNull } from 'drizzle-orm'
import type { Category, Glass, IceType, ReferenceRepository } from '../../../shared/domain/reference'
import type { Db } from '../client'
import { categories, glasses, iceTypes } from '../schema'

export class SqliteReferenceRepository implements ReferenceRepository {
  constructor(private readonly db: Db) {}

  listGlasses(): Glass[] {
    return this.db
      .select({
        id: glasses.id,
        name: glasses.name,
        capacityMl: glasses.capacityMl,
        sortOrder: glasses.sortOrder,
      })
      .from(glasses)
      .where(isNull(glasses.deletedAt))
      .orderBy(asc(glasses.sortOrder), asc(glasses.name))
      .all()
  }

  listIceTypes(): IceType[] {
    return this.db
      .select({ id: iceTypes.id, name: iceTypes.name, sortOrder: iceTypes.sortOrder })
      .from(iceTypes)
      .where(isNull(iceTypes.deletedAt))
      .orderBy(asc(iceTypes.sortOrder), asc(iceTypes.name))
      .all()
  }

  listCategories(): Category[] {
    const rows = this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        batchHint: categories.batchHint,
      })
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .all()
    return sortTree(rows)
  }
}

/** Depth-first order: each parent, then its children by sort order. Orphans come last. */
export function sortTree(rows: Category[]): Category[] {
  const children = new Map<string | null, Category[]>()
  for (const row of rows) {
    const list = children.get(row.parentId) ?? []
    list.push(row)
    children.set(row.parentId, list)
  }
  const out: Category[] = []
  const seen = new Set<string>()
  const visit = (parentId: string | null): void => {
    for (const row of children.get(parentId) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      out.push(row)
      visit(row.id)
    }
  }
  visit(null)
  for (const row of rows) if (!seen.has(row.id)) out.push(row)
  return out
}
