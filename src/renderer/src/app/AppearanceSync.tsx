import { useEffect } from 'react'
import { applyTheme, currentTheme } from '@renderer/lib/appearance'
import { useSettings } from '@renderer/lib/queries'

/** Puts the saved appearance on <html> (theme, animations, performance mode). */
export function AppearanceSync() {
  const settings = useSettings()
  const theme = settings.data?.['appearance.theme']
  const animations = settings.data?.['appearance.animations']

  useEffect(() => {
    if (theme && theme !== currentTheme()) applyTheme(theme)
  }, [theme])

  const performance = settings.data?.['appearance.performance']

  useEffect(() => {
    if (animations === undefined || performance === undefined) return
    const root = document.documentElement
    root.classList.toggle('no-motion', !animations || performance)
    root.classList.toggle('performance', performance)
  }, [animations, performance])

  return null
}
