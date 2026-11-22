/**
 * A recipe to send in a messaging app (section 12.4): Markdown text, or a PNG card drawn on a
 * canvas in the colours of the app, with the logo. Nothing leaves the computer: the text goes
 * to the clipboard or to a file the user chooses.
 */
import logoUrl from '@renderer/assets/logo-160.png'
import { fr } from '@renderer/i18n/fr'
import type { RecipeDetail } from '@shared/domain/catalog'
import { type DisplayUnit, formatDose } from './model'

const t = fr.recipes

export type ShareContext = {
  readonly ingredientName: (id: string) => string
  readonly glass: string | null
  readonly ice: string | null
  /** Display unit of the settings. */
  readonly display?: DisplayUnit
}

/** Family, method, glass and ice, in that order, when known. */
function metaParts(recipe: RecipeDetail, context: ShareContext): string[] {
  return [
    recipe.family ? t.families[recipe.family] : null,
    recipe.method ? t.methods[recipe.method] : null,
    context.glass,
    context.ice,
  ].filter((part): part is string => part !== null && part !== '')
}

function lineParts(recipe: RecipeDetail, context: ShareContext) {
  return recipe.lines.map((line) => {
    const extras = [
      line.isOptional ? t.detail.optional : null,
      line.isGarnish ? t.detail.garnishLine : null,
      line.note,
    ].filter((part): part is string => part !== null && part !== '')
    return {
      dose: formatDose(line, context.display),
      name: context.ingredientName(line.ingredientId),
      extras,
    }
  })
}

/** Markdown special characters written as text. */
function md(text: string): string {
  return text.replace(/([\\`*_[\]<>|#])/g, '\\$1')
}

export function recipeMarkdown(recipe: RecipeDetail, context: ShareContext): string {
  const out: string[] = [`# ${md(recipe.name)}`, '']
  const meta = metaParts(recipe, context)
  if (meta.length > 0) out.push(`*${meta.map(md).join(' · ')}*`, '')
  out.push(`## ${t.detail.sections.lines}`, '')
  for (const line of lineParts(recipe, context)) {
    const extras = line.extras.length > 0 ? ` (${line.extras.map(md).join(', ')})` : ''
    out.push(`- ${line.dose} ${md(line.name)}${extras}`)
  }
  if (recipe.garnish) out.push('', t.share.garnish(md(recipe.garnish)))
  if (recipe.steps.length > 0) {
    out.push('', `## ${t.detail.sections.steps}`, '')
    recipe.steps.forEach((step, index) => out.push(`${String(index + 1)}. ${md(step)}`))
  }
  if (recipe.notes) out.push('', md(recipe.notes))
  out.push('', `_${t.share.footer}_`)
  return `${out.join('\n')}\n`
}

// ---------------------------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------------------------

const WIDTH = 1080
const PAD = 72
const COLORS = {
  background: '#120D0B',
  card: '#1A1310',
  border: 'rgba(255, 235, 220, 0.14)',
  fg: '#F5EFEA',
  secondary: '#B9ADA5',
  muted: '#8E827A',
  accent: '#EF782B',
  accentSoft: '#F4B183',
}
const FONT = 'Manrope, system-ui, sans-serif'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error('Logo not loaded'))
    }
    image.src = src
  })
}

/** Words cut into lines that fit `width`. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let current = ''
    for (const word of paragraph.split(' ')) {
      const next = current === '' ? word : `${current} ${word}`
      if (context.measureText(next).width > width && current !== '') {
        lines.push(current)
        current = word
      } else current = next
    }
    lines.push(current)
  }
  return lines
}

type Block = {
  font: string
  color: string
  lines: string[]
  lineHeight: number
  gapBefore: number
  indent?: number
}

/** The recipe card as a PNG, base64 without the data URL prefix. */
export async function recipeImage(recipe: RecipeDetail, context: ShareContext): Promise<string> {
  await Promise.all([document.fonts.load(`700 56px Manrope`), document.fonts.load(`500 30px Manrope`)]).catch(
    () => undefined,
  )
  const logo = await loadImage(logoUrl).catch(() => null)
  const canvas = document.createElement('canvas')
  const draw = canvas.getContext('2d')
  if (!draw) throw new Error('Canvas unavailable')
  const inner = WIDTH - PAD * 2

  // Measure first: the height follows the content.
  const blocks: Block[] = []
  const measure = (font: string, text: string, width = inner) => {
    draw.font = font
    return wrap(draw, text, width)
  }
  const titleFont = `700 56px ${FONT}`
  blocks.push({
    font: titleFont,
    color: COLORS.fg,
    lines: measure(titleFont, recipe.name, inner - 120),
    lineHeight: 66,
    gapBefore: 0,
  })
  const meta = metaParts(recipe, context)
  if (meta.length > 0) {
    const font = `500 28px ${FONT}`
    blocks.push({
      font,
      color: COLORS.accentSoft,
      lines: measure(font, meta.join('  ·  ')),
      lineHeight: 38,
      gapBefore: 14,
    })
  }
  const doseFont = `600 32px ${FONT}`
  const nameFont = `500 32px ${FONT}`
  const extraFont = `400 24px ${FONT}`
  const lines = lineParts(recipe, context)
  draw.font = doseFont
  const doseWidth = Math.min(260, Math.max(120, ...lines.map((line) => draw.measureText(line.dose).width)))
  const rows = lines.map((line) => ({
    dose: line.dose,
    names: measure(nameFont, line.name, inner - doseWidth - 32),
    extras: line.extras.length > 0 ? measure(extraFont, line.extras.join(', '), inner - doseWidth - 32) : [],
  }))
  const rowsHeight = rows.reduce((sum, row) => sum + row.names.length * 42 + row.extras.length * 32 + 22, 0)
  const tail: Block[] = []
  if (recipe.garnish) {
    const font = `400 28px ${FONT}`
    tail.push({
      font,
      color: COLORS.secondary,
      lines: measure(font, t.share.garnishPlain(recipe.garnish)),
      lineHeight: 38,
      gapBefore: 28,
    })
  }
  if (recipe.steps.length > 0) {
    const font = `400 26px ${FONT}`
    const steps = recipe.steps.flatMap((step, index) => measure(font, `${String(index + 1)}. ${step}`))
    tail.push({ font, color: COLORS.secondary, lines: steps, lineHeight: 36, gapBefore: 24 })
  }
  const blockHeight = (block: Block) => block.gapBefore + block.lines.length * block.lineHeight
  const height =
    PAD * 2 +
    blocks.reduce((sum, block) => sum + blockHeight(block), 0) +
    40 +
    rowsHeight +
    tail.reduce((sum, block) => sum + blockHeight(block), 0) +
    90

  canvas.width = WIDTH
  canvas.height = Math.ceil(height)
  draw.fillStyle = COLORS.background
  draw.fillRect(0, 0, WIDTH, canvas.height)
  draw.fillStyle = COLORS.card
  draw.strokeStyle = COLORS.border
  draw.lineWidth = 2
  draw.beginPath()
  draw.roundRect(24, 24, WIDTH - 48, canvas.height - 48, 36)
  draw.fill()
  draw.stroke()
  draw.fillStyle = COLORS.accent
  draw.fillRect(PAD, PAD - 28, 96, 6)
  if (logo) draw.drawImage(logo, WIDTH - PAD - 88, PAD - 20, 88, 88)

  let y = PAD + 30
  const write = (block: Block, x = PAD) => {
    y += block.gapBefore
    draw.font = block.font
    draw.fillStyle = block.color
    for (const line of block.lines) {
      y += block.lineHeight
      draw.fillText(line, x + (block.indent ?? 0), y - block.lineHeight * 0.25)
    }
  }
  draw.textBaseline = 'alphabetic'
  for (const block of blocks) write(block)
  y += 40
  for (const row of rows) {
    draw.strokeStyle = COLORS.border
    draw.lineWidth = 1
    draw.beginPath()
    draw.moveTo(PAD, y)
    draw.lineTo(WIDTH - PAD, y)
    draw.stroke()
    y += 12
    draw.font = doseFont
    draw.fillStyle = COLORS.accentSoft
    draw.textAlign = 'right'
    draw.fillText(row.dose, PAD + doseWidth, y + 32)
    draw.textAlign = 'left'
    draw.font = nameFont
    draw.fillStyle = COLORS.fg
    row.names.forEach((name, index) => {
      draw.fillText(name, PAD + doseWidth + 32, y + 32 + index * 42)
    })
    y += row.names.length * 42
    draw.font = extraFont
    draw.fillStyle = COLORS.muted
    row.extras.forEach((extra, index) => {
      draw.fillText(extra, PAD + doseWidth + 32, y + 24 + index * 32)
    })
    y += row.extras.length * 32 + 10
  }
  for (const block of tail) write(block)
  draw.font = `600 22px ${FONT}`
  draw.fillStyle = COLORS.muted
  draw.fillText(t.share.footer, PAD, canvas.height - PAD + 10)

  const url = canvas.toDataURL('image/png')
  return url.slice(url.indexOf(',') + 1)
}
