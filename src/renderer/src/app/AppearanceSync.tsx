import { useEffect } from 'react'
import { applyTheme, currentTheme } from '@renderer/lib/appearance'
import { useSettings } from '@renderer/lib/queries'

/** Puts the saved appearance on <html> (theme, animations), once the settings are read. */
export function AppearanceSync() {
  const settings = useSettings()
  const theme = settings.data?.['appearance.theme']
  const animations = settings.data?.['appearance.animations']

  useEffect(() => {
    if (theme && theme !== currentTheme()) applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (animations !== undefined) document.documentElement.classList.toggle('no-motion', !animations)
  }, [animations])

  return null
}
