import { useEffect, useRef, useState, type RefObject } from 'react'
import { fr } from '@renderer/i18n/fr'
import { motionReduced } from '@renderer/lib/appearance'
import { cn } from '@renderer/lib/cn'
import { AboutCard } from './AboutCard'
import { AppearanceCard } from './AppearanceCard'
import { BackupsCard } from './BackupsCard'
import { CalculationCard } from './CalculationCard'
import { TransferBlock } from './ExportCard'
import { OffCard } from './OffCard'
import { PrintCard } from './PrintCard'
import { blockElementId, SETTINGS_BLOCKS, type SettingsBlockId } from './SettingsBlock'
import { UpdatesCard } from './UpdatesCard'

const t = fr.settings
/** A block becomes the current one once its title passes this line, in pixels under the top. */
const CURRENT_LINE = 96

/**
 * Settings (section 10.14, D-057): one column of blocks in order of use, and on the left a table
 * of contents that follows the scrolling.
 */
export function SettingsPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const current = useCurrentBlock(rootRef)

  return (
    <div ref={rootRef} className="mx-auto flex w-full max-w-page flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-caption text-fg-muted">{t.subtitle}</span>
        <h1 className="m-0 text-title font-semibold tracking-tight text-fg">{t.title}</h1>
      </header>
      <div className="grid grid-cols-[152px_minmax(0,1fr)] items-start gap-x-10">
        <SettingsToc current={current} />
        <div className="flex min-w-0 flex-col gap-10">
          <AppearanceCard />
          <BackupsCard />
          <TransferBlock />
          <CalculationCard />
          <PrintCard />
          <OffCard />
          <UpdatesCard />
          <AboutCard />
        </div>
      </div>
    </div>
  )
}

/** The block under the top of the scrolling area, the last one once the bottom is reached. */
function useCurrentBlock(rootRef: RefObject<HTMLDivElement | null>): SettingsBlockId {
  const [current, setCurrent] = useState<SettingsBlockId>('appearance')
  useEffect(() => {
    const root = rootRef.current
    const scroller = root?.closest('main')
    if (!root || !scroller) return
    const update = () => {
      const top = scroller.getBoundingClientRect().top + CURRENT_LINE
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      let found: SettingsBlockId = SETTINGS_BLOCKS[0]
      for (const block of SETTINGS_BLOCKS) {
        const element = document.getElementById(blockElementId(block))
        if (element && element.getBoundingClientRect().top <= top) found = block
      }
      setCurrent(atBottom && scroller.scrollTop > 0 ? (SETTINGS_BLOCKS.at(-1) ?? found) : found)
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [rootRef])
  return current
}

/** Text links to the blocks; the current one is marked by the copper hairline of the sidebar. */
function SettingsToc({ current }: { current: SettingsBlockId }) {
  return (
    <nav aria-label={t.toc.label} className="sticky top-0 -mt-[7px]">
      <ul className="m-0 list-none border-l border-border p-0">
        {SETTINGS_BLOCKS.map((block) => {
          const on = block === current
          return (
            <li key={block}>
              <a
                href={`#${blockElementId(block)}`}
                aria-current={on ? 'location' : undefined}
                className={cn(
                  'relative flex h-[30px] items-center rounded-sm pl-3.5 text-body whitespace-nowrap transition-colors duration-150 ease-out-soft',
                  on
                    ? "font-semibold text-fg before:absolute before:top-[7px] before:-left-0.5 before:h-4 before:w-[3px] before:rounded-full before:bg-accent before:shadow-[0_0_10px_rgb(239_120_43/0.8)] before:content-['']"
                    : 'font-medium text-fg-secondary hover:text-fg',
                )}
                onClick={(event) => {
                  // The router reads the hash: the link scrolls the page instead of changing it.
                  event.preventDefault()
                  const target = document.getElementById(blockElementId(block))
                  if (!target) return
                  target.scrollIntoView({ block: 'start', behavior: motionReduced() ? 'auto' : 'smooth' })
                  target.focus({ preventScroll: true })
                }}
              >
                {t.toc[block]}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
