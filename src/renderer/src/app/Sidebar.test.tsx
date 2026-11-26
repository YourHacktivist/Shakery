import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Sidebar } from '@renderer/app/Sidebar'
import { useOverlayStore, useSidebarStore } from '@renderer/app/stores'
import { TopBar } from '@renderer/app/TopBar'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes } from '@renderer/test/shakery'

const nav = fr.shell.nav

beforeEach(() => {
  installShakery()
  useSidebarStore.setState({ collapsed: false, closed: false })
  useOverlayStore.getState().close()
})

function renderShell(path: string) {
  return renderRoutes(
    [
      {
        path: '*',
        element: (
          <>
            <TopBar />
            <Sidebar />
          </>
        ),
      },
    ],
    path,
  )
}

function linkNames(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('Sidebar', () => {
  it('puts Accueil first, then three titled groups, and Paramètres at the foot', () => {
    renderShell('/')
    const navigation = screen.getByRole('navigation', { name: nav.label })
    expect(linkNames(within(navigation).getByRole('list', { name: nav.groups.create }))).toEqual([
      'Fiches',
      'Atelier',
      'Journal',
      'Notes',
    ])
    expect(linkNames(within(navigation).getByRole('list', { name: nav.groups.bar }))).toEqual([
      'Ingrédients',
      'Préparations',
    ])
    expect(linkNames(within(navigation).getByRole('list', { name: nav.groups.tools }))).toEqual([
      'Collections',
      'Calculateurs',
    ])
    const all = within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(all[0]).toBe('Accueil')
    expect(all.at(-1)).toBe('Paramètres')
    // Révision is a tab of each collection now; the guide opens from the help.
    expect(all).not.toContain(nav.practice)
    expect(screen.queryByRole('button', { name: fr.shell.sidebar.guide })).toBeNull()
    expect(screen.getByRole('button', { name: fr.shell.sidebar.shortcuts })).toBeDefined()
    expect(screen.getByTestId('app-version')).toBeDefined()
  })

  it('gives every entry its classes, never the source of a class function', () => {
    renderShell('/lab/abc')
    const navigation = screen.getByRole('navigation', { name: nav.label })
    const links = within(navigation).getAllByRole('link')
    for (const link of links) {
      expect(link.className).not.toMatch(/=>|isActive|function/)
    }
    const lab = within(navigation).getByRole('link', { name: nav.lab })
    expect(lab.getAttribute('aria-current')).toBe('page')
    const recipes = within(navigation).getByRole('link', { name: nav.recipes })
    expect(recipes.getAttribute('aria-current')).toBeNull()
    expect(recipes.className.split(' ')).toContain('text-fg-secondary')
    expect(recipes.className.split(' ')).toContain('aria-[current=page]:text-fg')
  })

  it('marks Paramètres at the foot as the current page', () => {
    renderShell('/settings')
    const navigation = screen.getByRole('navigation', { name: nav.label })
    const current = within(navigation)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual([nav.settings])
  })

  it('folded to icons, keeps the names of the groups and of the entries', () => {
    useSidebarStore.setState({ collapsed: true })
    renderShell('/bar')
    const navigation = screen.getByRole('navigation', { name: nav.label })
    const bar = within(navigation).getByRole('list', { name: nav.groups.bar })
    expect(within(bar).getByRole('link', { name: nav.bar }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: fr.shell.sidebar.expand })).toBeDefined()
  })
})

describe('TopBar', () => {
  it('keeps the search, a discreet quick idea on Ctrl+N and the help', async () => {
    const user = userEvent.setup()
    renderShell('/')
    const header = screen.getByRole('banner', { name: fr.shell.topbar.label })
    const quickIdea = within(header).getByRole('button', { name: fr.shell.topbar.quickIdea })
    expect(quickIdea.getAttribute('aria-keyshortcuts')).toBe('Control+N')
    // An outline button: the copper one belongs to the screen.
    expect(quickIdea.className).not.toContain('bg-accent-gradient')
    expect(within(header).getByRole('button', { name: fr.shell.topbar.help })).toBeDefined()
    // The theme and the settings live in Paramètres only.
    expect(within(header).queryByRole('button', { name: /thème/ })).toBeNull()
    expect(within(header).queryByRole('link')).toBeNull()

    await user.click(quickIdea)
    expect(useOverlayStore.getState().current).toBe('quickIdea')
  })
})
