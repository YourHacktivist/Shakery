import {
  MAX_RELEASE_NOTES,
  VERSION_PATTERN,
  type UpdateRelease,
  type UpdateState,
} from '../../shared/domain/updates'

/**
 * Updates from the GitHub releases (D-051). The service keeps the state machine and its
 * rules; the electron-updater calls stay behind `UpdaterPort`, so the rules are tested
 * without network nor installer.
 */

/** What the updater found: the raw release notes come from GitHub as HTML. */
export type FoundRelease = {
  readonly version: string
  readonly notes: unknown
  readonly date: string | null | undefined
}

export interface UpdaterPort {
  /** The newest release when it is newer than the running version, null when up to date. */
  check(): Promise<FoundRelease | null>
  download(onProgress: (percent: number) => void): Promise<void>
  /** Quits, runs the downloaded installer without its windows, then starts Shakery again. */
  install(): void
}

type Logger = {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

export type UpdateServiceDeps = {
  /** null in a development build: nothing to update. */
  readonly port: UpdaterPort | null
  readonly current: string
  readonly now: () => number
  readonly autoCheck: () => boolean
  readonly skippedVersion: () => string | null
  readonly setSkippedVersion: (version: string | null) => void
  /** Verified backup of the notebook, awaited before the installer starts. */
  readonly backup: () => Promise<unknown>
  /** Tells the quit handler that a backup was just made and the installer is waiting. */
  readonly beforeInstall: () => void
  readonly log: Logger
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntity(match: string, body: string): string {
  const named = ENTITIES[body.toLowerCase()]
  if (named !== undefined) return named
  if (body[0] !== '#') return match
  const hex = body[1] === 'x' || body[1] === 'X'
  const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
  const valid = Number.isInteger(code) && code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)
  return valid ? String.fromCodePoint(code) : ''
}

/** Cuts at most `max` UTF-16 units without splitting a surrogate pair. */
function cut(text: string, max: number): string {
  if (text.length <= max) return text
  let end = max - 1
  const last = text.charCodeAt(end - 1)
  if (last >= 0xd800 && last <= 0xdbff) end -= 1
  return `${text.slice(0, end).trimEnd()}…`
}

const BLOCKS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'pre',
  'blockquote',
  'tr',
  'table',
])
const SKIPPED = new Set(['script', 'style'])

/**
 * Drops the tags in one pass, each character read a bounded number of times: a regular
 * expression such as `<[^>]*>` goes quadratic on a text made of `<` alone. A block puts its
 * content on its own lines, a list item starts with a bullet, a `<` without `>` stays as text.
 */
function stripTags(html: string): string {
  const lower = html.toLowerCase()
  let out = ''
  let at = 0
  while (at < html.length) {
    const open = html.indexOf('<', at)
    if (open === -1) {
      out += html.slice(at)
      break
    }
    out += html.slice(at, open)
    const close = html.indexOf('>', open + 1)
    if (close === -1) {
      out += html.slice(open)
      break
    }
    const tag = /^\s*(\/?)\s*([a-z][a-z0-9]{0,15})/i.exec(html.slice(open + 1, Math.min(close, open + 40)))
    const name = tag?.[2]?.toLowerCase() ?? ''
    const closing = tag?.[1] === '/'
    at = close + 1
    if (!closing && SKIPPED.has(name)) {
      // The script or style text goes with its tags.
      const end = lower.indexOf(`</${name}`, at)
      const after = end === -1 ? -1 : html.indexOf('>', end)
      at = after === -1 ? html.length : after + 1
    } else if (name === 'br') out += '\n'
    else if (name === 'li' && !closing) out += '\n• '
    else if (BLOCKS.has(name)) out += '\n'
  }
  return out
}

/**
 * Release notes as plain text: GitHub sends HTML, which is never rendered. Line breaks of
 * paragraphs and list items are kept, every tag is dropped, entities are decoded, control
 * characters are removed and the length is capped.
 */
export function releaseNotesText(raw: unknown): string {
  let html = ''
  if (typeof raw === 'string') html = raw
  else if (Array.isArray(raw)) {
    html = raw
      .map((entry: unknown) => {
        if (typeof entry !== 'object' || entry === null) return ''
        const { version, note } = entry as { version?: unknown; note?: unknown }
        const title = typeof version === 'string' ? `<p>${version}</p>` : ''
        return typeof note === 'string' ? `${title}${note}` : title
      })
      .join('<br>')
  }
  const text = stripTags(html.slice(0, 200_000))
    .replace(/&(#x[0-9a-f]{1,8}|#\d{1,9}|[a-z]{2,8});/gi, decodeEntity)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- control characters are exactly what goes
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cut(text, MAX_RELEASE_NOTES)
}

const OFFLINE =
  /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE|ERR_TIMED_OUT|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN/
/** No release published yet, or a release without its `latest.yml`: nothing to install. */
const NOTHING_PUBLISHED = /No published versions|Unable to find latest version|Cannot find latest\.yml|404/

function messageOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export class UpdateService {
  private state: UpdateState
  private checking: Promise<UpdateState> | null = null

  constructor(private readonly deps: UpdateServiceDeps) {
    this.state = {
      status: deps.port ? 'idle' : 'unsupported',
      current: deps.current,
      release: null,
      skipped: false,
      progress: null,
      error: null,
      checkedAt: null,
    }
  }

  get current(): UpdateState {
    return this.state
  }

  /** At launch, when the setting allows it. Never throws: a failure is in the state. */
  async checkOnLaunch(): Promise<UpdateState> {
    if (!this.deps.port || !this.deps.autoCheck()) return this.state
    return this.check()
  }

  /** Asks GitHub for a newer release. Two calls at once share the same request. */
  check(): Promise<UpdateState> {
    const port = this.deps.port
    if (!port) return Promise.resolve(this.state)
    // A download under way or finished stays as it is.
    if (this.state.status === 'downloading' || this.state.status === 'ready') {
      return Promise.resolve(this.state)
    }
    this.checking ??= this.runCheck(port).finally(() => {
      this.checking = null
    })
    return this.checking
  }

  private async runCheck(port: UpdaterPort): Promise<UpdateState> {
    this.set({ status: 'checking', error: null })
    try {
      const found = await port.check()
      const release = found ? this.toRelease(found) : null
      if (!release) {
        this.set({ status: 'none', release: null, skipped: false, checkedAt: this.deps.now() })
      } else {
        this.set({
          status: 'available',
          release,
          skipped: this.deps.skippedVersion() === release.version,
          checkedAt: this.deps.now(),
        })
      }
    } catch (error) {
      const message = messageOf(error)
      if (NOTHING_PUBLISHED.test(message)) {
        this.deps.log.info(`Update check: nothing published (${message})`)
        this.set({ status: 'none', release: null, skipped: false, checkedAt: this.deps.now() })
      } else {
        this.deps.log.warn(`Update check failed: ${message}`)
        this.set({ status: 'error', error: OFFLINE.test(message) ? 'offline' : 'failed' })
      }
    }
    return this.state
  }

  private toRelease(found: FoundRelease): UpdateRelease | null {
    if (!VERSION_PATTERN.test(found.version)) {
      this.deps.log.warn(`Update check: unreadable version ${JSON.stringify(found.version).slice(0, 80)}`)
      return null
    }
    const time = typeof found.date === 'string' ? Date.parse(found.date) : Number.NaN
    return {
      version: found.version,
      notes: releaseNotesText(found.notes),
      date: Number.isFinite(time) ? time : null,
    }
  }

  /** Starts the download in the background and returns at once with `downloading`. */
  download(): UpdateState {
    const port = this.deps.port
    const release = this.state.release
    if (!port || !release) return this.state
    if (this.state.status !== 'available' && this.state.status !== 'error') return this.state
    this.set({ status: 'downloading', progress: 0, error: null })
    port
      .download((percent) => {
        if (this.state.status !== 'downloading') return
        const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
        this.set({ progress: Math.round(value * 10) / 10 })
      })
      .then(() => {
        this.deps.log.info(`Update ${release.version} downloaded`)
        this.set({ status: 'ready', progress: 100 })
      })
      .catch((error: unknown) => {
        const message = messageOf(error)
        this.deps.log.warn(`Update download failed: ${message}`)
        this.set({ status: 'error', progress: null, error: OFFLINE.test(message) ? 'offline' : 'failed' })
      })
    return this.state
  }

  /**
   * Backs the notebook up, then quits and installs. A failed backup stops here: the
   * installer only runs once the notebook is safe (section 13.3).
   */
  async install(): Promise<void> {
    const port = this.deps.port
    if (!port || this.state.status !== 'ready') return
    this.set({ error: null })
    try {
      await this.deps.backup()
    } catch (error) {
      this.deps.log.warn(`Update not installed, the backup failed: ${messageOf(error)}`)
      this.set({ error: 'backup' })
      return
    }
    this.deps.beforeInstall()
    this.deps.log.info(`Installing update ${this.state.release?.version ?? '?'}`)
    port.install()
  }

  /** « Ignorer cette version »: no window opens by itself for it any more. */
  skip(version: string): UpdateState {
    this.deps.setSkippedVersion(version)
    if (this.state.release?.version === version) this.set({ skipped: true })
    return this.state
  }

  private set(change: Partial<UpdateState>): void {
    this.state = { ...this.state, ...change }
  }
}
