/** Smallest type of a sheet: below, a second page reads better than a smaller one. */
const SMALLEST = 0.66
const STEP = 0.02

/**
 * A long recipe stays on one page: every size of the sheet is in em, so the type shrinks until
 * the content fits in the height of the paper, which is the min-height of the sheet.
 */
export function fitSheet(sheet: HTMLElement): void {
  sheet.style.fontSize = ''
  const page = parseFloat(getComputedStyle(sheet).minHeight)
  const base = parseFloat(getComputedStyle(sheet).fontSize)
  // Nothing is laid out in the unit tests (jsdom).
  if (!(page > 0) || !(base > 0)) return
  for (let scale = 1 - STEP; scale >= SMALLEST && sheet.offsetHeight > page + 1; scale -= STEP) {
    sheet.style.fontSize = `${String(base * scale)}px`
  }
  fitRules(sheet)
}

/** Only the ruled lines that fit in the room left: no clipping, which PDF readers draw badly. */
function fitRules(sheet: HTMLElement): void {
  const room = sheet.querySelector<HTMLElement>('.sheet-rules')
  if (!room) return
  const lines = [...room.querySelectorAll<HTMLElement>('.sheet-rules-list > span')]
  for (const line of lines) line.hidden = false
  const height = lines[0]?.offsetHeight ?? 0
  const fitting = Math.floor(room.clientHeight / Math.max(height, 1))
  lines.forEach((line, index) => {
    line.hidden = index >= fitting
  })
}
