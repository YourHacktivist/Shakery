import { create } from 'zustand'
import { sceneOf, type SceneId } from '@renderer/app/scenes'
import type { Overlay } from '@renderer/app/stores'
import { fr } from '@renderer/i18n/fr'
import type { HelpTopicId } from '@renderer/i18n/fr/help'

export type HelpPlace = {
  readonly topic: HelpTopicId
  /** Title of the section to show first. */
  readonly section: string | null
}

/** The topic of a screen. A scene without help does not compile. */
export function helpTopicOf(pathname: string): HelpTopicId {
  if (pathname.startsWith('/prepare/')) return 'prepare'
  const scene: SceneId = sceneOf(pathname)
  return scene
}

/** What is explained: the window of the shell that is open, else the screen. */
export function helpPlaceOf(pathname: string, overlay: Overlay | null): HelpPlace {
  switch (overlay) {
    case 'palette':
      return { topic: 'general', section: fr.shell.palette.title }
    case 'quickIdea':
      return { topic: 'general', section: fr.shell.quickIdea.title }
    case 'tasting':
      return { topic: 'general', section: fr.journal.dialog.title }
    case 'shortcuts':
      return { topic: 'general', section: fr.shell.shortcuts.title }
    case 'print':
      return { topic: 'print', section: fr.recipes.sheet.title }
    case null:
      return { topic: helpTopicOf(pathname), section: null }
  }
}

type HelpState = {
  place: HelpPlace | null
  open: (place: HelpPlace) => void
  close: () => void
}

/**
 * The help is not one of the overlays, of which only one is open: it lies on the window being
 * filled in, which keeps what was typed (D-048).
 */
export const useHelpStore = create<HelpState>()((set) => ({
  place: null,
  open: (place) => {
    set({ place })
  },
  close: () => {
    set({ place: null })
  },
}))
