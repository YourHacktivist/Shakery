import { act, screen } from '@testing-library/react'
import { Outlet } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useScrollTopOnNewPage } from '@renderer/app/useScrollTopOnNewPage'
import { renderRoutes } from '@renderer/test/shakery'

function Frame() {
  const main = useScrollTopOnNewPage<HTMLElement>()
  return (
    <main ref={main} data-testid="main">
      <Outlet />
    </main>
  )
}

/** jsdom does not scroll: a plain value stands for the position. */
function scrollable(element: HTMLElement) {
  let top = 0
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value
    },
  })
  return element
}

describe('useScrollTopOnNewPage', () => {
  it('brings a new page to its top, but not on back, forward or a change of query', async () => {
    const { router } = renderRoutes(
      [
        {
          element: <Frame />,
          children: [
            { path: '/a', element: <p>A</p> },
            { path: '/b', element: <p>B</p> },
          ],
        },
      ],
      '/a',
    )
    const main = scrollable(screen.getByTestId('main'))

    main.scrollTop = 300
    await act(() => router.navigate('/b'))
    expect(screen.getByText('B')).toBeDefined()
    expect(main.scrollTop).toBe(0)

    main.scrollTop = 200
    await act(() => router.navigate(-1))
    expect(screen.getByText('A')).toBeDefined()
    expect(main.scrollTop).toBe(200)

    await act(() => router.navigate('/a?filter=1'))
    expect(main.scrollTop).toBe(200)

    await act(() => router.navigate('/b', { replace: true }))
    expect(main.scrollTop).toBe(0)
  })
})
