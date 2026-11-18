import { QueryClientProvider } from '@tanstack/react-query'
import { useLayoutEffect, useRef, useState } from 'react'
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from 'react-router'
import { KIT_PATH } from '@renderer/app/navigation'
import { QuickIdeaDialog } from '@renderer/app/QuickIdeaDialog'
import { ShortcutsDialog } from '@renderer/app/ShortcutsDialog'
import { Sidebar } from '@renderer/app/Sidebar'
import { TastingDialog } from '@renderer/app/TastingDialog'
import { useOverlayStore } from '@renderer/app/stores'
import { PaletteHost } from '@renderer/app/PaletteHost'
import { TopBar } from '@renderer/app/TopBar'
import { useGlobalShortcuts } from '@renderer/app/useGlobalShortcuts'
import { Toaster } from '@renderer/components/Toast'
import { KitPage } from '@renderer/dev/KitPage'
import { BarPage } from '@renderer/features/bar/BarPage'
import { CalculatorsPage } from '@renderer/features/calculators/CalculatorsPage'
import { CollectionsPage } from '@renderer/features/collections/CollectionsPage'
import { HomePage } from '@renderer/features/home/HomePage'
import { JournalPage } from '@renderer/features/journal/JournalPage'
import { LabPage } from '@renderer/features/lab/LabPage'
import { NotebookPage } from '@renderer/features/notebook/NotebookPage'
import { PracticePage } from '@renderer/features/practice/PracticePage'
import { PrepsPage } from '@renderer/features/preps/PrepsPage'
import { PrepModePage } from '@renderer/features/prepare/PrepModePage'
import { RecipeDetailPage } from '@renderer/features/recipes/RecipeDetailPage'
import { RecipeEditorPage } from '@renderer/features/recipes/RecipeEditorPage'
import { RecipesPage } from '@renderer/features/recipes/RecipesPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { createQueryClient } from '@renderer/lib/queries'

const SCREENS: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/recipes', element: <RecipesPage /> },
  { path: '/recipes/new', element: <RecipeEditorPage /> },
  { path: '/recipes/:id', element: <RecipeDetailPage /> },
  { path: '/recipes/:id/edit', element: <RecipeEditorPage /> },
  { path: '/lab', element: <LabPage /> },
  { path: '/lab/:id', element: <LabPage /> },
  { path: '/journal', element: <JournalPage /> },
  { path: '/notebook', element: <NotebookPage /> },
  { path: '/bar', element: <BarPage /> },
  { path: '/preps', element: <PrepsPage /> },
  { path: '/collections', element: <CollectionsPage /> },
  { path: '/practice', element: <PracticePage /> },
  { path: '/calculators', element: <CalculatorsPage /> },
  { path: '/settings', element: <SettingsPage /> },
  ...(import.meta.env.DEV ? [{ path: KIT_PATH, element: <KitPage /> }] : []),
  { path: '*', element: <Navigate to="/" replace /> },
]

/**
 * Root of the interface: hash routing works when the page is loaded from file://. A data
 * router, so the editor can hold a navigation while a change is not saved (section 10.1).
 */
export function App() {
  const [queryClient] = useState(createQueryClient)
  // The preparation mode is outside the shell: full screen, no sidebar (section 10.12).
  const [router] = useState(() =>
    createHashRouter([
      { path: '/prepare/:id', element: <PrepModePage /> },
      { element: <Shell />, children: SCREENS },
    ]),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

/** True when the system or the « animations » setting asks for no motion (section 11). */
export function motionReduced(): boolean {
  return (
    document.documentElement.classList.contains('no-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Each new screen rises in (opacity and transform, 220 ms). The page is not remounted, so a
 * screen that only changes its address (the lab after a save) keeps its state.
 */
function usePageEntrance() {
  const ref = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof element.animate !== 'function' || motionReduced()) return
    element.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
  }, [pathname])
  return ref
}

function Shell() {
  useGlobalShortcuts()
  const pageRef = usePageEntrance()
  const overlay = useOverlayStore((state) => state.current)
  const closeOverlay = useOverlayStore((state) => state.close)
  const tasting = useOverlayStore((state) => state.tasting)

  return (
    <div className="flex h-full min-w-[1100px] overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar className="px-4 pt-3 pb-3" />
        <main ref={pageRef} className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-8">
          <Outlet />
        </main>
      </div>
      <PaletteHost />
      <QuickIdeaDialog open={overlay === 'quickIdea'} onClose={closeOverlay} />
      <ShortcutsDialog open={overlay === 'shortcuts'} onClose={closeOverlay} />
      <TastingDialog
        open={overlay === 'tasting'}
        recipeId={tasting.recipeId}
        version={tasting.version}
        onClose={closeOverlay}
      />
      <Toaster />
    </div>
  )
}
