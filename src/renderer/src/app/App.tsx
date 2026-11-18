import { QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useNavigate,
  type RouteObject,
} from 'react-router'
import { KIT_PATH, NAV_ITEMS } from '@renderer/app/navigation'
import { QuickIdeaDialog } from '@renderer/app/QuickIdeaDialog'
import { ShortcutsDialog } from '@renderer/app/ShortcutsDialog'
import { Sidebar } from '@renderer/app/Sidebar'
import { useOverlayStore } from '@renderer/app/stores'
import { TopBar } from '@renderer/app/TopBar'
import { useGlobalShortcuts } from '@renderer/app/useGlobalShortcuts'
import { CommandPalette, type CommandPaletteGroup } from '@renderer/components/CommandPalette'
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
import { RecipeDetailPage } from '@renderer/features/recipes/RecipeDetailPage'
import { RecipeEditorPage } from '@renderer/features/recipes/RecipeEditorPage'
import { RecipesPage } from '@renderer/features/recipes/RecipesPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { fr } from '@renderer/i18n/fr'
import { createQueryClient } from '@renderer/lib/queries'

const SCREENS: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/recipes', element: <RecipesPage /> },
  { path: '/recipes/new', element: <RecipeEditorPage /> },
  { path: '/recipes/:id', element: <RecipeDetailPage /> },
  { path: '/recipes/:id/edit', element: <RecipeEditorPage /> },
  { path: '/lab', element: <LabPage /> },
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
  const [router] = useState(() => createHashRouter([{ element: <Shell />, children: SCREENS }]))
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function Shell() {
  useGlobalShortcuts()
  const navigate = useNavigate()
  const overlay = useOverlayStore((state) => state.current)
  const paletteQuery = useOverlayStore((state) => state.paletteQuery)
  const closeOverlay = useOverlayStore((state) => state.close)

  const groups = useMemo<CommandPaletteGroup[]>(
    () => [
      {
        id: 'screens',
        heading: fr.shell.palette.groupScreens,
        items: NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return {
            id: item.id,
            label: fr.shell.nav[item.id],
            icon: <Icon size={16} aria-hidden="true" />,
            onSelect: () => {
              closeOverlay()
              void navigate(item.path)
            },
          }
        }),
      },
    ],
    [closeOverlay, navigate],
  )

  return (
    <div className="flex h-full min-w-[1100px] overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar className="px-10 pt-8 pb-6" />
        <main className="min-h-0 flex-1 overflow-y-auto px-10 pb-10">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        open={overlay === 'palette'}
        onClose={closeOverlay}
        groups={groups}
        initialQuery={paletteQuery}
      />
      <QuickIdeaDialog open={overlay === 'quickIdea'} onClose={closeOverlay} />
      <ShortcutsDialog open={overlay === 'shortcuts'} onClose={closeOverlay} />
      <Toaster />
    </div>
  )
}
