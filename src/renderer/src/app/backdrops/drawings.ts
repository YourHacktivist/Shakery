/**
 * One engraving per screen (D-046), on a canvas of 600 x 600 that bleeds to the bottom right.
 * Original drawings. The shaker of the logo is never among them: the logo is only ever itself.
 */
import { Pen, polar, type Drawing, type Point, type Weight } from '@renderer/app/backdrops/pen'
import type { SceneId } from '@renderer/app/scenes'

const { PI } = Math

/** Home: the counter at opening time. */
function counter(pen: Pen) {
  for (let ring = 0; ring < 7; ring += 1) {
    pen.rosette('faint', 300, 270, 150 + ring * 17, 24 + ring * 4, 3, ring)
  }
  pen.bottle(150, 500, { width: 92, height: 330, neck: 28, neckHeight: 78, shoulder: 62, label: 'oval' })
  pen.bottle(236, 500, { width: 64, height: 236, neck: 20, neckHeight: 52, shoulder: 34, label: 'band' })
  pen.coupe(398, 262, 100, 78, 152)
  pen.bubbles('fine', 398, 278, 54, 8, 14, 2.6)
  pen.citrus(478, 244, 34, 9)
  pen.peel(326, 254, -24, 25, 2.5, 30)
  pen.segment('line', 40, 500, 590, 500).segment('fine', 40, 508, 590, 508).segment('line', 52, 532, 590, 532)
  for (let x = 60; x < 586; x += 22) pen.path('faint', `M${String(x)} 512q6 8 -3 16`)
  for (let y = 540; y < 600; y += 9) pen.segment('faint', 70 + (y - 540), y, 590, y)
}

/** Recipes: the box of cards behind the bar. */
function cardBox(pen: Pen) {
  for (let index = 0; index < 9; index += 1) {
    pen.at(330 + index * 5, 300 - index * 4, -18 + index * 4.5, () => {
      const front = index === 8
      pen.rect('solid', -130, -190, 260, 190, 6)
      pen.path('faint', `M-130 -160H130`)
      pen.rect('fine', -110 + index * 22, -204, 48, 14, 3)
      if (!front) return
      pen.rect('faint', -123, -183, 246, 176, 4)
      pen.writing('line', -110, -172, 120, 1)
      for (let row = 0; row < 7; row += 1) {
        const y = -144 + row * 18
        pen.writing('fine', -110, y, 120, 1)
        for (let x = 4; x < 70; x += 8) pen.circle('faint', x, y, 0.8)
        pen.segment('fine', 80, y, 112, y)
      }
    })
  }
  pen.poly(
    'solid',
    [
      [140, 340],
      [500, 340],
      [480, 540],
      [160, 540],
    ],
    true,
  )
  pen.poly(
    'fine',
    [
      [150, 350],
      [490, 350],
      [472, 530],
      [168, 530],
    ],
    true,
  )
  pen.poly('line', [
    [500, 340],
    [550, 300],
    [530, 494],
    [480, 540],
  ])
  pen.poly('fine', [
    [140, 340],
    [192, 300],
    [550, 300],
  ])
  for (let index = 1; index < 16; index += 1) {
    pen.path('faint', `M${String(170 + index * 19)} 356q-5 40 0 80t-2 84`)
  }
  pen
    .rect('line', 270, 398, 100, 52, 5)
    .rect('fine', 278, 406, 84, 36, 3)
    .writing('faint', 288, 418, 64, 3, 7)
  pen.arc('line', 320, 474, 30, 20, 0.15, PI - 0.15).arc('fine', 320, 474, 22, 12, 0.15, PI - 0.15)
  for (const [x, y] of [
    [172, 362],
    [468, 362],
    [186, 518],
    [454, 518],
  ] as const) {
    pen.circle('fine', x, y, 5).segment('faint', x - 3, y - 2, x + 3, y + 2)
  }
}

/** A recipe: an old fashioned in cut crystal. */
function cutGlass(pen: Pen) {
  pen.ellipse('line', 290, 210, 152, 30).ellipse('faint', 290, 210, 144, 25)
  pen.path('line', 'M138 210L166 506A124 24 0 0 0 414 506L442 210')
  pen.path('fine', 'M150 226L176 480A114 22 0 0 0 404 480L430 226')
  pen.arc('line', 290, 392, 137, 22, 0, PI).arc('fine', 290, 382, 138, 22, 0, PI)
  // Diamonds cut round the glass: their row follows its curve.
  const facets = 14
  for (let index = 0; index < facets; index += 1) {
    const from = PI - (index * PI) / facets
    const to = PI - ((index + 1) * PI) / facets
    const on = (angle: number, y: number, rx: number): Point => [
      290 + rx * Math.cos(angle),
      y + 22 * Math.sin(angle),
    ]
    const middle = (from + to) / 2
    pen.poly('fine', [on(from, 408, 134), on(middle, 394, 135), on(to, 408, 134), on(middle, 422, 133)], true)
    if (index < facets - 2)
      pen.poly('faint', [on(middle, 426, 133), on(middle - (PI * 2) / facets, 480, 124)])
    if (index > 1) pen.poly('faint', [on(middle, 426, 133), on(middle + (PI * 2) / facets, 480, 124)])
  }
  pen.ellipse('fine', 290, 284, 143, 24)
  for (let x = 170; x < 412; x += 8) {
    const across = Math.sqrt(1 - ((x - 290) / 143) ** 2)
    pen.segment('faint', x, 284 + 24 * across - 6, x, 284 + 24 * across + 14)
  }
  pen.at(282, 300, -9, () => {
    pen.rect('solid', -66, -62, 132, 118, 16).rect('fine', -52, -46, 104, 88, 10)
    pen.segment('fine', -62, -58, -52, -46).segment('fine', 62, -58, 52, -46).segment('fine', 62, 52, 52, 42)
    pen.shade('faint', 16, 4, 34, 36, 6)
    pen.path('faint', 'M-30 -30l18 26l-8 22M-12 -4l24 -10')
  })
  pen.bubbles('faint', 290, 342, 112, 26, 26, 2.2)
  pen.citrus(428, 196, 62, 11, 0.3)
  pen.peel(196, 200, -16, 36, 2.8, 40)
  for (let ring = 0; ring < 4; ring += 1) {
    pen.arc('faint', 290, 516, 170 + ring * 26, 34 + ring * 7, -0.3, PI + 0.3)
  }
}

/** Editor: the pen, the sheet, the jigger. */
function writingDesk(pen: Pen) {
  pen.at(250, 330, -7, () => {
    pen.rect('solid', -170, -210, 330, 420, 6).rect('faint', -160, -200, 310, 400, 4)
    pen.rosette('fine', -5, -150, 22, 9, 3).rosette('faint', -5, -150, 30, 14, 3)
    pen.writing('fine', -70, -108, 130, 1)
    for (let row = 0; row < 15; row += 1) {
      const y = -74 + row * 18
      pen.segment('faint', -144, y, 134, y)
      if (row > 8) continue
      const waves = 5 + ((row * 3) % 4)
      pen.path('fine', `M-138 ${String(y - 3)}${'q6 -8 12 0t12 0'.repeat(waves)}`)
    }
  })
  pen.at(452, 176, 34, () => {
    pen.rect('line', -19, -170, 38, 200, 17)
    pen.segment('fine', -19, -70, 19, -70).segment('fine', -19, -60, 19, -60).segment('line', -19, 18, 19, 18)
    pen.rect('fine', 10, -150, 6, 80, 3)
    for (let x = -13; x < 10; x += 4) pen.segment('faint', x, -52, x, 12)
    pen.path('line', 'M-15 30C-26 70 -12 100 0 140C12 100 26 70 15 30Z')
    pen.path('fine', 'M0 140V84').circle('fine', 0, 78, 6)
    pen.arc('faint', 0, 44, 13, 7, 0, PI).arc('faint', 0, 52, 12, 7, 0, PI)
  })
  pen.at(438, 452, 8, () => {
    pen.ellipse('line', 0, -100, 50, 11).ellipse('fine', 0, 100, 40, 9)
    pen.path('line', 'M-50 -100L-12 6L-40 100M50 -100L12 6L40 100')
    pen.ellipse('fine', 0, 6, 12, 4)
    for (let step = 1; step < 6; step += 1) {
      pen.arc('faint', 0, -100 + step * 18, 50 - step * 6.4, 8, 0.3, PI - 0.3)
    }
    for (let x = 4; x < 32; x += 5) pen.segment('faint', x / 2 + 5, 24, x + 6, 94)
  })
}

/** Lab: the still. */
function still(pen: Pen) {
  pen.ellipse('line', 190, 150, 34, 9)
  pen.path('line', 'M156 150C156 208 120 226 112 254H268C260 226 224 208 224 150')
  pen.rect('line', 104, 254, 172, 16, 4)
  pen.path('line', 'M112 270C62 330 70 448 130 470H250C310 448 318 330 268 270')
  pen.path('faint', 'M124 282C84 334 88 432 138 456H242C292 432 296 334 256 282')
  pen.arc('fine', 190, 368, 114, 16, 0, PI).arc('faint', 190, 378, 113, 16, 0, PI)
  for (let x = 92; x < 290; x += 9) pen.segment('faint', x, 398 + ((x * 7) % 11), x, 432)
  for (let x = 114; x < 270; x += 12) pen.circle('fine', x, 262, 2.4)
  pen.bubbles('faint', 190, 412, 80, 24, 24, 3)
  pen.path('line', 'M156 150C160 96 250 70 420 170M178 141C200 108 268 100 408 182')
  pen.ellipse('line', 190, 104, 30, 8).circle('fine', 190, 88, 8)
  pen.rect('line', 372, 182, 112, 198, 6)
  for (let turn = 0; turn < 8; turn += 1) {
    const y = 200 + turn * 22
    pen.ellipse('fine', 428, y, 40, 10).arc('faint', 428, y + 5, 40, 10, 0, PI)
  }
  for (let y = 194; y < 376; y += 7) pen.segment('faint', 472, y, 482, y)
  pen.path('line', 'M410 380v22h18v-22')
  for (const y of [414, 432, 450]) {
    pen.path('fine', `M419 ${String(y)}c6 8 6 12 0 13c-6 -1 -6 -5 0 -13z`)
  }
  pen.path('line', 'M400 462h38v28l44 72a10 10 0 0 1 -9 14h-108a10 10 0 0 1 -9 -14l44 -72z')
  pen.arc('fine', 419, 536, 48, 7, 0, PI)
  for (let y = 504; y < 566; y += 9) pen.segment('fine', 432, y, 446, y)
  pen.rect('line', 520, 190, 18, 220, 9).circle('line', 529, 426, 17).segment('fine', 529, 420, 529, 280)
  for (let y = 206; y < 396; y += 7) pen.segment('faint', 538, y, y % 5 < 2 ? 556 : 548, y)
  pen.rect('line', 132, 478, 116, 70, 4)
  for (let x = 146; x < 240; x += 18) {
    pen.path('fine', `M${String(x)} 536c-9 -12 4 -20 2 -34c12 12 10 26 -2 34z`)
  }
  pen.segment('line', 50, 576, 590, 576).segment('faint', 50, 582, 590, 582)
}

/** Journal: the wheel of tasting. */
function tastingWheel(pen: Pen) {
  const cx = 316
  const cy = 300
  for (let ring = 1; ring <= 5; ring += 1) {
    pen.circle(ring === 5 ? 'line' : 'faint', cx, cy, ring * 38)
  }
  pen.circle('fine', cx, cy, 208).circle('line', cx, cy, 244)
  pen
    .ticks('fine', cx, cy, 190, 208, 8)
    .ticks('faint', cx, cy, 208, 218, 96)
    .ticks('fine', cx, cy, 208, 244, 16)
  pen.ticks('faint', cx, cy, 22, 190, 8)
  const shapes: ReadonlyArray<readonly [Weight, readonly number[]]> = [
    ['line', [152, 114, 170, 98, 136, 160, 104, 144]],
    ['fine', [114, 152, 120, 138, 92, 118, 146, 108]],
  ]
  for (const [weight, radii] of shapes) {
    const points = radii.map((r, index): Point => polar(cx, cy, r, (index * PI) / 4))
    pen.poly(weight, points, true)
    for (const [x, y] of points) pen.circle(weight, x, y, 4)
  }
  for (let index = 0; index < 8; index += 1) {
    const [x, y] = polar(cx, cy, 226, (index * PI) / 4)
    pen.at(x, y, index * 45 + 90, () => {
      pen.writing('fine', -20, -4, 40, 2, 7)
    })
  }
  for (let layer = 0; layer < 5; layer += 1) pen.rosette('faint', cx, cy, 28, 12, 8, layer * 1.26)
  pen.circle('line', cx, cy, 12)
  pen.coupe(104, 428, 62, 48, 88)
}

/** Notebook: pressed plants on the pages. */
function herbarium(pen: Pen) {
  pen.path('line', 'M310 150C260 118 130 112 72 140V480C130 452 260 458 310 492Z')
  pen.path('line', 'M310 150C360 118 490 112 548 140V480C490 452 360 458 310 492Z')
  for (const edge of [9, 18]) {
    const left = String(72 - edge)
    const right = String(548 + edge)
    const base = String(480 + edge)
    pen.path('faint', `M${left} 150V${base}C130 ${base} 260 466 310 ${String(492 + edge)}`)
    pen.path('faint', `M${right} 150V${base}C490 ${base} 360 466 310 ${String(492 + edge)}`)
  }
  for (let y = 178; y < 470; y += 19) {
    pen.path('faint', `M90 ${String(y - 12)}C150 ${String(y - 28)} 250 ${String(y - 22)} 296 ${String(y)}`)
  }
  for (let y = 156; y < 496; y += 15) pen.ellipse('fine', 310, y, 8, 3)
  pen.sprig(150, 430, -66, 250, 6, 52)
  pen.sprig(232, 438, -82, 150, 4, 34)
  pen.sprig(354, 420, -58, 170, 5, 38)
  pen.citrus(472, 226, 52, 10)
  pen.writing('fine', 380, 388, 130, 4, 14)
  pen.at(466, 330, 12, () => {
    for (let petal = 0; petal < 9; petal += 1) pen.leaf(0, 0, petal * 40, 34, 10)
    pen.circle('line', 0, 0, 7).ticks('faint', 0, 0, 7, 12, 20)
  })
  pen.path('line', 'M350 130v96l12 -12l12 12v-94').shade('faint', 352, 136, 20, 70, 5)
}

/** Bar: the shelves, the glasses hanging above. */
function shelves(pen: Pen) {
  pen.segment('line', 60, 40, 580, 40).segment('fine', 60, 48, 580, 48)
  for (let x = 108; x < 560; x += 92) {
    pen.segment('fine', x, 48, x, 56).ellipse('line', x, 59, 22, 4)
    pen.segment('line', x - 2, 62, x - 4, 104).segment('line', x + 2, 62, x + 4, 104)
    const left = String(x - 4)
    pen.path('line', `M${left} 104C${String(x - 30)} 112 ${String(x - 30)} 138 ${String(x - 26)} 158`)
    pen.path(
      'line',
      `M${String(x + 4)} 104C${String(x + 30)} 112 ${String(x + 30)} 138 ${String(x + 26)} 158`,
    )
    pen.ellipse('fine', x, 158, 26, 5)
    pen.arc('faint', x, 130, 20, 4, 0.2, PI - 0.2)
  }
  type Shelved = readonly [number, number, number, number, number, number, ('oval' | 'band' | 'seal')?]
  const top: Shelved[] = [
    [104, 50, 160, 18, 48, 26, 'band'],
    [166, 62, 128, 22, 22, 22, 'seal'],
    [232, 46, 172, 16, 60, 30, 'oval'],
    [296, 58, 146, 20, 34, 40, 'band'],
    [372, 74, 118, 26, 20, 18, 'oval'],
    [438, 40, 166, 16, 56, 22],
    [500, 60, 150, 20, 40, 34, 'seal'],
    [560, 44, 134, 16, 40, 20, 'band'],
  ]
  const low: Shelved[] = [
    [112, 70, 156, 24, 36, 30, 'oval'],
    [178, 44, 138, 16, 44, 20],
    [242, 66, 176, 22, 46, 44, 'band'],
    [312, 54, 130, 18, 30, 24, 'seal'],
    [376, 52, 168, 18, 58, 26, 'band'],
    [452, 80, 132, 28, 20, 24, 'oval'],
    [524, 48, 170, 16, 52, 32, 'seal'],
  ]
  for (const [base, row] of [
    [352, top],
    [556, low],
  ] as const) {
    for (const [x, width, height, neck, neckHeight, shoulder, label] of row) {
      pen.bottle(x, base, { width, height, neck, neckHeight, shoulder, ...(label ? { label } : {}) })
    }
    pen.rect('line', 56, base, 540, 14)
    for (let x = 64; x < 590; x += 14) pen.path('faint', `M${String(x)} ${String(base + 3)}q8 4 4 9`)
  }
}

/** Preparations: a jar of peels, a syrup, what goes into it. */
function pantry(pen: Pen) {
  pen.rect('solid', 120, 186, 210, 330, 34).rect('faint', 129, 197, 192, 310, 28)
  pen.rect('line', 134, 148, 182, 26, 8).rect('fine', 142, 174, 166, 12)
  pen.path('line', 'M134 162h-18v52h18M316 162h18v52h-18M150 148c10 -44 140 -44 150 0')
  pen.path('fine', 'M156 148c14 -32 124 -32 138 0')
  pen.arc('fine', 225, 250, 96, 12, 0, PI * 2)
  pen
    .citrus(190, 314, 44, 10)
    .citrus(262, 350, 40, 9, 0.4)
    .citrus(198, 408, 38, 10, 0.2)
    .citrus(266, 446, 30, 8)
  pen.bubbles('faint', 225, 370, 84, 110, 34, 2.4)
  for (let y = 270; y < 500; y += 10) pen.segment('faint', 306, y, 318, y - 4)
  pen.bottle(420, 516, { width: 94, height: 250, neck: 26, neckHeight: 64, shoulder: 46, label: 'band' })
  pen.path('fine', 'M407 300c-20 10 -26 30 -14 40c16 -4 20 -24 14 -40z')
  pen.path('faint', 'M433 282c30 8 46 30 40 52')
  pen.at(486, 356, 14, () => {
    pen.poly(
      'line',
      [
        [-22, 0],
        [-10, -16],
        [10, -16],
        [22, 0],
        [22, 58],
        [-22, 58],
      ],
      true,
    )
    pen.circle('fine', 0, -6, 4).writing('faint', -14, 16, 28, 4, 10)
  })
  pen.sprig(470, 520, -28, 130, 4, 34)
  pen.sprig(96, 520, -108, 150, 4, 32)
  for (let index = 0; index < 4; index += 1) {
    pen.at(520 + (index % 2) * 18, 160 + index * 22, 64 + index * 9, () => {
      pen.rect('fine', -50, -6, 100, 12, 6)
      pen.arc('faint', 42, 0, 4, 4, 0, PI * 2).segment('faint', -44, 0, 36, 0)
    })
  }
  pen.segment('line', 60, 524, 590, 524).segment('faint', 60, 530, 590, 530)
}

/** Collections: menus fanned out. */
function menus(pen: Pen) {
  // The middle one last: it lies on the others.
  for (const index of [0, 4, 1, 3, 2]) {
    pen.at(330, 590, (index - 2) * 17, () => {
      const front = index === 2
      pen.rect('solid', -78, -470, 156, 300, 8).rect('fine', -70, -462, 140, 284, 5)
      pen.rect('faint', -65, -457, 130, 274, 3)
      for (const [x, y] of [
        [-65, -457],
        [65, -457],
        [-65, -183],
        [65, -183],
      ] as const) {
        pen.circle('faint', x, y, 9)
      }
      if (index % 2 === 0) pen.coupe(0, -424, 30, 22, 34)
      else pen.rosette('fine', 0, -398, 22, 10, 4).rosette('faint', 0, -398, 30, 16, 3)
      pen.writing('line', -34, -346, 68, 1)
      for (let dish = 0; dish < 4; dish += 1) {
        const y = -318 + dish * 34
        pen.segment('fine', -54, y, 20, y).segment('fine', 40, y, 54, y)
        pen.writing('faint', -54, y + 9, 96, 2, 7)
      }
      if (!front) pen.shade('faint', 48, -452, 14, 260, 7)
    })
  }
  pen.circle('line', 330, 548, 26).rosette('fine', 330, 548, 17, 12, 4).circle('faint', 330, 548, 31)
}

/** Practice: laurels around a medal, cards to learn by. */
function laurels(pen: Pen) {
  const cx = 324
  const cy = 276
  for (const side of [-1, 1]) {
    pen.arc('line', cx, cy, 172, 172, PI / 2 + side * 0.18, PI / 2 + side * 2.55)
    for (let index = 0; index < 11; index += 1) {
      const angle = PI / 2 + side * (0.34 + index * 0.2)
      const [x, y] = polar(cx, cy, 172, angle)
      const along = (angle * 180) / PI + side * 90
      const size = 50 - index * 1.7
      pen.leaf(x, y, along - 32, size, size * 0.34).leaf(x, y, along + 32, size * 0.86, size * 0.28)
    }
  }
  pen.circle('line', cx, cy, 98).circle('fine', cx, cy, 90).ticks('faint', cx, cy, 90, 98, 90)
  for (let layer = 0; layer < 6; layer += 1) pen.rosette('faint', cx, cy, 72, 18, 10, layer * 1.05)
  const star = Array.from({ length: 10 }, (_, index): Point => {
    return polar(cx, cy, index % 2 === 0 ? 44 : 19, -PI / 2 + (index * PI) / 5)
  })
  pen.poly('line', star, true)
  star.forEach(([x, y]) => {
    pen.segment('faint', cx, cy, x, y)
  })
  for (let index = 0; index < 3; index += 1) {
    pen.at(150 + index * 16, 506 - index * 8, -12 + index * 10, () => {
      pen.rect('line', -70, -44, 140, 88, 7)
      if (index < 2) return
      pen.rect('faint', -63, -37, 126, 74, 4).writing('fine', -50, -14, 100, 3, 14)
    })
  }
  pen.path('line', 'M278 448l-18 92l34 -22l26 30l14 -96M370 448l22 92l-34 -20l-20 24')
  pen.shade('faint', 272, 470, 44, 46, 6)
}

/** Calculators: measures. */
function measures(pen: Pen) {
  pen.at(226, 310, -8, () => {
    pen.ellipse('line', 0, -160, 82, 18).ellipse('faint', 0, -160, 75, 14)
    pen.path('line', 'M-82 -160L-18 14L-64 166M82 -160L18 14L64 166')
    pen.ellipse('line', 0, 14, 18, 5).ellipse('fine', 0, 20, 19, 5).arc('line', 0, 166, 64, 14, 0, PI)
    for (let step = 1; step < 7; step += 1) {
      const half = 82 - step * 9.2
      pen.arc(step % 2 === 0 ? 'fine' : 'faint', 0, -160 + step * 25, half, half * 0.2, 0.35, PI - 0.35)
      if (step % 2 === 0) pen.segment('fine', half + 8, -160 + step * 25, half + 26, -160 + step * 25)
    }
    for (let x = 8; x < 52; x += 6) pen.segment('faint', x / 3 + 4, 34, x + 8, 160)
  })
  pen
    .rect('line', 400, 150, 92, 360, 8)
    .ellipse('fine', 446, 150, 46, 10)
    .path('line', 'M400 158l-18 -12l24 -6')
  pen.rect('line', 378, 510, 136, 18, 5)
  for (let step = 0; step < 34; step += 1) {
    const y = 180 + step * 9.6
    const reach = step % 5 === 0 ? 36 : 16
    pen.segment(step % 5 === 0 ? 'fine' : 'faint', 400, y, 400 + reach, y)
  }
  pen.arc('line', 446, 330, 46, 10, 0, PI)
  for (let x = 450; x < 488; x += 7) pen.segment('faint', x, 346, x, 504)
  pen.arc('line', 150, 560, 150, 150, PI, PI * 2).arc('fine', 150, 560, 118, 118, PI, PI * 2)
  for (let mark = 0; mark <= 30; mark += 1) {
    const angle = PI + (mark * PI) / 30
    const [x1, y1] = polar(150, 560, mark % 5 === 0 ? 126 : 138, angle)
    const [x2, y2] = polar(150, 560, 148, angle)
    pen.segment(mark % 5 === 0 ? 'fine' : 'faint', x1, y1, x2, y2)
  }
  const [hx, hy] = polar(150, 560, 110, -0.9)
  pen.segment('line', 150, 560, hx, hy).circle('line', 150, 560, 9).segment('line', 0, 560, 300, 560)
}

/** Settings: the works of a watch. */
function clockwork(pen: Pen) {
  pen.gear(250, 270, 122, 36, 13)
  pen.gear(424, 378, 72, 22, 11, 0.1)
  pen.gear(448, 198, 54, 17, 10, 0.2)
  pen.gear(166, 452, 50, 16, 10)
  pen.gear(526, 486, 40, 13, 9)
  for (let layer = 0; layer < 3; layer += 1) pen.rosette('faint', 250, 270, 76, 20, 7, layer * 2.1)
  pen.circle('line', 338, 340, 224).circle('fine', 338, 340, 232)
  pen.ticks('faint', 338, 340, 232, 242, 120).ticks('fine', 338, 340, 232, 250, 12)
  for (const [x, y] of [
    [250, 270],
    [424, 378],
    [448, 198],
    [166, 452],
  ] as const) {
    pen.circle('fine', x, y, 4).segment('faint', x - 4, y, x + 4, y)
  }
  pen.path('faint', 'M338 340m-30 0a30 30 0 1 0 60 0a24 24 0 1 0 -48 0a18 18 0 1 0 36 0a12 12 0 1 0 -24 0')
}

/** Guide: the compass over the map. */
function compass(pen: Pen) {
  const cx = 324
  const cy = 290
  pen
    .circle('line', cx, cy, 206)
    .circle('fine', cx, cy, 196)
    .circle('fine', cx, cy, 160)
    .circle('faint', cx, cy, 94)
  pen
    .ticks('faint', cx, cy, 196, 206, 180)
    .ticks('fine', cx, cy, 160, 196, 16)
    .ticks('faint', cx, cy, 160, 170, 64)
  for (let index = 15; index >= 0; index -= 1) {
    const main = index % 4 === 0
    const half = index % 2 === 0
    const reach = main ? 186 : half ? 134 : 80
    const angle = -PI / 2 + (index * PI) / 8
    const tip = polar(cx, cy, reach, angle)
    const wide = main ? 30 : half ? 22 : 12
    const left = polar(cx, cy, wide, angle - PI / 4)
    const right = polar(cx, cy, wide, angle + PI / 4)
    pen.poly(half ? 'line' : 'fine', [[cx, cy], left, tip, right], true)
    if (!half) continue
    pen.segment('fine', cx, cy, tip[0], tip[1])
    for (let share = 0.2; share < 0.95; share += 0.075) {
      pen.segment(
        'faint',
        cx + (tip[0] - cx) * share,
        cy + (tip[1] - cy) * share,
        right[0] + (tip[0] - right[0]) * share,
        right[1] + (tip[1] - right[1]) * share,
      )
    }
  }
  pen.circle('line', cx, cy, 13)
  for (let line = 0; line < 5; line += 1) {
    const y = 500 + line * 16
    pen.path('faint', `M60 ${String(y)}q60 -36 130 -6t130 4t130 -10t120 6`)
  }
  for (let dash = 0; dash < 14; dash += 1) {
    const x = 70 + dash * 14
    const y = 120 + Math.sin(dash / 2.2) * 22
    pen.segment('fine', x, y, x + 8, y + Math.cos(dash / 2.2) * 5)
  }
  pen.path('line', 'M268 96l18 18m0 -18l-18 18')
}

const DRAW: Readonly<Record<SceneId, (pen: Pen) => void>> = {
  home: counter,
  recipes: cardBox,
  detail: cutGlass,
  editor: writingDesk,
  lab: still,
  journal: tastingWheel,
  notebook: herbarium,
  bar: shelves,
  preps: pantry,
  collections: menus,
  practice: laurels,
  calculators: measures,
  settings: clockwork,
  guide: compass,
}

const drawn = new Map<SceneId, Drawing>()

/** The engraving of a screen, drawn the first time it is shown. */
export function backdropOf(scene: SceneId): Drawing {
  let drawing = drawn.get(scene)
  if (!drawing) {
    const pen = new Pen()
    DRAW[scene](pen)
    drawing = pen.drawing()
    drawn.set(scene, drawing)
  }
  return drawing
}
