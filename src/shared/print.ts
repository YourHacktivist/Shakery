/** Title a print template gives its document once its data is on screen (main/services/print.ts). */
export const PRINT_READY_TITLE = 'shakery-print-ready'

export const RECIPE_PAPERS = ['a4', 'a5'] as const
export type RecipePaper = (typeof RECIPE_PAPERS)[number]

export type RecipePrintOptions = { readonly paper: RecipePaper; readonly indicators: boolean }

/** Hash route of the sheet of a recipe, read back by `recipePrintOptions`. */
export function recipePrintRoute(id: string, options: RecipePrintOptions): string {
  return `print/recipe/${encodeURIComponent(id)}?paper=${options.paper}&indicators=${options.indicators ? '1' : '0'}`
}

export function recipePrintOptions(params: { get: (name: string) => string | null }): RecipePrintOptions {
  return { paper: params.get('paper') === 'a5' ? 'a5' : 'a4', indicators: params.get('indicators') !== '0' }
}

export const PRINT_TARGETS = ['pdf', 'printer'] as const
export type PrintTarget = (typeof PRINT_TARGETS)[number]

type Params = { get: (name: string) => string | null }

// ---------------------------------------------------------------------------------------
// Batch (section 10.13, D-042)
// ---------------------------------------------------------------------------------------

export const BATCH_TARGETS = ['servings', 'volume'] as const

export type BatchPrintOptions = {
  readonly target: (typeof BATCH_TARGETS)[number]
  /** Drinks, or millilitres to bottle. */
  readonly amount: number
  readonly stepMl: number
  readonly water: boolean
  readonly garnish: boolean
}

export function batchPrintRoute(id: string, options: BatchPrintOptions): string {
  const query = [
    `target=${options.target}`,
    `amount=${String(options.amount)}`,
    `step=${String(options.stepMl)}`,
    `water=${options.water ? '1' : '0'}`,
    `garnish=${options.garnish ? '1' : '0'}`,
  ].join('&')
  return `print/batch/${encodeURIComponent(id)}?${query}`
}

export function batchPrintOptions(params: Params): BatchPrintOptions {
  const amount = Number(params.get('amount'))
  const step = Number(params.get('step'))
  return {
    target: params.get('target') === 'volume' ? 'volume' : 'servings',
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    stepMl: Number.isFinite(step) && step > 0 ? step : 1,
    water: params.get('water') === '1',
    garnish: params.get('garnish') === '1',
  }
}

// ---------------------------------------------------------------------------------------
// Bottle labels (sections 10.9 and 12.2, D-042)
// ---------------------------------------------------------------------------------------

/** Millimetres. A roll has one label on a page, a sheet a grid of them. */
export type LabelFormatSpec = {
  readonly width: number
  readonly height: number
  readonly page: { readonly width: number; readonly height: number }
  readonly columns: number
  readonly rows: number
  /** Corner of the first label. */
  readonly left: number
  readonly top: number
  /** From a label to the next one. */
  readonly pitchX: number
  readonly pitchY: number
}

export const LABEL_FORMAT_VALUES = ['roll62x29', 'roll89x36', 'roll57x32', 'sheet21', 'sheet8'] as const
export type LabelFormat = (typeof LABEL_FORMAT_VALUES)[number]

const A4 = { width: 210, height: 297 }

function roll(width: number, height: number): LabelFormatSpec {
  const page = { width, height }
  return { width, height, page, columns: 1, rows: 1, left: 0, top: 0, pitchX: width, pitchY: height }
}

export const LABEL_FORMATS: Readonly<Record<LabelFormat, LabelFormatSpec>> = {
  roll62x29: roll(62, 29),
  roll89x36: roll(89, 36),
  roll57x32: roll(57, 32),
  // The common grids of 21 and of 8 labels, centred on the sheet.
  sheet21: {
    width: 63.5,
    height: 38.1,
    page: A4,
    columns: 3,
    rows: 7,
    left: 7.21,
    top: 15.15,
    pitchX: 66.04,
    pitchY: 38.1,
  },
  sheet8: {
    width: 99.1,
    height: 67.7,
    page: A4,
    columns: 2,
    rows: 4,
    left: 4.65,
    top: 13.1,
    pitchX: 101.6,
    pitchY: 67.7,
  },
}

export const MAX_LABELS = 100

export type LabelPrintOptions = {
  readonly format: LabelFormat
  readonly count: number
  /** Labels already used at the head of the first sheet. */
  readonly skip: number
  readonly allergens: boolean
}

export function labelPrintRoute(id: string, batchId: string, options: LabelPrintOptions): string {
  const query = [
    `format=${options.format}`,
    `count=${String(options.count)}`,
    `skip=${String(options.skip)}`,
    `allergens=${options.allergens ? '1' : '0'}`,
  ].join('&')
  return `print/label/${encodeURIComponent(id)}/${encodeURIComponent(batchId)}?${query}`
}

export function labelPrintOptions(params: Params): LabelPrintOptions {
  const format = LABEL_FORMAT_VALUES.find((value) => value === params.get('format')) ?? 'roll62x29'
  const count = Math.floor(Number(params.get('count')))
  const skip = Math.floor(Number(params.get('skip')))
  const { columns, rows } = LABEL_FORMATS[format]
  return {
    format,
    count: count >= 1 ? Math.min(count, MAX_LABELS) : 1,
    skip: skip >= 1 ? Math.min(skip, columns * rows - 1) : 0,
    allergens: params.get('allergens') !== '0',
  }
}

/** Where each label goes, page by page. */
export function labelPages(options: LabelPrintOptions): Array<Array<{ left: number; top: number }>> {
  const spec = LABEL_FORMATS[options.format]
  const perPage = spec.columns * spec.rows
  const pages: Array<Array<{ left: number; top: number }>> = []
  for (let index = options.skip; index < options.skip + options.count; index += 1) {
    const page = Math.floor(index / perPage)
    const slot = index % perPage
    const slots = pages[page] ?? []
    slots.push({
      left: spec.left + (slot % spec.columns) * spec.pitchX,
      top: spec.top + Math.floor(slot / spec.columns) * spec.pitchY,
    })
    pages[page] = slots
  }
  return pages
}
