import { normalizeName } from '@core/normalize'
import type { HelpSection, HelpTopicId, HelpTopic } from '@renderer/i18n/fr/help'

export type HelpMatch = { readonly topic: HelpTopicId; readonly section: HelpSection }

/**
 * The entries holding every word typed, accents and case aside, with the topic and the section
 * they come from. The topic being read comes first. A section two topics share is listed once.
 */
export function searchHelp(
  topics: Readonly<Record<HelpTopicId, HelpTopic>>,
  query: string,
  first: HelpTopicId,
): HelpMatch[] {
  const words = normalizeName(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  const ids = Object.keys(topics) as HelpTopicId[]
  const seen = new Set<HelpSection>()
  const matches: HelpMatch[] = []
  for (const topic of [first, ...ids.filter((id) => id !== first)]) {
    for (const section of topics[topic].sections) {
      if (seen.has(section)) continue
      seen.add(section)
      const items = section.items.filter((item) => {
        const text = normalizeName(`${section.title} ${item.term} ${item.text}`)
        return words.every((word) => text.includes(word))
      })
      if (items.length > 0) matches.push({ topic, section: { title: section.title, items } })
    }
  }
  return matches
}
