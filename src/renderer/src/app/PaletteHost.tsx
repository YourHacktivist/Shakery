import {
  BookOpen,
  ChefHat,
  CircleHelp,
  FlaskConical,
  GitCompareArrows,
  Keyboard,
  Leaf,
  Lightbulb,
  NotebookPen,
  Plus,
  Printer,
  StickyNote,
  SunMoon,
  Wine,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { NAV_ITEMS } from '@renderer/app/navigation'
import { useOverlayStore } from '@renderer/app/stores'
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from '@renderer/components/CommandPalette'
import { fr } from '@renderer/i18n/fr'
import { revealTheme } from '@renderer/lib/appearance'
import { notifyError } from '@renderer/features/shared/notify'
import {
  recordView,
  useNoteSearch,
  useRecipe,
  useSearch,
  useSetSetting,
  useSetting,
} from '@renderer/lib/queries'
import type { SearchHit } from '@shared/domain/search'

const t = fr.shell.palette

/**
 * Ctrl+K palette (section 10.1): what the search finds, the actions on the first recipe found or
 * on the one on screen, the general actions, then the screens.
 */
export function PaletteHost() {
  const navigate = useNavigate()
  const overlay = useOverlayStore((state) => state.current)
  const paletteQuery = useOverlayStore((state) => state.paletteQuery)
  const closeOverlay = useOverlayStore((state) => state.close)
  const [query, setQuery] = useState('')
  const open = overlay === 'palette'
  const search = useSearch(open ? query : '')
  const notes = useNoteSearch(open ? query : '')
  const openOverlay = useOverlayStore((state) => state.open)
  const openTasting = useOverlayStore((state) => state.openTasting)
  const detailId = useMatch('/recipes/:id')?.params.id
  const labId = useMatch('/lab/:id')?.params.id
  const shownId = detailId ?? labId
  const shown = useRecipe(open && shownId !== 'new' ? shownId : undefined).data
  const inLab = labId !== undefined
  const theme = useSetting('appearance.theme')
  const { mutate: setSetting } = useSetSetting()

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    const go = (path: string) => {
      closeOverlay()
      void navigate(path)
    }
    const hits = query.trim() === '' ? [] : (search.data ?? [])
    const found = (hit: SearchHit): CommandPaletteItem => ({
      id: `${hit.entityType}:${hit.id}`,
      label: hit.title,
      detail:
        hit.detail ??
        (hit.status
          ? fr.components.display.status[hit.status as keyof typeof fr.components.display.status]
          : undefined),
      icon:
        hit.entityType === 'recipe' ? (
          <BookOpen size={16} aria-hidden="true" />
        ) : hit.entityType === 'ingredient' ? (
          <Leaf size={16} aria-hidden="true" />
        ) : (
          <Wine size={16} aria-hidden="true" />
        ),
      onSelect: () => {
        recordView(hit.entityType, hit.id)
        if (hit.entityType === 'recipe') go(`/recipes/${hit.id}`)
        else if (hit.entityType === 'ingredient') go(`/bar?ingredient=${hit.id}`)
        else go(`/bar?ingredient=${hit.parentId ?? ''}`)
      },
    })
    const byType = (type: SearchHit['entityType']) => hits.filter((hit) => hit.entityType === type).map(found)
    const firstRecipe = hits.find((hit) => hit.entityType === 'recipe')
    const noteItems = (query.trim() === '' ? [] : (notes.data ?? [])).map((note): CommandPaletteItem => ({
      id: `${note.entityType}:${note.id}`,
      label: note.entityType === 'tasting_note' ? t.tasting(note.title) : note.title,
      ...(note.excerpt === null ? {} : { detail: note.excerpt }),
      icon:
        note.entityType === 'tasting_note' ? (
          <NotebookPen size={16} aria-hidden="true" />
        ) : (
          <StickyNote size={16} aria-hidden="true" />
        ),
      onSelect: () => {
        go(note.entityType === 'tasting_note' ? `/journal?note=${note.id}` : `/notebook?entry=${note.id}`)
      },
    }))
    const compare = (recipe: { id: string; title: string }): CommandPaletteItem => ({
      id: `compare:${recipe.id}`,
      label: t.compare(recipe.title),
      icon: <GitCompareArrows size={16} aria-hidden="true" />,
      onSelect: () => {
        go(`/lab/${recipe.id}?compare`)
      },
    })
    const actionsOn = (recipe: { id: string; title: string }): CommandPaletteItem[] => [
      {
        id: `lab:${recipe.id}`,
        label: t.openInLab(recipe.title),
        icon: <FlaskConical size={16} aria-hidden="true" />,
        onSelect: () => {
          recordView('recipe', recipe.id)
          go(`/lab/${recipe.id}`)
        },
      },
      {
        id: `prepare:${recipe.id}`,
        label: t.prepare(recipe.title),
        icon: <ChefHat size={16} aria-hidden="true" />,
        onSelect: () => {
          recordView('recipe', recipe.id)
          go(`/prepare/${recipe.id}`)
        },
      },
      {
        id: `taste:${recipe.id}`,
        label: t.taste(recipe.title),
        icon: <NotebookPen size={16} aria-hidden="true" />,
        onSelect: () => {
          openTasting(recipe.id)
        },
      },
      compare(recipe),
      {
        id: `print:${recipe.id}`,
        label: t.print(recipe.title),
        icon: <Printer size={16} aria-hidden="true" />,
        onSelect: () => {
          // The sheet belongs to the page of the recipe (section 12.2).
          go(`/recipes/${recipe.id}`)
          openOverlay('print')
        },
      },
    ]
    const result: CommandPaletteGroup[] = [
      { id: 'recipes', heading: t.groupRecipes, items: byType('recipe'), preFiltered: true },
      { id: 'ingredients', heading: t.groupIngredients, items: byType('ingredient'), preFiltered: true },
      { id: 'products', heading: t.groupProducts, items: byType('product'), preFiltered: true },
      { id: 'notes', heading: t.groupNotes, items: noteItems, preFiltered: true },
    ]
    if (firstRecipe) {
      result.push({
        id: 'actions',
        heading: t.groupActions,
        preFiltered: true,
        items: actionsOn(firstRecipe),
      })
    }
    if (shown && shown.id !== firstRecipe?.id) {
      const recipe = { id: shown.id, title: shown.name }
      result.push({
        id: 'shown',
        heading: t.groupShown,
        // In the lab the draft is not saved: only the comparison leaves it untouched.
        items: inLab ? [compare(recipe)] : actionsOn(recipe),
      })
    }
    result.push({
      id: 'general',
      heading: t.groupGeneral,
      // Without a word typed, the screens follow the actions of the recipe on screen.
      items:
        query.trim() === ''
          ? []
          : [
              {
                id: 'action:quickIdea',
                label: t.quickIdea,
                icon: <Lightbulb size={16} aria-hidden="true" />,
                onSelect: () => {
                  openOverlay('quickIdea')
                },
              },
              {
                id: 'action:newRecipe',
                label: t.newRecipe,
                icon: <Plus size={16} aria-hidden="true" />,
                onSelect: () => {
                  go('/recipes/new')
                },
              },
              {
                id: 'action:tasting',
                label: t.newTasting,
                icon: <NotebookPen size={16} aria-hidden="true" />,
                onSelect: () => {
                  openTasting(null)
                },
              },
              {
                id: 'action:theme',
                label: fr.shell.topbar.theme[theme === 'dark' ? 'light' : 'dark'],
                icon: <SunMoon size={16} aria-hidden="true" />,
                onSelect: () => {
                  const next = theme === 'dark' ? 'light' : 'dark'
                  const origin = { x: window.innerWidth / 2, y: 0 }
                  revealTheme(next, origin)
                  setSetting(
                    { key: 'appearance.theme', value: next },
                    {
                      onError: (error) => {
                        revealTheme(theme, origin)
                        notifyError(error)
                      },
                    },
                  )
                },
              },
              {
                id: 'action:guide',
                label: t.guide,
                icon: <CircleHelp size={16} aria-hidden="true" />,
                onSelect: () => {
                  go('/guide')
                },
              },
              {
                id: 'action:shortcuts',
                label: t.shortcuts,
                icon: <Keyboard size={16} aria-hidden="true" />,
                onSelect: () => {
                  openOverlay('shortcuts')
                },
              },
            ],
    })
    result.push({
      id: 'screens',
      heading: t.groupScreens,
      items: NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return {
          id: item.id,
          label: fr.shell.nav[item.id],
          icon: <Icon size={16} aria-hidden="true" />,
          onSelect: () => {
            go(item.path)
          },
        }
      }),
    })
    return result
  }, [
    closeOverlay,
    inLab,
    navigate,
    notes.data,
    openOverlay,
    openTasting,
    query,
    search.data,
    setSetting,
    shown,
    theme,
  ])

  return (
    <CommandPalette
      open={open}
      onClose={closeOverlay}
      groups={groups}
      initialQuery={paletteQuery}
      onQueryChange={setQuery}
      resultsFor={
        search.isPending || search.isPlaceholderData || notes.isPending || notes.isPlaceholderData
          ? null
          : query.trim()
      }
    />
  )
}
