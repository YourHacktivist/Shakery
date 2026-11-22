import { useMemo, type ReactNode } from 'react'
import { parseInline, parseRichText, type Inline } from '@core/rich-text'
import { cn } from '@renderer/lib/cn'

function render(nodes: readonly Inline[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === 'text') return node.text
    return node.kind === 'bold' ? (
      <strong key={index} className="font-bold">
        {render(node.children)}
      </strong>
    ) : (
      // Manrope has no italic face: the browser slants it.
      <em key={index} className="italic">
        {render(node.children)}
      </em>
    )
  })
}

/** Bold and italic of a single line (a step), as React text, never HTML (section 6). */
export function InlineText({ text }: { text: string }) {
  const nodes = useMemo(() => parseInline(text), [text])
  return <>{render(nodes)}</>
}

/** A free text with its bold, italic and lists (section 6, D-044), in the type of its parent. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseRichText(text), [text])
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 [overflow-wrap:anywhere]', className)}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={index} className="m-0 whitespace-pre-wrap">
              {render(block.content)}
            </p>
          )
        }
        const items = block.items.map((item, at) => (
          <li key={at} className="pl-0.5">
            {render(item)}
          </li>
        ))
        return block.kind === 'bullets' ? (
          <ul key={index} className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            {items}
          </ul>
        ) : (
          <ol key={index} start={block.start} className="nums m-0 flex list-decimal flex-col gap-0.5 pl-6">
            {items}
          </ol>
        )
      })}
    </div>
  )
}
