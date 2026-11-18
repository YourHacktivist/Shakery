import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useOverlayStore } from '@renderer/app/stores'
import { getShortcut, isEditableTarget, isTypeaheadTarget, matchShortcut } from '@renderer/lib/shortcuts'

function isModalOpen(): boolean {
  return document.querySelector('dialog[open]') !== null
}

/** Position in the session history, kept by React Router in `history.state.idx`. */
function historyIndex(): number {
  const state: unknown = window.history.state
  if (typeof state === 'object' && state !== null && 'idx' in state && typeof state.idx === 'number') {
    return state.idx
  }
  return 0
}

/**
 * Global shortcuts of the shell (registry in lib/shortcuts.ts). Nothing fires while the
 * focus is in a text field, except Escape and Ctrl combinations. One keydown listener,
 * no timer.
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    function goBack() {
      if (historyIndex() > 0) void navigate(-1)
      else if (pathname !== '/') void navigate('/')
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Already used by a menu, a list or a dialog of the page.
      if (event.defaultPrevented || event.repeat) return
      const id = matchShortcut(event)
      if (!id || !getShortcut(id).available) return

      const overlays = useOverlayStore.getState()
      const editable = isEditableTarget(event.target)

      switch (id) {
        case 'palette':
          event.preventDefault()
          if (overlays.current === 'palette') overlays.close()
          else overlays.open('palette')
          return
        case 'quickIdea':
          event.preventDefault()
          overlays.open('quickIdea')
          return
        case 'newRecipe':
          event.preventDefault()
          overlays.close()
          void navigate('/recipes/new')
          return
        case 'help':
          if (editable || isModalOpen()) return
          event.preventDefault()
          overlays.open('shortcuts')
          return
        case 'prepMode': {
          // From an open recipe only (section 10.12).
          const recipe = /^\/recipes\/([^/]+)$/.exec(pathname)?.[1]
          if (!recipe || recipe === 'new' || isModalOpen()) return
          event.preventDefault()
          void navigate(`/prepare/${recipe}`)
          return
        }
        case 'typeToSearch':
          if (editable || isModalOpen() || isTypeaheadTarget(event.target)) return
          event.preventDefault()
          overlays.open('palette', event.key)
          return
        case 'back':
          // An open dialog closes itself on Escape (components/Dialog.tsx).
          if (isModalOpen()) return
          // First Escape leaves the field, so a typo never throws away what was typed.
          if (editable && event.target instanceof HTMLElement) {
            event.target.blur()
            return
          }
          goBack()
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate, pathname])
}
