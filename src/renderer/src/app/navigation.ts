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

/**
 * Every screen with an address of its own, in the order of section 10.1: the scenes and the
 * guide read it. Révision has no entry in the sidebar any more (D-057). Labels: fr.shell.nav[id].
 */
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

/** Index of the screen of an address in NAV_ITEMS, or -1 (preparation mode, kit, guide). */
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

export type NavGroupId = 'create' | 'bar' | 'tools'

export type NavGroup = {
  readonly id: NavGroupId
  readonly items: readonly NavItem[]
}

/** Sidebar (D-057): Accueil alone at the top, then three groups titled by fr.shell.nav.groups[id]. */
export const SIDEBAR_TOP: readonly NavItem[] = [navItem('home')]

export const SIDEBAR_GROUPS: readonly NavGroup[] = [
  { id: 'create', items: [navItem('recipes'), navItem('lab'), navItem('journal'), navItem('notebook')] },
  { id: 'bar', items: [navItem('bar'), navItem('preps')] },
  { id: 'tools', items: [navItem('collections'), navItem('calculators')] },
]

/** Paramètres, at the foot of the sidebar, above the version. */
export const SIDEBAR_BOTTOM: readonly NavItem[] = [navItem('settings')]

/** Every entry of the sidebar from top to bottom, also the screens offered by the palette. */
export const SIDEBAR_ITEMS: readonly NavItem[] = [
  ...SIDEBAR_TOP,
  ...SIDEBAR_GROUPS.flatMap((group) => group.items),
  ...SIDEBAR_BOTTOM,
]
