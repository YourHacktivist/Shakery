import { app, shell, type Session } from 'electron'
import { log } from './logger'
import { buildCsp, isAllowedExternalUrl, isTrustedRendererUrl, type RendererTarget } from './security-policy'

function describeUrl(raw: string): string {
  try {
    const url = new URL(raw)
    return `${url.protocol}//${url.host}`
  } catch {
    return '(invalid url)'
  }
}

/**
 * Applies to every WebContents created by the app (main window, future print windows):
 * no new window, no navigation outside the application, no <webview>.
 */
export function hardenAllWebContents(target: RendererTarget): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      log.warn(`Blocked window.open to ${describeUrl(url)}`)
      return { action: 'deny' }
    })

    const guardNavigation = (event: { preventDefault: () => void }, url: string): void => {
      if (isTrustedRendererUrl(url, target)) return
      event.preventDefault()
      log.warn(`Blocked navigation to ${describeUrl(url)}`)
    }
    contents.on('will-navigate', guardNavigation)
    contents.on('will-redirect', guardNavigation)
    contents.on('will-frame-navigate', (event) => {
      guardNavigation(event, event.url)
    })

    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
      log.warn('Blocked <webview> attachment')
    })
  })
}

/** Permissions denied by default, strict CSP header, downloads refused. */
export function hardenSession(session: Session, devServerOrigin: string | null): void {
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    log.info(`Denied permission request: ${permission}`)
    callback(false)
  })
  session.setPermissionCheckHandler(() => false)
  session.setDevicePermissionHandler(() => false)

  const csp = devServerOrigin ? buildCsp('development', { devServerOrigin }) : buildCsp('production')
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
        'X-Content-Type-Options': ['nosniff'],
      },
    })
  })

  session.on('will-download', (event) => {
    event.preventDefault()
    log.warn('Blocked download')
  })
}

/** Opens an attribution or licence link in the system browser, after validation. */
export async function openExternalSafely(url: string): Promise<boolean> {
  if (!isAllowedExternalUrl(url)) {
    log.warn(`Refused external link to ${describeUrl(url)}`)
    return false
  }
  await shell.openExternal(url)
  return true
}
