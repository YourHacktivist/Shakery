import { X } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useHelpStore, type HelpPlace } from '@renderer/app/help'
import { IconButton } from '@renderer/components/Button'
import { Dialog } from '@renderer/components/Dialog'
import { Input } from '@renderer/components/Input'
import { Select } from '@renderer/components/Select'
import { HelpBlock } from '@renderer/features/help/HelpSections'
import { searchHelp } from '@renderer/features/help/search'
import { fr } from '@renderer/i18n/fr'
import type { HelpTopicId } from '@renderer/i18n/fr/help'

const t = fr.help
const TOPIC_IDS = Object.keys(t.topics) as HelpTopicId[]
const TOPIC_OPTIONS = TOPIC_IDS.map((id) => ({ value: id, label: t.topics[id].title }))

/**
 * The help of the screen (D-048): each field, button, calculation and key, over whatever is open.
 * Mounted last in the shell and in the preparation mode, which is outside of it.
 */
export function HelpDialog() {
  const place = useHelpStore((state) => state.place)
  const close = useHelpStore((state) => state.close)
  return (
    <Dialog open={place !== null} onClose={close} title={t.title} description={t.description} size="xl" bare>
      {place ? <HelpBody place={place} onClose={close} /> : null}
    </Dialog>
  )
}

function HelpBody({ place, onClose }: { place: HelpPlace; onClose: () => void }) {
  const [topicId, setTopicId] = useState<HelpTopicId>(place.topic)
  const [query, setQuery] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const topic = t.topics[topicId]
  const searching = query.trim() !== ''
  const matches = useMemo(() => searchHelp(t.topics, query, topicId), [query, topicId])

  function showSection(title: string) {
    const box = scroller.current
    const block = box?.querySelector<HTMLElement>(`[data-help-section="${CSS.escape(title)}"]`)
    // The box alone moves: scrollIntoView would also move the window behind it.
    if (box && block) box.scrollTop = block.offsetTop - 12
  }

  useLayoutEffect(() => {
    if (place.section !== null) showSection(place.section)
  }, [place.section])

  function toTop() {
    if (scroller.current) scroller.current.scrollTop = 0
  }

  return (
    <div className="flex h-[min(680px,calc(100vh-64px))] min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p data-testid="help-topic" className="m-0 text-heading font-medium text-fg">
              {topic.title}
            </p>
            <p className="m-0 text-body leading-relaxed text-fg-secondary">{topic.intro}</p>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            label={fr.shell.dialog.close}
            icon={<X size={16} aria-hidden="true" />}
            onClick={onClose}
          />
        </div>
        <div className="grid grid-cols-[212px_minmax(0,1fr)] items-end gap-3">
          <Select
            label={t.topic}
            value={topicId}
            options={TOPIC_OPTIONS}
            onChange={(event) => {
              setTopicId(TOPIC_IDS.find((id) => id === event.target.value) ?? topicId)
              setQuery('')
              toTop()
            }}
          />
          <Input
            variant="search"
            data-autofocus=""
            label={t.search}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              toTop()
            }}
          />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[188px_minmax(0,1fr)]">
        <nav aria-label={t.contents} className="min-h-0 overflow-y-auto border-r border-border p-2">
          {searching ? (
            <p role="status" className="m-0 px-2 py-1.5 text-small text-fg-secondary">
              {t.found(matches.reduce((sum, match) => sum + match.section.items.length, 0))}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {topic.sections.map((section) => (
                <li key={section.title}>
                  <button
                    type="button"
                    onClick={() => {
                      showSection(section.title)
                    }}
                    className="w-full cursor-pointer rounded-field px-2 py-1.5 text-left text-small text-fg-secondary transition-colors duration-150 hover:bg-tint/4 hover:text-fg"
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        {/* Focusable, so that the arrows scroll it. */}
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={topic.title}
          className="relative flex min-h-0 flex-col gap-5 overflow-y-auto p-4"
        >
          {searching ? (
            matches.length === 0 ? (
              <p className="m-0 text-body text-fg-secondary">{t.none}</p>
            ) : (
              matches.map((match) => (
                <HelpBlock
                  key={`${match.topic}:${match.section.title}`}
                  section={match.section}
                  caption={t.topics[match.topic].title}
                />
              ))
            )
          ) : (
            topic.sections.map((section) => (
              <HelpBlock key={`${topicId}:${section.title}`} section={section} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
