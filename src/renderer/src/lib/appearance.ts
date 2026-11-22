/**
 * Appearance of the interface (D-038): theme, animations, and the circular reveal of a theme
 * switch. The theme is also kept in localStorage, so that the first paint already has it; the
 * setting in the database stays the reference.
 */
import type { SettingValue } from '@shared/settings'

export type Theme = SettingValue<'appearance.theme'>

export const THEME_STORAGE_KEY = 'shakery.theme'
const REVEAL_MS = 520

/** True when the system or the « animations » setting asks for no motion (section 11). */
export function motionReduced(): boolean {
  return (
    document.documentElement.classList.contains('no-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function currentTheme(): Theme {
  return document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

/** Before the first render: the last theme used, and the platform for the title bar. */
export function prepareDocument(): void {
  const root = document.documentElement
  root.dataset['theme'] = localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  root.dataset['platform'] = navigator.userAgent.includes('Macintosh') ? 'mac' : 'other'
}

/** The new theme grows as a circle from the button that was pressed. */
export function revealTheme(theme: Theme, origin: { x: number; y: number }): void {
  if (typeof document.startViewTransition !== 'function' || motionReduced()) {
    applyTheme(theme)
    return
  }
  const transition = document.startViewTransition(() => {
    applyTheme(theme)
  })
  const { x, y } = origin
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${String(x)}px ${String(y)}px)`,
            `circle(${String(radius)}px at ${String(x)}px ${String(y)}px)`,
          ],
        },
        {
          duration: REVEAL_MS,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    // A skipped transition (hidden window, second click) has already applied the theme.
    .catch(() => undefined)
}
