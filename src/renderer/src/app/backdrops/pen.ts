/**
 * The pen of the backdrops (D-046): strokes of an engraving, written as SVG path data. Three
 * weights only (outline, detail, hatching), drawn at one pixel or less whatever the size.
 * Deterministic: the same drawing at each launch, computed once.
 */

export type Point = readonly [x: number, y: number]
/** `solid` is an outline that hides what was drawn before it. */
export type Weight = 'line' | 'fine' | 'faint' | 'solid'
export type Drawing = ReadonlyArray<{
  readonly weight: Weight
  readonly d: string
  /** An SVG transform, for the parts drawn upright then turned. */
  readonly transform?: string
}>

const TAU = Math.PI * 2
/** Turn between two seeds of a sunflower: an even scatter without any chance in it. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

const n = (value: number) => String(Math.round(value * 10) / 10)

export function polar(cx: number, cy: number, r: number, angle: number): Point {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

export class Pen {
  private readonly parts: Array<{ weight: Weight; d: string; transform?: string }> = []
  private transform: string | undefined

  /** Raw path data, joined with the previous one of the same weight and place. */
  path(weight: Weight, d: string): this {
    // Never joined across a solid: the order is what hides.
    const solid = this.parts.findLastIndex((part) => part.weight === 'solid')
    const last =
      weight === 'solid'
        ? undefined
        : this.parts
            .slice(solid + 1)
            .findLast((part) => part.weight === weight && part.transform === this.transform)
    if (last) last.d += d
    else this.parts.push({ weight, d, ...(this.transform ? { transform: this.transform } : {}) })
    return this
  }

  /** Draws in a frame moved to a point and turned by some degrees. */
  at(x: number, y: number, degrees: number, draw: () => void): this {
    const outer = this.transform
    const own = `translate(${n(x)} ${n(y)}) rotate(${n(degrees)})`
    this.transform = outer ? `${outer} ${own}` : own
    draw()
    this.transform = outer
    return this
  }

  drawing(): Drawing {
    return this.parts
  }

  poly(weight: Weight, points: readonly Point[], closed = false): this {
    const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`).join('')
    return this.path(weight, closed ? `${d}Z` : d)
  }

  segment(weight: Weight, x1: number, y1: number, x2: number, y2: number): this {
    return this.path(weight, `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`)
  }

  ellipse(weight: Weight, cx: number, cy: number, rx: number, ry: number): this {
    const half = `A${n(rx)} ${n(ry)} 0 1 1`
    return this.path(
      weight,
      `M${n(cx - rx)} ${n(cy)}${half} ${n(cx + rx)} ${n(cy)}${half} ${n(cx - rx)} ${n(cy)}Z`,
    )
  }

  circle(weight: Weight, cx: number, cy: number, r: number): this {
    return this.ellipse(weight, cx, cy, r, r)
  }

  /** Part of an ellipse, angles in radians, clockwise from the right. */
  arc(weight: Weight, cx: number, cy: number, rx: number, ry: number, from: number, to: number): this {
    const steps = Math.max(6, Math.ceil(Math.abs(to - from) * 12))
    const points = Array.from({ length: steps + 1 }, (_, index): Point => {
      const angle = from + ((to - from) * index) / steps
      return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]
    })
    return this.poly(weight, points)
  }

  rect(weight: Weight, x: number, y: number, width: number, height: number, radius = 0): this {
    const r = Math.min(radius, width / 2, height / 2)
    const corner = (toX: number, toY: number) => (r > 0 ? `A${n(r)} ${n(r)} 0 0 1 ${n(toX)} ${n(toY)}` : '')
    return this.path(
      weight,
      `M${n(x + r)} ${n(y)}H${n(x + width - r)}${corner(x + width, y + r)}V${n(y + height - r)}` +
        `${corner(x + width - r, y + height)}H${n(x + r)}${corner(x, y + height - r)}V${n(y + r)}` +
        `${corner(x + r, y)}Z`,
    )
  }

  /** Short strokes around a centre: a dial, a rind, rays. */
  ticks(weight: Weight, cx: number, cy: number, from: number, to: number, count: number, turn = 0): this {
    for (let index = 0; index < count; index += 1) {
      const angle = turn + (index * TAU) / count
      const [x1, y1] = polar(cx, cy, from, angle)
      const [x2, y2] = polar(cx, cy, to, angle)
      this.segment(weight, x1, y1, x2, y2)
    }
    return this
  }

  /** Vertical hatching kept inside an ellipse. */
  hatch(weight: Weight, cx: number, cy: number, rx: number, ry: number, gap = 6): this {
    for (let x = -rx + gap; x < rx; x += gap) {
      const half = ry * Math.sqrt(1 - (x / rx) ** 2) * 0.85
      this.segment(weight, cx + x, cy - half, cx + x, cy + half)
    }
    return this
  }

  /** Slanted hatching kept inside a box. */
  shade(weight: Weight, x: number, y: number, width: number, height: number, gap = 6): this {
    for (let offset = gap; offset < width + height; offset += gap) {
      const start = Math.max(0, offset - height)
      const end = Math.min(width, offset)
      this.segment(weight, x + start, y + offset - start, x + end, y + offset - end)
    }
    return this
  }

  /** Lines of writing, the last one shorter. */
  writing(weight: Weight, x: number, y: number, width: number, count: number, gap = 9): this {
    for (let index = 0; index < count; index += 1) {
      const share = index === count - 1 ? 0.6 : 1 - ((index * 7) % 5) * 0.04
      this.segment(weight, x, y + index * gap, x + width * share, y + index * gap)
    }
    return this
  }

  bubbles(weight: Weight, cx: number, cy: number, rx: number, ry: number, count: number, size = 3): this {
    for (let index = 0; index < count; index += 1) {
      const spread = Math.sqrt((index + 0.5) / count)
      const angle = index * GOLDEN
      const r = size * (0.45 + ((index * 7) % 5) * 0.16)
      this.circle(weight, cx + rx * spread * Math.cos(angle), cy + ry * spread * Math.sin(angle), r)
    }
    return this
  }

  /** The curve a guilloché lathe traces. */
  rosette(
    weight: Weight,
    cx: number,
    cy: number,
    radius: number,
    petals: number,
    depth: number,
    phase = 0,
  ): this {
    const steps = petals * 18
    const points = Array.from({ length: steps }, (_, index): Point => {
      const angle = (index * TAU) / steps
      return polar(cx, cy, radius + depth * Math.sin(petals * angle + phase), angle)
    })
    return this.poly(weight, points, true)
  }

  gear(cx: number, cy: number, radius: number, teeth: number, depth = 10, turn = 0): this {
    const points: Point[] = []
    for (let index = 0; index < teeth; index += 1) {
      for (const [share, r] of [
        [0, radius],
        [0.18, radius + depth],
        [0.5, radius + depth],
        [0.68, radius],
      ] as const) {
        points.push(polar(cx, cy, r, turn + ((index + share) * TAU) / teeth))
      }
    }
    this.poly('line', points, true)
    this.circle('fine', cx, cy, radius - 7)
      .circle('fine', cx, cy, radius * 0.3)
      .circle('line', cx, cy, radius * 0.14)
    const spokes = teeth > 20 ? 6 : 5
    for (let index = 0; index < spokes; index += 1) {
      const angle = turn + (index * TAU) / spokes
      for (const side of [-0.09, 0.09]) {
        const [x1, y1] = polar(cx, cy, radius * 0.3, angle + side * 2)
        const [x2, y2] = polar(cx, cy, radius - 7, angle + side)
        this.segment('fine', x1, y1, x2, y2)
      }
    }
    return this.ticks('faint', cx, cy, radius - 7, radius - 2, teeth * 3)
  }

  /** A peel cut in a spiral: a ribbon round an axis that climbs along y. */
  peel(x: number, y: number, degrees: number, radius: number, turns: number, rise: number): this {
    return this.at(x, y, degrees, () => {
      const steps = Math.round(turns * 28)
      const band = rise * 0.45
      const edge = (offset: number) =>
        Array.from({ length: steps + 1 }, (_, index): Point => {
          const angle = (index * TAU * turns) / steps
          const r = radius * (1 - (index / steps) * 0.3)
          return [r * Math.cos(angle), offset - (rise * angle) / TAU + r * 0.3 * Math.sin(angle)]
        })
      const upper = edge(-band)
      const lower = edge(0)
      this.poly('line', upper).poly('line', lower)
      upper.forEach(([ux, uy], index) => {
        const below = lower[index]
        if (!below) return
        if (index === 0 || index === steps) this.segment('line', ux, uy, below[0], below[1])
        // The rind shows on the front of each turn, the pith behind.
        else if (Math.sin((index * TAU * turns) / steps) > 0) {
          this.segment('faint', ux, uy + band * 0.2, below[0], below[1] - band * 0.2)
        }
      })
    })
  }

  /** A leaf along the x axis of its own frame, with its veins. */
  leaf(x: number, y: number, degrees: number, length: number, width: number): this {
    return this.at(x, y, degrees, () => {
      this.path(
        'line',
        `M0 0C${n(length * 0.25)} ${n(-width)} ${n(length * 0.7)} ${n(-width * 0.8)} ${n(length)} 0` +
          `C${n(length * 0.7)} ${n(width * 0.8)} ${n(length * 0.25)} ${n(width)} 0 0Z`,
      )
      this.segment('fine', 0, 0, length * 0.92, 0)
      for (let share = 0.15; share < 0.8; share += 0.13) {
        const reach = width * 0.62 * Math.sin(Math.PI * Math.min(share + 0.1, 0.95))
        for (const side of [-1, 1]) {
          this.path(
            'faint',
            `M${n(length * share)} 0Q${n(length * (share + 0.07))} ${n(side * reach * 0.4)}` +
              ` ${n(length * (share + 0.14))} ${n(side * reach)}`,
          )
        }
      }
    })
  }

  /** A stem with pairs of leaves growing smaller to its tip. */
  sprig(x: number, y: number, degrees: number, length: number, pairs: number, leaf = 36): this {
    return this.at(x, y, degrees, () => {
      this.path('line', `M0 0Q${n(length * 0.5)} ${n(-length * 0.06)} ${n(length)} 0`)
      for (let index = 0; index < pairs; index += 1) {
        const share = (index + 0.7) / (pairs + 0.4)
        const size = leaf * (1 - share * 0.45)
        const spine = -length * 0.06 * 2 * share * (1 - share)
        this.leaf(length * share, spine, -42, size, size * 0.36)
        this.leaf(length * share, spine, 42, size, size * 0.36)
      }
      this.leaf(length, 0, 0, leaf * 0.55, leaf * 0.2)
    })
  }

  /** A wheel of citrus: rind, segments, vesicles. */
  citrus(cx: number, cy: number, radius: number, segments = 10, turn = 0): this {
    this.circle('line', cx, cy, radius)
      .circle('fine', cx, cy, radius * 0.9)
      .circle('faint', cx, cy, radius * 0.86)
    this.ticks('faint', cx, cy, radius * 0.92, radius * 0.98, segments * 7)
    for (let index = 0; index < segments; index += 1) {
      const from = turn + ((index + 0.1) * TAU) / segments
      const to = turn + ((index + 0.9) * TAU) / segments
      const inner = polar(cx, cy, radius * 0.12, (from + to) / 2)
      this.poly(
        'fine',
        [
          inner,
          polar(cx, cy, radius * 0.72, from),
          polar(cx, cy, radius * 0.82, from + (to - from) * 0.3),
          polar(cx, cy, radius * 0.82, from + (to - from) * 0.7),
          polar(cx, cy, radius * 0.72, to),
        ],
        true,
      )
      for (let grain = 0; grain < 7; grain += 1) {
        const angle = from + (to - from) * (0.28 + ((grain * 3) % 5) * 0.11)
        const [x1, y1] = polar(cx, cy, radius * (0.3 + grain * 0.06), angle)
        const [x2, y2] = polar(cx, cy, radius * (0.37 + grain * 0.06), angle + 0.03)
        this.segment('faint', x1, y1, x2, y2)
      }
    }
    return this.circle('fine', cx, cy, radius * 0.07)
  }

  bottle(
    cx: number,
    base: number,
    shape: {
      width: number
      height: number
      neck: number
      neckHeight: number
      shoulder: number
      label?: 'oval' | 'band' | 'seal'
    },
  ): this {
    const { width, height, neck, neckHeight, shoulder, label } = shape
    const top = base - height
    const under = top + neckHeight
    const body = under + shoulder
    const outline = (inset: number) => {
      const half = width / 2 - inset
      const narrow = Math.max(1.5, neck / 2 - inset)
      const bottom = base - inset
      return (
        `M${n(cx - half)} ${n(bottom - 7)}V${n(body)}` +
        `C${n(cx - half)} ${n(body - shoulder * 0.6)} ${n(cx - narrow)} ${n(under + shoulder * 0.4)} ${n(cx - narrow)} ${n(under)}` +
        `V${n(top + inset)}H${n(cx + narrow)}V${n(under)}` +
        `C${n(cx + narrow)} ${n(under + shoulder * 0.4)} ${n(cx + half)} ${n(body - shoulder * 0.6)} ${n(cx + half)} ${n(body)}` +
        `V${n(bottom - 7)}Q${n(cx + half)} ${n(bottom)} ${n(cx + half - 7)} ${n(bottom)}` +
        `H${n(cx - half + 7)}Q${n(cx - half)} ${n(bottom)} ${n(cx - half)} ${n(bottom - 7)}Z`
      )
    }
    this.path('line', outline(0)).path('faint', outline(4))
    const cap = neck / 2 + 2.5
    this.rect('line', cx - cap, top - 4, cap * 2, 13, 2)
    for (let x = cx - cap + 3; x < cx + cap - 1; x += 3) this.segment('faint', x, top - 2, x, top + 7)
    this.arc('fine', cx, body + 6, width / 2 - 4, 5, 0, Math.PI)
    for (let x = cx + width * 0.24; x < cx + width / 2 - 4; x += 3.5) {
      this.segment('faint', x, body + 14, x, base - 12)
    }
    const middle = body + (base - body) * 0.52
    const half = width / 2 - 6
    if (label === 'band') {
      this.rect('line', cx - half, middle - 26, half * 2, 52)
      this.rect('faint', cx - half + 4, middle - 22, half * 2 - 8, 44)
      this.writing('fine', cx - half + 8, middle - 10, half * 2 - 16, 3)
    } else if (label === 'oval') {
      const high = Math.min(half * 1.35, (base - body) / 2 - 8)
      this.ellipse('line', cx, middle, half, high).ellipse('faint', cx, middle, half - 4, high - 4)
      this.rosette('fine', cx, middle, half * 0.4, 8, 2.5).writing(
        'faint',
        cx - half / 2,
        middle + high * 0.6,
        half,
        2,
        5,
      )
    } else if (label === 'seal') {
      this.circle('line', cx, middle, half * 0.8).ticks('fine', cx, middle, half * 0.6, half * 0.76, 24)
      this.circle('faint', cx, middle, half * 0.44)
    }
    return this
  }

  coupe(cx: number, rim: number, radius: number, depth: number, stem: number, level = 0.35): this {
    const lip = radius * 0.16
    this.ellipse('line', cx, rim, radius, lip).ellipse('faint', cx, rim, radius - 4, lip - 1.5)
    const bowl = rim + depth
    this.path(
      'line',
      `M${n(cx - radius)} ${n(rim)}C${n(cx - radius)} ${n(rim + depth * 0.7)} ${n(cx - radius * 0.35)} ${n(bowl)} ${n(cx - 7)} ${n(bowl)}` +
        `H${n(cx + 7)}C${n(cx + radius * 0.35)} ${n(bowl)} ${n(cx + radius)} ${n(rim + depth * 0.7)} ${n(cx + radius)} ${n(rim)}`,
    )
    const surface = rim + depth * level
    const wet = radius * Math.sqrt(1 - level * 0.75) - 5
    this.ellipse('fine', cx, surface, wet, lip * 0.85).hatch('faint', cx, surface, wet, lip * 0.85, 5)
    for (let index = 1; index < 5; index += 1) {
      const y = surface + lip * 0.7 + (bowl - surface - lip) * (index / 5)
      const across = wet * (1 - index / 5.6)
      this.arc('faint', cx, y, across, lip * 0.5, 0.2, Math.PI - 0.2)
    }
    const foot = bowl + stem
    this.path(
      'line',
      `M${n(cx - 5)} ${n(bowl)}Q${n(cx - 3)} ${n(bowl + stem * 0.8)} ${n(cx - radius * 0.46)} ${n(foot)}`,
    )
    this.path(
      'line',
      `M${n(cx + 5)} ${n(bowl)}Q${n(cx + 3)} ${n(bowl + stem * 0.8)} ${n(cx + radius * 0.46)} ${n(foot)}`,
    )
    this.segment('faint', cx, bowl + 6, cx, foot - 8)
    this.arc('line', cx, foot, radius * 0.46, lip * 0.6, 0, Math.PI)
    return this.arc('faint', cx, foot - 3, radius * 0.36, lip * 0.4, 0, Math.PI)
  }
}
