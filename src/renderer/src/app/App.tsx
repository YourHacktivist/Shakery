import { useMemo } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
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
import { RecipesPage } from '@renderer/features/recipes/RecipesPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { fr } from '@renderer/i18n/fr'

/** Root of the interface: hash routing works when the page is loaded from file://. */
export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
            <Route path="/bar" element={<BarPage />} />
            <Route path="/preps" element={<PrepsPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/calculators" element={<CalculatorsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {import.meta.env.DEV ? <Route path={KIT_PATH} element={<KitPage />} /> : null}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
