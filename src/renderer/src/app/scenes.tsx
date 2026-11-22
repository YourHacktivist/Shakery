import { activeNavIndex, NAV_ITEMS, type ScreenId } from '@renderer/app/navigation'
import { backdropOf } from '@renderer/app/backdrops/drawings'

/** A screen as seen by the animations: the navigation screens, plus a recipe and its editor. */
export type SceneId = ScreenId | 'detail' | 'editor' | 'guide'

export function sceneOf(pathname: string): SceneId {
  if (pathname === '/guide') return 'guide'
  if (pathname === '/recipes/new' || /^\/recipes\/[^/]+\/edit$/.test(pathname)) return 'editor'
  if (/^\/recipes\/[^/]+$/.test(pathname)) return 'detail'
  return NAV_ITEMS[activeNavIndex(pathname)]?.id ?? 'home'
}

/**
 * Behind each screen, its own light and its own engraving in hairlines (D-038, D-046): the
 * screens can be told apart at a glance. Both arrive once, then stay still (no CPU at rest,
 * section 11). The colours and the movements are in styles/scenes.css, under the name of the
 * scene; the drawings in app/backdrops/.
 */
export function SceneBackdrop({ scene }: { scene: SceneId }) {
  return (
    <div key={scene} aria-hidden="true" data-scene={scene} className="scene-backdrop">
      <span className="scene-light" />
      <svg className="scene-motif" viewBox="0 0 600 600" fill="none" focusable="false">
        {backdropOf(scene).map((part, index) => (
          <path
            key={index}
            className={`engraving-${part.weight}`}
            d={part.d}
            transform={part.transform}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}
