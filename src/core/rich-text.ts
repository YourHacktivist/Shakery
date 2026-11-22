/**
 * The little formatting of the free texts (section 6, D-044): bold, italic and lists, nothing
 * else. The parser makes a tree of plain strings; no HTML ever comes out of it.
 *
 * - `**bold**`, `*italic*` or `_italic_`, only around words: « 2 * 3 », « TAV* » and « mon_fichier »
 *   stay as typed, and so does a mark without its pair. `\*` and `\_` write the sign itself.
 * - A list: lines that start with « - » or « • », or with « 1. » or « 1) ».
 *
 * Linear in the length of the text, whatever is typed.
 */

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'bold' | 'italic'; readonly children: readonly Inline[] }

export type Block =
  | { readonly kind: 'paragraph'; readonly content: readonly Inline[] }
  | { readonly kind: 'bullets'; readonly items: ReadonlyArray<readonly Inline[]> }
  | { readonly kind: 'numbers'; readonly start: number; readonly items: ReadonlyArray<readonly Inline[]> }

type Mark = '**' | '*' | '_'
type Token = {
  readonly text: string
  readonly mark?: Mark
  readonly opens?: boolean
  readonly closes?: boolean
}

const WORD = /[\p{L}\p{N}]/u
const SPACE = /\s/u

/** Letters, and signs that only make sense as text. */
function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let plain = ''
  let at = 0
  while (at < text.length) {
    const char = text.charAt(at)
    const next = text.charAt(at + 1)
    if (char === '\\' && (next === '*' || next === '_')) {
      plain += next
      at += 2
      continue
    }
    if (char !== '*' && char !== '_') {
      plain += char
      at += 1
      continue
    }
    let end = at
    while (text.charAt(end) === char) end += 1
    const size = end - at
    const before = text.charAt(at - 1)
    const after = text.charAt(end)
    const opens = after !== '' && !SPACE.test(after) && !WORD.test(before)
    const closes = before !== '' && !SPACE.test(before) && !WORD.test(after)
    const marks: Mark[] =
      char === '_'
        ? size === 1
          ? ['_']
          : []
        : size === 1
          ? ['*']
          : size === 2
            ? ['**']
            : size === 3
              ? // « ***both*** »: bold outside, italic inside.
                closes && !opens
                ? ['*', '**']
                : ['**', '*']
              : []
    if (marks.length === 0 || (!opens && !closes)) {
      plain += text.slice(at, end)
    } else {
      if (plain !== '') tokens.push({ text: plain })
      plain = ''
      for (const mark of marks) tokens.push({ text: mark, mark, opens, closes })
    }
    at = end
  }
  if (plain !== '') tokens.push({ text: plain })
  return tokens
}

export function parseInline(text: string): Inline[] {
  const tokens = tokenize(text)
  const closerOf = new Map<number, number>()
  const open: Array<{ index: number; mark: Mark }> = []
  const waiting: Record<Mark, number> = { '**': 0, '*': 0, _: 0 }
  tokens.forEach((token, index) => {
    const { mark } = token
    if (!mark) return
    if (token.closes && waiting[mark] > 0) {
      for (;;) {
        const last = open.pop()
        if (!last) break
        waiting[last.mark] -= 1
        // What was opened inside and never closed stays as typed.
        if (last.mark === mark) {
          closerOf.set(last.index, index)
          break
        }
      }
      return
    }
    if (token.opens) {
      open.push({ index, mark })
      waiting[mark] += 1
    }
  })

  const build = (from: number, to: number): Inline[] => {
    const out: Inline[] = []
    let plain = ''
    let index = from
    while (index < to) {
      const token = tokens[index]
      if (!token) break
      const closer = closerOf.get(index)
      if (closer === undefined) {
        plain += token.text
        index += 1
        continue
      }
      if (plain !== '') out.push({ kind: 'text', text: plain })
      plain = ''
      out.push({ kind: token.mark === '**' ? 'bold' : 'italic', children: build(index + 1, closer) })
      index = closer + 1
    }
    if (plain !== '') out.push({ kind: 'text', text: plain })
    return out
  }
  return build(0, tokens.length)
}

const BULLET = /^\s{0,8}[-•]\s+(\S.*)$/u
const NUMBER = /^\s{0,8}(\d{1,3})[.)]\s+(\S.*)$/u

export function parseRichText(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  // `as`: assigned in a closure, which the narrowing does not follow.
  let list = null as { kind: 'bullets' | 'numbers'; start: number; items: Inline[][] } | null
  const endParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', content: parseInline(paragraph.join('\n')) })
    paragraph = []
  }
  const endList = () => {
    if (list) {
      blocks.push(
        list.kind === 'bullets'
          ? { kind: 'bullets', items: list.items }
          : { kind: 'numbers', start: list.start, items: list.items },
      )
    }
    list = null
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      endParagraph()
      endList()
      continue
    }
    const number = NUMBER.exec(line)
    const bullet = number ? null : BULLET.exec(line)
    const item = number?.[2] ?? bullet?.[1]
    if (item === undefined) {
      endList()
      paragraph.push(line)
      continue
    }
    endParagraph()
    const kind = number ? 'numbers' : 'bullets'
    if (list?.kind !== kind) {
      endList()
      list = { kind, start: number ? Number(number[1]) : 1, items: [] }
    }
    list.items.push(parseInline(item))
  }
  endParagraph()
  endList()
  return blocks
}

export function inlineText(nodes: readonly Inline[]): string {
  return nodes.map((node) => (node.kind === 'text' ? node.text : inlineText(node.children))).join('')
}

/** The text as read, without its marks: previews, pictures, excerpts. */
export function plainText(text: string): string {
  return parseRichText(text)
    .map((block) => {
      if (block.kind === 'paragraph') return inlineText(block.content)
      return block.items
        .map((item, index) => {
          const sign = block.kind === 'numbers' ? `${String(block.start + index)}.` : '•'
          return `${sign} ${inlineText(item)}`
        })
        .join('\n')
    })
    .join('\n\n')
}

/** True when the text would not read the same with its formatting shown. */
export function hasFormatting(text: string): boolean {
  return parseRichText(text).some(
    (block) => block.kind !== 'paragraph' || block.content.some((node) => node.kind !== 'text'),
  )
}

export type TextEdit = {
  /** Range replaced in the text. */
  readonly from: number
  readonly to: number
  readonly text: string
  /** Selection once replaced. */
  readonly select: readonly [number, number]
}

/** Puts a mark around the selection, or takes it off. */
export function toggleMark(value: string, start: number, end: number, mark: '**' | '*'): TextEdit {
  let from = start
  let to = end
  // A double click on Windows takes the space after the word: marks never touch a space.
  while (from < to && SPACE.test(value.charAt(from))) from += 1
  while (to > from && SPACE.test(value.charAt(to - 1))) to -= 1
  const size = mark.length
  const selected = value.slice(from, to)
  const signsBefore = /\**$/.exec(value.slice(Math.max(0, from - 4), from))?.[0].length ?? 0
  const signsAfter = /^\**/.exec(value.slice(to, to + 4))?.[0].length ?? 0
  // A single star is there when the run is 1 or 3, a double one when it is 2 or 3.
  const has = (run: number) => (mark === '*' ? run === 1 || run === 3 : run === 2 || run === 3)
  if (has(signsBefore) && has(signsAfter)) {
    return { from: from - size, to: to + size, text: selected, select: [from - size, to - size] }
  }
  return { from, to, text: `${mark}${selected}${mark}`, select: [from + size, to + size] }
}

/** Turns the lines of the selection into a list, or back into lines. */
export function toggleList(value: string, start: number, end: number, kind: 'bullets' | 'numbers'): TextEdit {
  const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  // A selection that ends at the head of a line does not take that line.
  const last = end > start && value.charAt(end - 1) === '\n' ? end - 1 : end
  const stop = value.indexOf('\n', Math.max(last, from))
  const to = stop === -1 ? value.length : stop
  const lines = value.slice(from, to).split('\n')
  const wanted = kind === 'bullets' ? BULLET : NUMBER
  const written = lines.filter((line) => line.trim() !== '')
  const already = written.length > 0 && written.every((line) => wanted.test(line))
  let count = 0
  const text = lines
    .map((line) => {
      if (line.trim() === '' && lines.length > 1) return line
      const bare = NUMBER.exec(line)?.[2] ?? BULLET.exec(line)?.[1] ?? line.trim()
      if (already) return bare
      count += 1
      return kind === 'bullets' ? `- ${bare}` : `${String(count)}. ${bare}`
    })
    .join('\n')
  const caret = from + text.length
  return { from, to, text, select: start === end ? [caret, caret] : [from, caret] }
}
