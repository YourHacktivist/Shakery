/**
 * Proposed name of a file the user saves (PDF, Markdown, CSV, image, archive), built from a
 * recipe or collection name typed freely. Windows refuses some characters and device names,
 * and an invisible direction mark could disguise the extension: all of them go.
 */
const FORBIDDEN = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
/** Device names that Windows keeps for itself, with or without an extension. */
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i
const MAX_CHARACTERS = 100

export function safeFileName(name: string, fallback = 'Shakery'): string {
  let kept = ''
  for (const char of name.normalize('NFC')) {
    const code = char.codePointAt(0) ?? 0
    if (code < 32 || code === 0x7f || FORBIDDEN.has(char)) kept += ' '
    else if (/\p{Cf}/u.test(char) || (code >= 0xd800 && code <= 0xdfff)) continue
    else kept += char
  }
  // Whole characters only: an emoji is never cut in two.
  let base = Array.from(kept.replace(/\s+/g, ' ').trim()).slice(0, MAX_CHARACTERS).join('')
  // Windows drops trailing dots and spaces itself, and a name made of them is empty.
  base = base.replace(/[. ]+$/, '')
  if (base === '') return fallback
  const stem = base.split('.')[0]?.trim() ?? ''
  return RESERVED.test(stem) ? `${base}_` : base
}
