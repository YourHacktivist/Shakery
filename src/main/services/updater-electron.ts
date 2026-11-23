import { autoUpdater, type ProgressInfo } from 'electron-updater'
import type { FoundRelease, UpdaterPort } from './updates'

type Logger = {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/**
 * electron-updater on the GitHub releases named by `publish` in electron-builder.yml
 * (D-051). It uses its own network session, apart from the hardened session of the
 * window, and checks the SHA-512 of the installer given by `latest.yml`. Only the blocks
 * that changed are downloaded when the previous installer's blockmap is known.
 */
export function electronUpdaterPort(log: Logger): UpdaterPort {
  const updater = autoUpdater
  updater.logger = log
  updater.autoDownload = false
  // Downloaded and not installed yet: the installer runs when Shakery closes.
  updater.autoInstallOnAppQuit = true
  updater.allowPrerelease = false
  updater.allowDowngrade = false

  return {
    async check(): Promise<FoundRelease | null> {
      const result = await updater.checkForUpdates()
      if (!result?.isUpdateAvailable) return null
      const info = result.updateInfo
      return { version: info.version, notes: info.releaseNotes, date: info.releaseDate }
    },
    async download(onProgress) {
      const listener = (progress: ProgressInfo) => {
        onProgress(progress.percent)
      }
      updater.on('download-progress', listener)
      try {
        await updater.downloadUpdate()
      } finally {
        updater.removeListener('download-progress', listener)
      }
    },
    install() {
      // Silent installer (no wizard), then Shakery starts again on the new version.
      updater.quitAndInstall(true, true)
    },
  }
}

/**
 * Development and end-to-end tests only (`SHAKERY_FAKE_UPDATE=0.9.0`, ignored by a
 * packaged build): a release that downloads in about two seconds and never installs.
 */
export function fakeUpdaterPort(version: string, log: Logger): UpdaterPort {
  return {
    check: () =>
      Promise.resolve({
        version,
        notes:
          '<h2>Nouveautés</h2><ul><li>Une fenêtre annonce les nouvelles versions.</li><li>La mise à jour s’installe sans réinstaller Shakery.</li></ul><p>Corrections &amp; finitions.</p>',
        date: new Date().toISOString(),
      }),
    download: async (onProgress) => {
      for (let percent = 0; percent <= 100; percent += 20) {
        onProgress(percent)
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    },
    install: () => {
      log.info(`Fake update ${version}: install skipped`)
    },
  }
}
