import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Maximize,
  Pencil,
  Printer,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useLayoutEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { NAV_ITEMS, type ScreenId } from '@renderer/app/navigation'
import { Card } from '@renderer/components/Card'
import { Kbd } from '@renderer/components/Kbd'
import { HelpBlock } from '@renderer/features/help/HelpSections'
import { fr } from '@renderer/i18n/fr'
import type { GuidePageId } from '@renderer/i18n/fr/guide'
import { cn } from '@renderer/lib/cn'

type Entry = { id: GuidePageId; icon: LucideIcon; path: string | null }

const screens: Entry[] = NAV_ITEMS.map(
  ({ id, icon, path }: { id: ScreenId; icon: LucideIcon; path: string }) => ({
    id,
    icon,
    path,
  }),
)

const ENTRIES: readonly Entry[] = [
  { id: 'start', icon: Sparkles, path: null },
  ...screens.flatMap((entry): Entry[] => {
    if (entry.id === 'settings') return []
    if (entry.id !== 'recipes') return [entry]
    return [entry, { id: 'detail', icon: FileText, path: null }, { id: 'editor', icon: Pencil, path: null }]
  }),
  { id: 'prepare', icon: Maximize, path: null },
  { id: 'print', icon: Printer, path: null },
  ...screens.filter((entry) => entry.id === 'settings'),
]

/** The user guide inside the application, one page per screen (section 13.4). */
export function GuidePage() {
  const t = fr.guide
  const [params] = useSearchParams()
  const index = Math.max(
    0,
    ENTRIES.findIndex((entry) => entry.id === params.get('page')),
  )
  const entry = ENTRIES[index] ?? { id: 'start', icon: Sparkles, path: null }
  const page = t.pages[entry.id]
  const previous = ENTRIES[index - 1]
  const next = ENTRIES[index + 1]
  const details = fr.help.topics[entry.id === 'start' ? 'general' : entry.id].sections

  // A long page: the next one starts at its top.
  useLayoutEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
  }, [entry.id])

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="text-caption text-fg-muted">{t.subtitle}</span>
        <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
      </header>
      <div className="grid grid-cols-[216px_minmax(0,1fr)] items-start gap-4">
        <nav aria-label={t.contents} className="sticky top-0">
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {ENTRIES.map(({ id, icon: EntryIcon }) => (
              <li key={id}>
                <Link
                  to={`/guide?page=${id}`}
                  aria-current={id === entry.id ? 'page' : undefined}
                  className={cn(
                    'flex h-8 items-center gap-2.5 rounded-field px-2 text-body transition-colors duration-150',
                    id === entry.id
                      ? 'bg-accent/13 font-semibold text-fg'
                      : 'text-fg-secondary hover:bg-tint/4 hover:text-fg',
                  )}
                >
                  <EntryIcon size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                  {t.pages[id].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Card key={entry.id} as="article" className="animate-rise gap-5 p-8">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="m-0 text-title font-semibold tracking-tight text-fg">{page.title}</h2>
            <p className="m-0 text-lead text-fg-secondary">{page.intro}</p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {page.points.map((point) => (
              <li key={point} className="flex gap-3 text-lead leading-relaxed text-fg">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
          {page.keys.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="m-0 text-caption font-semibold text-fg-muted">{t.keys}</h3>
              {page.keys.map((item) => (
                <p key={item.keys} className="m-0 flex items-center gap-2 text-body text-fg-secondary">
                  <Kbd>{item.keys}</Kbd>
                  {item.does}
                </p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-5 border-t border-border pt-4">
            <h3 className="m-0 text-caption font-semibold text-fg-muted">{t.detail}</h3>
            {details.map((section) => (
              <HelpBlock key={section.title} section={section} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-small font-semibold">
            {previous ? (
              <Link
                to={`/guide?page=${previous.id}`}
                className="flex items-center gap-1.5 text-fg-secondary hover:text-fg"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                {t.previous}
              </Link>
            ) : (
              <span />
            )}
            {entry.path ? (
              <Link to={entry.path} className="text-accent-soft hover:text-accent">
                {t.open}
              </Link>
            ) : null}
            {next ? (
              <Link
                to={`/guide?page=${next.id}`}
                className="flex items-center gap-1.5 text-fg-secondary hover:text-fg"
              >
                {t.next}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
