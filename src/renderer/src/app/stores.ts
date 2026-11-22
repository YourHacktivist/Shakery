import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type SidebarState = {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
}

export const SIDEBAR_STORAGE_KEY = 'shakery.sidebar'

/** Sidebar folded to icons or not, remembered on this computer (localStorage). */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => {
        set((state) => ({ collapsed: !state.collapsed }))
      },
      setCollapsed: (collapsed) => {
        set({ collapsed })
      },
    }),
    {
      name: SIDEBAR_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
)

/** Floating elements owned by the shell. Only one is open at a time. */
export type Overlay = 'palette' | 'quickIdea' | 'shortcuts' | 'tasting' | 'print'

type OverlayState = {
  current: Overlay | null
  /** Text already in the palette search when it opens. */
  paletteQuery: string
  open: (overlay: Overlay, paletteQuery?: string) => void
  /** Recipe and version proposed by the tasting dialog, when it opens from a recipe. */
  tasting: { recipeId: string | null; version: number | null }
  openTasting: (recipeId?: string | null, version?: number | null) => void
  close: () => void
}

/**
 * Opens the palette, the quick idea or the shortcuts panel from anywhere:
 * `useOverlayStore.getState().open('quickIdea')`.
 */
export const useOverlayStore = create<OverlayState>()((set) => ({
  current: null,
  paletteQuery: '',
  open: (overlay, paletteQuery = '') => {
    set({ current: overlay, paletteQuery })
  },
  tasting: { recipeId: null, version: null },
  openTasting: (recipeId = null, version = null) => {
    set({ current: 'tasting', paletteQuery: '', tasting: { recipeId, version } })
  },
  close: () => {
    set({ current: null, paletteQuery: '' })
  },
}))
