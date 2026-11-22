/**
 * Shape of the detailed help (D-048). The terms are the labels of the screens themselves, taken
 * from their own string files, so a renamed button is renamed in its help.
 */

const NBSP = String.fromCharCode(0xa0)

/** French spacing: no-break before : ; ! ? » % and €, and inside the guillemets. */
export function french(text: string): string {
  return text.replace(/ ([:;!?»%€])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`)
}

export type HelpItem = {
  /** A field, a button, a block or a key, named as on screen. */
  readonly term: string
  readonly text: string
}

export type HelpSection = {
  readonly title: string
  readonly items: readonly HelpItem[]
}

export type HelpTopic = {
  readonly title: string
  readonly intro: string
  readonly sections: readonly HelpSection[]
}

export function item(term: string, text: string): HelpItem {
  return { term, text: french(text) }
}

export function section(title: string, ...items: HelpItem[]): HelpSection {
  return { title: french(title), items }
}

export function topic(title: string, intro: string, ...sections: HelpSection[]): HelpTopic {
  return { title, intro: french(intro), sections }
}
