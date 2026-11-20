/**
 * Search over recipes, ingredients and bottles (section 12.1), through the FTS5 table kept by
 * the repositories (search-index.ts).
 *
 * - Fewer than three characters: prefix on the normalized names and aliases.
 * - Otherwise: FTS5 trigram MATCH, on the whole text as one phrase, then on its terms in any
 *   order. The typed text is never passed raw: it is normalized, and the phrase and each term
 *   are quoted with their quotes doubled, which neutralizes OR, NOT, NEAR, *, ^ and quotes
 *   (section 6).
 * - Ranking: exact name, prefix, alias, then content; bonus for favourites, recipes in progress
 *   and recently viewed items.
 * - Nothing found: bounded Damerau-Levenshtein on names and aliases (core/fuzzy.ts).
 */
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { fuzzyScore } from '../../../core/fuzzy'
import { normalizeName } from '../../../core/normalize'
import type { Db, Ids } from '../client'
import { categories, ingredients, products, recentViews, recipes } from '../schema'

export type SearchEntity = 'recipe' | 'ingredient' | 'product'

export type SearchMatch = 'exact' | 'prefix' | 'alias' | 'content' | 'fuzzy'

export type SearchHit = {
  entityType: SearchEntity
  id: string
  title: string
  /** Category of an ingredient, ingredient of a bottle; null for a recipe. */
  detail: string | null
  /** Status of a recipe, null otherwise. */
  status: string | null
  /** The ingredient a bottle belongs to, to open it in Mon bar. */
  parentId: string | null
  match: SearchMatch
}

type Row = { entityType: string; id: string; title: string; aliases: string }

const TIER: Record<SearchMatch, number> = { exact: 0, prefix: 1, alias: 2, content: 3, fuzzy: 4 }
const RECENT_DAYS = 30
const FUZZY_CANDIDATES = 100
const DAY = 24 * 60 * 60 * 1000

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** « negroni " OR * » becomes « "negroni" "or" » : only quoted terms reach MATCH. */
export function toMatchQuery(normalized: string): string | null {
  const terms = normalized
    .split(' ')
    .map((term) => term.replace(/[^\p{L}\p{N}'-]/gu, ''))
    .filter((term) => term.length >= 3)
  if (terms.length === 0) return null
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(' ')
}

/**
 * The normalized text as a single FTS5 string: the trigram tokenizer finds it as a substring,
 * punctuation included. Only the quote is special inside a string, and it is doubled.
 */
export function toPhraseQuery(normalized: string): string {
  return `"${normalized.replaceAll('"', '""')}"`
}

function matchOf(query: string, row: Row): SearchMatch {
  if (row.title === query) return 'exact'
  if (row.title.startsWith(query)) return 'prefix'
  const aliases = row.aliases === '' ? [] : row.aliases.split(' | ')
  if (aliases.some((alias) => alias === query || alias.startsWith(query))) return 'alias'
  return 'content'
}

export class SearchRepository {
  constructor(private readonly db: Db) {}

  search(text: string, limit = 20, now = Date.now()): SearchHit[] {
    const query = normalizeName(text)
    if (query === '') return []
    const sqlite = this.db.$client
    let rows: Row[]
    if (query.length < 3) {
      const prefix = `${escapeLike(query)}%`
      rows = sqlite
        .prepare(
          `SELECT entity_type AS entityType, entity_id AS id, title, aliases FROM search_index
           WHERE entity_type IN ('recipe', 'ingredient', 'product')
             AND (title LIKE ? ESCAPE '\\' OR aliases LIKE ? ESCAPE '\\' OR aliases LIKE ? ESCAPE '\\')
           LIMIT 200`,
        )
        .all(prefix, prefix, `% | ${prefix}`) as Row[]
    } else {
      const statement = sqlite.prepare(
        `SELECT entity_type AS entityType, entity_id AS id, title, aliases FROM search_index
         WHERE search_index MATCH ? AND entity_type IN ('recipe', 'ingredient', 'product')
         ORDER BY rank LIMIT 300`,
      )
      // The whole text as one quoted phrase first: with thousands of classics, a short or
      // punctuated word dropped from the terms (« My Tie », « AT&T », « Daisy No.2 ») would
      // otherwise leave the exact name outside the first rows.
      const phrase = toPhraseQuery(query)
      rows = statement.all(phrase) as Row[]
      const terms = toMatchQuery(query)
      if (terms !== null && terms !== phrase) rows.push(...(statement.all(terms) as Row[]))
    }

    const scored = new Map<string, { row: Row; match: SearchMatch; distance: number; spread: number }>()
    for (const row of rows)
      scored.set(`${row.entityType}:${row.id}`, { row, match: matchOf(query, row), distance: 0, spread: 0 })

    if (scored.size === 0) {
      const all = sqlite
        .prepare(
          `SELECT entity_type AS entityType, entity_id AS id, title, aliases FROM search_index
           WHERE entity_type IN ('recipe', 'ingredient', 'product')`,
        )
        .all() as Row[]
      for (const row of all) {
        const names = [row.title, ...(row.aliases === '' ? [] : row.aliases.split(' | '))]
        let best: number | null = null
        for (const name of names) {
          const score = fuzzyScore(query, name)
          if (score !== null && (best === null || score < best)) best = score
        }
        // Among equally close names, the one whose length is closest to the typed text first:
        // « margarta » gives Margarita before the hundred « … Margarita » of the classics.
        const spread = Math.min(Math.abs(row.title.length - query.length), 9)
        if (best !== null)
          scored.set(`${row.entityType}:${row.id}`, { row, match: 'fuzzy', distance: best, spread })
      }
      // Only the closest candidates are worth reading in detail.
      const kept = [...scored.entries()]
        .sort(([, a], [, b]) => a.distance - b.distance || a.spread - b.spread)
        .slice(0, FUZZY_CANDIDATES)
      scored.clear()
      for (const [key, entry] of kept) scored.set(key, entry)
    }
    if (scored.size === 0) return []

    const hits = this.hydrate([...scored.values()].map((entry) => entry.row))
    const recent = new Set(
      this.db
        .select({ type: recentViews.entityType, id: recentViews.entityId })
        .from(recentViews)
        .where(and(isNull(recentViews.deletedAt), gte(recentViews.viewedAt, now - RECENT_DAYS * DAY)))
        .all()
        .map((row) => `${row.type}:${row.id}`),
    )
    return [...scored.entries()]
      .flatMap(([key, entry]) => {
        const hit = hits.get(key)
        if (!hit) return []
        let bonus = 0
        if (hit.favorite) bonus += 3
        if (hit.hit.status === 'draft' || hit.hit.status === 'testing') bonus += 2
        if (recent.has(key)) bonus += 4
        const sortKey = TIER[entry.match] * 100 + entry.distance * 10 + entry.spread - bonus
        return [{ hit: { ...hit.hit, match: entry.match }, sortKey }]
      })
      .sort((a, b) => a.sortKey - b.sortKey || a.hit.title.localeCompare(b.hit.title, 'fr'))
      .slice(0, limit)
      .map((entry) => entry.hit)
  }

  /** Display names of the hits, live rows only (a deleted row is never returned). */
  private hydrate(rows: readonly Row[]): Map<string, { hit: Omit<SearchHit, 'match'>; favorite: boolean }> {
    const out = new Map<string, { hit: Omit<SearchHit, 'match'>; favorite: boolean }>()
    const ids = (type: string) => rows.filter((row) => row.entityType === type).map((row) => row.id)
    const recipeIds = ids('recipe')
    if (recipeIds.length > 0) {
      for (const row of this.db
        .select({ id: recipes.id, name: recipes.name, status: recipes.status, favorite: recipes.isFavorite })
        .from(recipes)
        .where(and(inArray(recipes.id, recipeIds), isNull(recipes.deletedAt)))
        .all()) {
        out.set(`recipe:${row.id}`, {
          hit: {
            entityType: 'recipe',
            id: row.id,
            title: row.name,
            detail: null,
            status: row.status,
            parentId: null,
          },
          favorite: row.favorite,
        })
      }
    }
    const ingredientIds = ids('ingredient')
    if (ingredientIds.length > 0) {
      for (const row of this.db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          category: categories.name,
          favorite: ingredients.isFavorite,
        })
        .from(ingredients)
        .innerJoin(categories, eq(categories.id, ingredients.categoryId))
        .where(and(inArray(ingredients.id, ingredientIds), isNull(ingredients.deletedAt)))
        .all()) {
        out.set(`ingredient:${row.id}`, {
          hit: {
            entityType: 'ingredient',
            id: row.id,
            title: row.name,
            detail: row.category,
            status: null,
            parentId: null,
          },
          favorite: row.favorite,
        })
      }
    }
    const productIds = ids('product')
    if (productIds.length > 0) {
      for (const row of this.db
        .select({
          id: products.id,
          brand: products.brand,
          name: products.name,
          ingredientId: products.ingredientId,
          ingredient: ingredients.name,
        })
        .from(products)
        .innerJoin(ingredients, eq(ingredients.id, products.ingredientId))
        .where(and(inArray(products.id, productIds), isNull(products.deletedAt)))
        .all()) {
        out.set(`product:${row.id}`, {
          hit: {
            entityType: 'product',
            id: row.id,
            title: row.brand ? `${row.brand} ${row.name}` : row.name,
            detail: row.ingredient,
            status: null,
            parentId: row.ingredientId,
          },
          favorite: false,
        })
      }
    }
    return out
  }

  /** Remembers that an item was opened, for the ranking bonus; keeps the last 500 views. */
  recordView(entityType: SearchEntity, entityId: string, ids: Ids): void {
    const now = ids.now()
    this.db.transaction((tx) => {
      tx.insert(recentViews)
        .values({ id: ids.newId(), createdAt: now, updatedAt: now, entityType, entityId, viewedAt: now })
        .run()
      tx.run(
        sql`DELETE FROM recent_views WHERE id NOT IN (SELECT id FROM recent_views ORDER BY viewed_at DESC LIMIT 500)`,
      )
    })
  }
}
