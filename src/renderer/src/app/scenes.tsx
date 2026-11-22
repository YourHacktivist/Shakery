import { BookOpenText, GlassWater, PenLine, type LucideIcon } from 'lucide-react'
import { activeNavIndex, NAV_ITEMS, type ScreenId } from '@renderer/app/navigation'

/** A screen as seen by the animations: the navigation screens, plus a recipe and its editor. */
export type SceneId = ScreenId | 'detail' | 'editor' | 'guide'

export function sceneOf(pathname: string): SceneId {
  if (pathname === '/guide') return 'guide'
  if (pathname === '/recipes/new' || /^\/recipes\/[^/]+\/edit$/.test(pathname)) return 'editor'
  if (/^\/recipes\/[^/]+$/.test(pathname)) return 'detail'
  return NAV_ITEMS[activeNavIndex(pathname)]?.id ?? 'home'
}

const MOTIFS = {
  ...Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item.icon])),
  detail: GlassWater,
  guide: BookOpenText,
  editor: PenLine,
} as Record<SceneId, LucideIcon>

/**
 * Behind each screen, its own light and its own large line drawing (D-038): the screens can be
 * told apart at a glance. Both arrive once, then stay still (no CPU at rest, section 11). The
 * colours and the movements are in styles/scenes.css, under the name of the scene.
 */
export function SceneBackdrop({ scene }: { scene: SceneId }) {
  const Motif = MOTIFS[scene]
  return (
    <div key={scene} aria-hidden="true" data-scene={scene} className="scene-backdrop">
      <span className="scene-light" />
      <Motif size={440} strokeWidth={0.5} className="scene-motif" />
    </div>
  )
}
