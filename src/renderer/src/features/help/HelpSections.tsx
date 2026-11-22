import type { HelpSection } from '@renderer/i18n/fr/help'

/** One block of help: what is on screen on the left, what it does on the right. */
export function HelpBlock({ section, caption }: { section: HelpSection; caption?: string }) {
  return (
    <section data-help-section={section.title} className="flex flex-col gap-2">
      <h3 className="m-0 flex flex-wrap items-baseline gap-x-2 text-lead font-semibold text-fg">
        {section.title}
        {caption ? <span className="text-caption font-medium text-fg-muted">{caption}</span> : null}
      </h3>
      <dl className="m-0 flex flex-col">
        {section.items.map((item, index) => (
          <div
            key={`${String(index)}:${item.term}`}
            className="grid grid-cols-[168px_minmax(0,1fr)] gap-3 border-t border-border py-2 text-body leading-relaxed"
          >
            <dt className="min-w-0 font-semibold break-words text-fg">{item.term}</dt>
            <dd className="m-0 min-w-0 text-fg-secondary">{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
