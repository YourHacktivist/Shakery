import { describe, expect, it } from 'vitest'
import { searchHelp } from '@renderer/features/help/search'
import { fr } from '@renderer/i18n/fr'
import type { HelpTopicId } from '@renderer/i18n/fr/help'
import { SHORTCUTS, shortcutText } from '@renderer/lib/shortcuts'

const topics = fr.help.topics
const ids = Object.keys(topics) as HelpTopicId[]
const plain = (text: string) => text.replaceAll(String.fromCharCode(0xa0), ' ').toLocaleLowerCase('fr')

/**
 * Where each label must be explained, the longest path first. A label of the bar explained in the
 * help of the settings is not explained: the user is not there.
 */
const EXPLAINED_IN: ReadonlyArray<readonly [string, readonly HelpTopicId[]]> = [
  ['home', ['home']],
  ['recipes.list', ['recipes']],
  ['recipes.detail', ['detail']],
  ['recipes.panel', ['detail']],
  ['recipes.sheet', ['detail', 'print']],
  ['recipes.share', ['detail', 'print']],
  ['recipes.editor', ['editor']],
  ['recipes.ingredientDialog', ['editor']],
  ['recipes.lab', ['lab']],
  ['recipes.prepare', ['prepare']],
  ['recipes', ['recipes', 'detail', 'editor']],
  ['journal.dialog', ['general']],
  ['journal.criteria', ['general']],
  ['journal.notebook', ['notebook']],
  ['journal.recipe', ['detail']],
  ['journal.side', ['general']],
  ['journal', ['journal', 'general']],
  ['workshop.preps', ['preps']],
  ['workshop.collections.addToCollection', ['detail']],
  ['workshop.collections', ['collections']],
  ['workshop.practice', ['practice']],
  ['workshop.calculators', ['calculators']],
  ['workshop.bar', ['bar']],
  ['workshop.print', ['print', 'collections']],
  ['bar', ['bar']],
  ['settings', ['settings']],
  ['components.display.diff', ['lab']],
  ['components.display.allergens', ['recipes', 'bar']],
  ['components.display.status', ['recipes', 'detail', 'editor']],
  ['components.display.expiry', ['preps']],
  ['components', ['general']],
  ['shell', ['general']],
  ['onboarding', ['general']],
]

/**
 * Text that is not something to act on or to understand: it already says itself what it means.
 * Anything else must be a term of the help, so a new button without its help fails here.
 */
const SAYS_ITSELF: readonly RegExp[] = [
  // A sentence under a field, or in it while it is empty.
  /(Hint|Placeholder|Note)$|\.hint$/,
  /\.placeholder$/,
  /([.]d|D)escription$/,
  /^onboarding\.steps\.\w+\.text$/,
  /^settings\.(maintenance\.(resetText|trashText)|appearance\.note|off\.attribution|about\.(tagline|licencesText|licencesTitle|sources\..*))$/,
  // What an empty screen or an empty list says.
  /\.(empty|noMatch|emptyCollections|noFavorite|noSelection|manualEmpty)(\.(title|description))?$/,
  /\.(pick|none|noNextStep|neverTasted|noRating|noLines|noSteps|noRecipe|noZone|noBatch|noBottle|noAlias|noFlavor|noAllergen|notUsed|noQuestion|noCollection|noBestBefore|itemsEmpty|historyEmpty|trashEmpty|linkDeleted|unnamed|nothingKeeps)$/,
  /^components\.display\.(table|sparkline)\./,
  // The notebook saves by itself: this word is on no button.
  /^journal\.notebook\.save$/,
  // A message once something happened, an error, or the wait.
  /\.(saved|created|deleted|done|copied|exported|sent|added|removed|finished|discarded|emptied|csvDone|ideaCreated|favoriteAdded|favoriteRemoved|lookupApplied)$/,
  /\.(loading|reading|saving|creating|running|applying|lookupRunning|searching|error|loadError|notFound|invalid|expired|conflict|refused|lookupNotFound|lookupFound|tooMany|costMissing|incomplete|compositionMissing|abvMissing|allergenWarning|freshWarning|compareFull|right|errorPrefix|emptyHint|nameRequired|recipeRequired|basisRequired|packTogether|barcodeInvalid)$/,
  /^recipes\.form\./,
  /^components\.forms\.photo\.problems\./,
  // Titles of the screens and of the shell, and the small capitals over the cards.
  /^(journal|journal\.notebook|bar|settings|recipes\.(list|lab)|workshop\.(preps|collections|practice|calculators))\.title$/,
  /\.(eyebrow|eyebrowNew|subtitle|caption|tagline)$/,
  /^shell\.(brand|nav|keys)\./,
  // Names read by a screen reader for a list or an image that has its block on screen.
  /\.(listLabel|byVersion|region)$/,
  /^shell\.(topbar\.label|palette\.(label|hint\w+)|versionUnknown|shortcuts\.soon)$/,
  /^components\.forms\.photo\.tasting$/,
  // Units written after a number, and the heads of what is printed.
  /\.(units|costBasis)\.\w+$/,
  /\.(outOf|perLitre|abvUnit|densityUnit|shelfLifeUnit)$/,
  /^recipes\.sheet\.(brand|eyebrow|method|glass|ice|volume|garnish|notes)$/,
  /^recipes\.share\.(footer|colleagueHint)$/,
  /^workshop\.preps\.label\.(madeOn|bestBefore|quantity)$/,
  /^workshop\.print\./,
  // The questions of a revision, and the kinds listed by the trash and the import.
  /^workshop\.practice\.prompts\./,
  /^settings\.(maintenance\.kinds|import\.(tables|otherTables))/,
  // Arrows and words of a change that only a screen reader hears.
  /^components\.display\.(stat\.trend|diff\.(becomes|kinds\.unchanged))/,
  // Left from the phases, shown nowhere.
  /\.(labPhase|tastePhase|when|openRecipe|nothingToSave|skipToContent|shelfLifeMissing|recipeDeleted|not_volumetric|missing_yield)$/,
]

/** Choices of a list: named in the text of their field is enough. */
const CHOICE =
  /(formats|modes|kinds|kindOptions|lengths|moments|papers|themes|blurs|ounces|basisOptions|packUnits|sources|confidences|confidenceOptions|reasons|rating|steps|filterPill)\.[\w-]+$|^settings\.maintenance\.resetWord$|^onboarding\.base\.|\.(favorite|noFamily|optional|garnish|allergenOptional)$/

function leaves(value: unknown, path: string, found: Array<[string, string]>): void {
  // A label built around a name is checked on the screens (tests/e2e/help.spec.ts).
  if (typeof value === 'string') found.push([path, value])
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, path ? `${path}.${key}` : key, found)
  }
}

describe('help', () => {
  it('explains every label of every screen, in the help of that screen', () => {
    const { home, recipes, journal, workshop, bar, settings, components, shell, onboarding } = fr
    const labels: Array<[string, string]> = []
    leaves({ home, recipes, journal, workshop, bar, settings, components, shell, onboarding }, '', labels)
    expect(labels.length).toBeGreaterThan(500)

    const unexplained = labels.filter(([path, label]) => {
      if (SAYS_ITSELF.some((rule) => rule.test(path))) return false
      const where = EXPLAINED_IN.find(([prefix]) => path === prefix || path.startsWith(`${prefix}.`))
      if (!where) return true
      const sections = where[1].flatMap((id) => topics[id].sections)
      const wanted = plain(label)
      const named = sections.some(
        (section) =>
          plain(section.title) === wanted || section.items.some((item) => plain(item.term) === wanted),
      )
      if (named) return false
      return !(
        CHOICE.test(path) &&
        sections.some((section) => section.items.some((item) => plain(item.text).includes(wanted)))
      )
    })
    expect(unexplained.map(([path, label]) => `${path} = ${label}`)).toEqual([])
  })

  it('gives each shortcut with the keys the application listens to', () => {
    const section = topics.general.sections.find((entry) => entry.title === fr.shell.shortcuts.title)
    for (const shortcut of SHORTCUTS) {
      const entry = section?.items.find((item) => item.term === fr.shell.shortcuts.items[shortcut.id])
      expect(entry, shortcut.id).toBeDefined()
      expect(plain(entry?.text ?? ''), shortcut.id).toContain(plain(shortcutText(shortcut.id)))
    }
  })

  it.each(ids)('%s is tidy: no empty block, no title twice, no long dash', (id) => {
    const topic = topics[id]
    const titles = topic.sections.map((section) => section.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const section of topic.sections) {
      expect(section.items.length, section.title).toBeGreaterThan(0)
      const terms = section.items.map((item) => item.term)
      expect(new Set(terms).size, `${section.title}: ${terms.join(', ')}`).toBe(terms.length)
      for (const text of [section.title, ...terms, ...section.items.map((item) => item.text)]) {
        expect(text.trim()).not.toBe('')
        expect(text).not.toContain(String.fromCharCode(0x2014))
      }
    }
  })

  it('finds a word without its accents, the screen being read first, each block once', () => {
    const found = searchHelp(topics, 'allergenes', 'bar')
    expect(found[0]?.topic).toBe('bar')
    expect(found.filter((match) => match.section.title === 'Les quatorze allergènes')).toHaveLength(1)
    expect(searchHelp(topics, '   ', 'home')).toEqual([])
    expect(searchHelp(topics, 'zzqx', 'home')).toEqual([])
  })
})
