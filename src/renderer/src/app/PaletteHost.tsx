import { BookOpen, ChefHat, Leaf, Wine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { NAV_ITEMS } from '@renderer/app/navigation'
import { useOverlayStore } from '@renderer/app/stores'
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPaletteItem,
} from '@renderer/components/CommandPalette'
import { fr } from '@renderer/i18n/fr'
import { recordView, useSearch } from '@renderer/lib/queries'
import type { SearchHit } from '@shared/domain/search'

const t = fr.shell.palette

/** Ctrl+K palette: screens, then recipes, ingredients and bottles found by the search. */
export function PaletteHost() {
  const navigate = useNavigate()
  const overlay = useOverlayStore((state) => state.current)
  const paletteQuery = useOverlayStore((state) => state.paletteQuery)
  const closeOverlay = useOverlayStore((state) => state.close)
  const [query, setQuery] = useState('')
  const search = useSearch(overlay === 'palette' ? query : '')

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    const go = (path: string) => {
      closeOverlay()
      void navigate(path)
    }
    const hits = query.trim() === '' ? [] : (search.data ?? [])
    const open = (hit: SearchHit): CommandPaletteItem => ({
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
    const byType = (type: SearchHit['entityType']) => hits.filter((hit) => hit.entityType === type).map(open)
    const firstRecipe = hits.find((hit) => hit.entityType === 'recipe')
    const result: CommandPaletteGroup[] = [
      { id: 'recipes', heading: t.groupRecipes, items: byType('recipe'), preFiltered: true },
      { id: 'ingredients', heading: t.groupIngredients, items: byType('ingredient'), preFiltered: true },
      { id: 'products', heading: t.groupProducts, items: byType('product'), preFiltered: true },
    ]
    if (firstRecipe) {
      result.push({
        id: 'actions',
        heading: t.groupActions,
        preFiltered: true,
        items: [
          {
            id: `prepare:${firstRecipe.id}`,
            label: t.prepare(firstRecipe.title),
            icon: <ChefHat size={16} aria-hidden="true" />,
            onSelect: () => {
              recordView('recipe', firstRecipe.id)
              go(`/prepare/${firstRecipe.id}`)
            },
          },
        ],
      })
    }
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
  }, [closeOverlay, navigate, query, search.data])

  return (
    <CommandPalette
      open={overlay === 'palette'}
      onClose={closeOverlay}
      groups={groups}
      initialQuery={paletteQuery}
      onQueryChange={setQuery}
      resultsFor={search.isPending || search.isPlaceholderData ? null : query.trim()}
    />
  )
}
