/**
 * Step 3 of the seed pipeline: the official IBA cocktails, read on the IBA website itself so
 * that every recipe is checked against it (section 9). Doses and ingredients are facts; the
 * method is kept only as a reference for the French steps written by hand, never copied.
 *
 * Output: scripts/seed/review/iba-raw.json (one entry per cocktail: slug, name, category,
 * ingredient lines, method and garnish in English), read by build.ts with iba-map.json.
 *
 * Usage: npx tsx scripts/seed/iba.ts [--refresh]
 */
import path from 'node:path'
import { fetchCached, REVIEW_DIR, writeJson } from './lib'

const SITE = 'https://iba-world.com'

export type IbaCocktail = {
  slug: string
  name: string
  category: string
  ingredients: string[]
  method: string
  garnish: string
}

function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8220;|&#8221;/g, '"')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** Lines between a heading and the next known heading. */
function section(lines: string[], heading: string): string[] {
  const start = lines.indexOf(heading)
  if (start < 0) return []
  const out: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (['Ingredients', 'Method', 'Garnish', 'MOST VIEWED COCKTAILS', 'Note', 'Notes'].includes(line)) break
    out.push(line)
  }
  return out
}

async function main(): Promise<void> {
  const slugs = new Set<string>()
  for (let page = 1; page <= 20; page += 1) {
    const url =
      page === 1 ? `${SITE}/cocktails/all-cocktails/` : `${SITE}/cocktails/all-cocktails/page/${page}/`
    const html = (await fetchCached(url, `iba/list-${page}.html`, 'text/html')).toString('utf8')
    const found = [...html.matchAll(/href="https:\/\/iba-world\.com\/iba-cocktail\/([a-z0-9-]+)\/"/g)].map(
      (match) => match[1] ?? '',
    )
    const before = slugs.size
    for (const slug of found) slugs.add(slug)
    if (slugs.size === before) break
  }

  const cocktails: IbaCocktail[] = []
  for (const slug of [...slugs].sort()) {
    const html = (
      await fetchCached(`${SITE}/iba-cocktail/${slug}/`, `iba/${slug}.html`, 'text/html')
    ).toString('utf8')
    const title = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? slug
    const lines = text(html).split('\n')
    // The category is a class of the main element: cocktail-category-the-unforgettables.
    const category = /<main[^>]*cocktail-category-([a-z-]+)/.exec(html)?.[1] ?? ''
    cocktails.push({
      slug,
      name: text(title),
      category,
      ingredients: section(lines, 'Ingredients'),
      method: section(lines, 'Method').join(' '),
      garnish: section(lines, 'Garnish').join(' '),
    })
  }
  await writeJson(path.join(REVIEW_DIR, 'iba-raw.json'), cocktails)
  console.log(`${cocktails.length} IBA cocktails`)
}

void main()
