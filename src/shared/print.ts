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
