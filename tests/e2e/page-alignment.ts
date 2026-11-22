import type { Page } from '@playwright/test'

/**
 * What the eye reads as out of line (D-049), and that `auditPage` does not see: neighbours that
 * share neither their centre nor their height, a group of controls broken into ragged rows, a
 * button whose words are cut or fall on two lines.
 */
export function auditAlignment(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const scope = [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.querySelector('#root')
    if (!scope) return ['nothing on screen']

    const shown = (element: Element) => {
      const box = element.getBoundingClientRect()
      if (box.width < 4 || box.height < 4) return false
      if (element.closest('[inert], [aria-hidden="true"], .sr-only')) return false
      const style = getComputedStyle(element)
      return style.visibility !== 'hidden' && Number(style.opacity) > 0.05
    }
    const bordered = (element: Element) => Number.parseFloat(getComputedStyle(element).borderTopWidth) > 0
    const nameOf = (element: Element) =>
      (element.getAttribute('aria-label') ?? element.textContent).replace(/\s+/g, ' ').trim().slice(0, 48)

    /** The box one sees: for a field, the frame around it. */
    const frameOf = (element: Element): Element => {
      if (!element.matches('input, select')) return element
      let node = element.parentElement
      for (let up = 0; node && up < 2; up += 1) {
        if (node.getBoundingClientRect().height > 46) break
        if (bordered(node)) return node
        node = node.parentElement
      }
      return element
    }

    const controls = new Map<Element, { name: string; box: DOMRect; button: boolean }>()
    const query = 'button, a[href], input:not([type="checkbox"]), select, [role="radiogroup"]'
    for (const element of scope.querySelectorAll(query)) {
      if (!shown(element)) continue
      const group = element.closest('[role="radiogroup"]')
      if (group && group !== element) continue
      const frame = frameOf(element)
      const style = getComputedStyle(frame)
      const drawn =
        bordered(frame) ||
        !['rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor) ||
        style.backgroundImage !== 'none'
      if (!drawn && group !== element) continue
      const around = element.parentElement
      // The buttons inside the frame of a field are part of that field.
      if (
        element.matches('button') &&
        around &&
        around.getBoundingClientRect().height <= 34 &&
        bordered(around) &&
        around.querySelector('input')
      ) {
        continue
      }
      controls.set(frame, {
        name: nameOf(element),
        box: frame.getBoundingClientRect(),
        button: element.matches('button, a'),
      })
    }

    const problems = new Set<string>()
    for (const [first, a] of controls) {
      for (const [second, b] of controls) {
        if (first === second || first.contains(second) || second.contains(first)) continue
        if (a.box.height > 48 || b.box.height > 48) continue
        const gap = b.box.left - a.box.right
        if (gap < -1 || gap > 40) continue
        const common = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
        if (common < Math.min(a.box.height, b.box.height) * 0.4) continue
        const centres = Math.abs(a.box.top + a.box.height / 2 - (b.box.top + b.box.height / 2))
        if (centres > 1.2) problems.add(`centres ${centres.toFixed(1)} px apart: ${a.name} | ${b.name}`)
        // On either side of the edge of the sidebar, only the centres meet.
        else if (first.closest('aside') === second.closest('aside')) {
          if (Math.abs(a.box.height - b.box.height) > 1.2) {
            problems.add(`heights ${String(a.box.height)} and ${String(b.box.height)}: ${a.name} | ${b.name}`)
          }
        }
      }
    }

    for (const box of scope.querySelectorAll('*')) {
      const style = getComputedStyle(box)
      if (!style.display.includes('flex') || style.flexWrap !== 'wrap' || !shown(box)) continue
      const items = [...box.children].filter(shown)
      if (!items.some((item) => controls.has(item) || item.querySelector('button, input, select'))) continue
      let bottom = -Infinity
      let rows = 0
      for (const item of items.map((child) => child.getBoundingClientRect()).sort((p, q) => p.top - q.top)) {
        if (item.top >= bottom - 2) rows += 1
        bottom = Math.max(bottom, item.bottom)
      }
      if (rows > 1) problems.add(`controls on ${String(rows)} ragged rows: ${nameOf(box)}`)
    }

    const range = document.createRange()
    for (const [element, control] of controls) {
      if (!control.button) continue
      if (element.scrollWidth > element.clientWidth + 2) problems.add(`cut: ${control.name}`)
      if (control.box.height > 48) continue
      const texts = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      for (let node = texts.nextNode(); node; node = texts.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('.sr-only')) continue
        range.selectNodeContents(node)
        const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)))
        if (lines.size > 1) problems.add(`on two lines: ${control.name}`)
      }
    }
    return [...problems]
  })
}
