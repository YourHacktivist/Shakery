import type { Page } from '@playwright/test'

export type PageAudit = {
  viewport: string
  /** Blocks whose content is wider than them without being allowed to scroll. */
  overflow: string[]
  /** Texts under 4.5:1 (3:1 for large ones), on plain backgrounds. */
  contrast: string[]
  /** Controls a screen reader cannot name. */
  unnamed: string[]
}

/** What can be measured of a screen: fit, contrast (WCAG AA), names of the controls. */
export function auditPage(page: Page): Promise<PageAudit> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const paint = canvas.getContext('2d', { willReadFrequently: true })
    if (!paint) throw new Error('no canvas')
    type Rgba = [number, number, number, number]
    const cache = new Map<string, Rgba>()
    const rgba = (color: string): Rgba => {
      const known = cache.get(color)
      if (known) return known
      paint.clearRect(0, 0, 1, 1)
      paint.fillStyle = color
      paint.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0, a = 0] = paint.getImageData(0, 0, 1, 1).data
      const value: Rgba = [r, g, b, a / 255]
      cache.set(color, value)
      return value
    }
    const over = (top: Rgba, under: Rgba): Rgba => [
      top[0] * top[3] + under[0] * (1 - top[3]),
      top[1] * top[3] + under[1] * (1 - top[3]),
      top[2] * top[3] + under[2] * (1 - top[3]),
      1,
    ]
    const channel = (value: number) => {
      const part = value / 255
      return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
    }
    const luminance = ([r, g, b]: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    const label = (element: Element) =>
      `${element.tagName.toLowerCase()} "${element.textContent.trim().slice(0, 50)}" .${(element.getAttribute('class') ?? '').slice(0, 90)}`

    const overflow: string[] = []
    const contrast: string[] = []
    const unnamed: string[] = []

    for (const element of document.querySelectorAll<HTMLElement>('#root *')) {
      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0 || element.closest('[inert], [aria-hidden="true"]')) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || element.classList.contains('sr-only')) continue

      // A list fades its choice out before the chevron: its frame holds it.
      const clipped =
        style.textOverflow === 'ellipsis' || style.overflowX === 'auto' || element.matches('select')
      if (!clipped && element.clientWidth > 24 && element.scrollWidth > element.clientWidth + 2) {
        overflow.push(label(element))
      }

      if (element.matches('button, a[href], input, select, textarea, [role="button"], [role="switch"]')) {
        const named =
          element.getAttribute('aria-label') ??
          element.getAttribute('aria-labelledby') ??
          element.getAttribute('title') ??
          (element.textContent.trim() ||
            [...((element as HTMLInputElement).labels ?? [])].map((item) => item.textContent).join(''))
        if (!named) unnamed.push(label(element))
      }

      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim()
      if (text === '' || element.closest(':disabled, [aria-disabled="true"]')) continue
      const layers: Rgba[] = []
      let readable = true
      for (let node: Element | null = element; node; node = node.parentElement) {
        const at = getComputedStyle(node)
        // Text on a gradient cannot be measured here: the hero and the copper buttons.
        if (node.matches('.bg-hero, .bg-accent-gradient, .text-copper')) readable = false
        if (at.opacity !== '1') readable = false
        const colour = rgba(at.backgroundColor)
        if (colour[3] > 0) layers.push(colour)
        if (colour[3] === 1) break
      }
      if (!readable) continue
      let background: Rgba = rgba(
        getComputedStyle(document.documentElement).getPropertyValue('--color-bg-base'),
      )
      for (const layer of layers.reverse()) background = over(layer, background)
      const a = luminance(over(rgba(style.color), background))
      const b = luminance(background)
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      const size = parseFloat(style.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700)
      if (ratio < (large ? 3 : 4.5)) contrast.push(`${ratio.toFixed(2)} ${label(element)}`)
    }

    return {
      viewport: `${String(window.innerWidth)}x${String(window.innerHeight)}`,
      overflow,
      contrast,
      unnamed,
    }
  })
}
