import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useMatch,
  type RouteObject,
} from 'react-router'
import { AppearanceSync } from '@renderer/app/AppearanceSync'
import { KIT_PATH } from '@renderer/app/navigation'
import { QuickIdeaDialog } from '@renderer/app/QuickIdeaDialog'
import { AppError, ScreenError } from '@renderer/app/RouteError'
import { ShortcutsDialog } from '@renderer/app/ShortcutsDialog'
import { SceneBackdrop, sceneOf, type SceneId } from '@renderer/app/scenes'
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
import { GuidePage } from '@renderer/features/guide/GuidePage'
import { HelpDialog } from '@renderer/features/help/HelpDialog'
import { HomePage } from '@renderer/features/home/HomePage'
import { JournalPage } from '@renderer/features/journal/JournalPage'
import { LabPage } from '@renderer/features/lab/LabPage'
import { NotebookPage } from '@renderer/features/notebook/NotebookPage'
import { Onboarding } from '@renderer/features/onboarding/OnboardingDialog'
import { PracticePage } from '@renderer/features/practice/PracticePage'
import { PrepsPage } from '@renderer/features/preps/PrepsPage'
import { PrepModePage } from '@renderer/features/prepare/PrepModePage'
import { RecipeDetailPage } from '@renderer/features/recipes/RecipeDetailPage'
import { PrintRecipeDialog } from '@renderer/features/recipes/PrintRecipeDialog'
import { UpdateHost } from '@renderer/features/updates/UpdateDialog'
import { RecipeEditorPage } from '@renderer/features/recipes/RecipeEditorPage'
import { RecipesPage } from '@renderer/features/recipes/RecipesPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { createQueryClient } from '@renderer/lib/queries'
import { BatchPrint } from '@renderer/print/BatchPrint'
import { CollectionPrint } from '@renderer/print/CollectionPrint'
import { LabelPrint } from '@renderer/print/LabelPrint'
import { RecipePrint } from '@renderer/print/RecipePrint'

/** Longest choreography of a screen, delays included. */
const ENTRANCE_MS = 900

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
  { path: '/guide', element: <GuidePage /> },
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
      {
        // A failure anywhere shows a way back instead of an empty window.
        errorElement: <AppError />,
        children: [
          { path: '/prepare/:id', element: <PrepModePage /> },
          { path: '/print/collection/:id', element: <CollectionPrint /> },
          { path: '/print/recipe/:id', element: <RecipePrint /> },
          { path: '/print/batch/:id', element: <BatchPrint /> },
          { path: '/print/label/:id/:batchId', element: <LabelPrint /> },
          // A screen that fails keeps the shell around it.
          { element: <Shell />, children: [{ errorElement: <ScreenError />, children: SCREENS }] },
        ],
      },
    ]),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <AppearanceSync />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

/**
 * The screen and the moment it is entering, for its choreography (styles/scenes.css). The
 * virtual list mounts rows while scrolling: they only animate during the entrance.
 */
function useScene() {
  const { pathname } = useLocation()
  const scene = sceneOf(pathname)
  const [settled, setSettled] = useState<SceneId | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettled(scene)
    }, ENTRANCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [scene])
  return { scene, entering: settled !== scene }
}

function Shell() {
  useGlobalShortcuts()
  const { scene, entering } = useScene()
  const shownRecipe = useMatch('/recipes/:id')?.params.id ?? null
  const overlay = useOverlayStore((state) => state.current)
  const closeOverlay = useOverlayStore((state) => state.close)
  const tasting = useOverlayStore((state) => state.tasting)

  return (
    // Clipped, not hidden: a hidden box can still be scrolled by a focus or scrollIntoView, and the
    // top bar would leave the window for good.
    <div className="app-shell flex h-full overflow-clip">
      <Sidebar />
      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        <SceneBackdrop scene={scene} />
        <TopBar className="window-controls-space h-12 shrink-0 pl-4" />
        <main
          data-scene={scene}
          data-entering={entering ? '' : undefined}
          className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-2 pb-8"
        >
          <Outlet />
        </main>
      </div>
      <PaletteHost />
      <Onboarding />
      <QuickIdeaDialog open={overlay === 'quickIdea'} onClose={closeOverlay} />
      <ShortcutsDialog open={overlay === 'shortcuts'} onClose={closeOverlay} />
      <TastingDialog
        open={overlay === 'tasting'}
        recipeId={tasting.recipeId}
        version={tasting.version}
        onClose={closeOverlay}
      />
      <PrintRecipeDialog recipeId={overlay === 'print' ? shownRecipe : null} onClose={closeOverlay} />
      <HelpDialog />
      <UpdateHost />
      <Toaster />
    </div>
  )
}
