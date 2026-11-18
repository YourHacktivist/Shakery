import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Layers } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { toast } from '@renderer/components/Toast'
import { notifyError } from '@renderer/features/shared/notify'
import { fr } from '@renderer/i18n/fr'
import { useAddToCollection, useCollections } from '@renderer/lib/queries'

const t = fr.workshop.collections

/** « Ajouter à une collection » on a recipe (section 10.4): the ones holding it are checked. */
export function AddToCollection({ recipeId, recipeName }: { recipeId: string; recipeName: string }) {
  const collections = useCollections()
  const add = useAddToCollection()
  const list = collections.data ?? []
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" icon={<Layers size={16} aria-hidden="true" />}>
          {t.addToCollection}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[240px] animate-pop-in rounded-nested border border-border-strong bg-surface-2 p-1 shadow-float"
        >
          {list.length === 0 ? (
            <p className="m-0 max-w-[260px] px-2.5 py-2 text-small text-fg-secondary">{t.noCollection}</p>
          ) : (
            list.map((collection) => {
              const inside = collection.recipeIds.includes(recipeId)
              return (
                <DropdownMenu.Item
                  key={collection.id}
                  disabled={inside}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-body text-fg outline-none data-[disabled]:cursor-default data-[disabled]:text-fg-muted data-[highlighted]:bg-accent/14"
                  onSelect={() => {
                    add.mutate(
                      { id: collection.id, recipeIds: [recipeId] },
                      {
                        onSuccess: () => {
                          toast.show({ message: t.addedTo(recipeName, collection.name) })
                        },
                        onError: notifyError,
                      },
                    )
                  }}
                >
                  <span className="flex size-4 items-center justify-center text-accent">
                    {inside ? <Check size={14} aria-hidden="true" /> : null}
                  </span>
                  <span className="truncate">{collection.name}</span>
                  <span className="ml-auto text-caption text-fg-muted">{t.kinds[collection.kind]}</span>
                </DropdownMenu.Item>
              )
            })
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
