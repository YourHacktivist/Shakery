import {
  BookOpen,
  Calculator,
  FlaskConical,
  GraduationCap,
  House,
  Layers,
  Milk,
  NotebookText,
  Settings,
  StickyNote,
  Wine,
  type LucideIcon,
} from 'lucide-react'

export type ScreenId =
  | 'home'
  | 'recipes'
  | 'lab'
  | 'journal'
  | 'notebook'
  | 'bar'
  | 'preps'
  | 'collections'
  | 'practice'
  | 'calculators'
  | 'settings'

export type NavItem = {
  readonly id: ScreenId
  readonly path: string
  readonly icon: LucideIcon
}

/** Screens of the sidebar, in the order of section 10.1. Labels: fr.shell.nav[id]. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', path: '/', icon: House },
  { id: 'recipes', path: '/recipes', icon: BookOpen },
  { id: 'lab', path: '/lab', icon: FlaskConical },
  { id: 'journal', path: '/journal', icon: NotebookText },
  { id: 'notebook', path: '/notebook', icon: StickyNote },
  { id: 'bar', path: '/bar', icon: Wine },
  { id: 'preps', path: '/preps', icon: Milk },
  { id: 'collections', path: '/collections', icon: Layers },
  { id: 'practice', path: '/practice', icon: GraduationCap },
  { id: 'calculators', path: '/calculators', icon: Calculator },
  { id: 'settings', path: '/settings', icon: Settings },
]

export const KIT_PATH = '/dev/kit'

/** Index of the navigation entry of an address, or -1 (preparation mode, kit). */
export function activeNavIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}

export function navItem(id: ScreenId): NavItem {
  const item = NAV_ITEMS.find((entry) => entry.id === id)
  if (!item) throw new Error(`Unknown screen ${id}`)
  return item
}
