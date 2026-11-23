import { screen } from '@testing-library/react'
import { Link, Outlet } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError, ScreenError } from '@renderer/app/RouteError'
import { renderRoutes } from '@renderer/test/shakery'

function Broken(): never {
  throw new Error('Name "<b>&</b>" broke the screen')
}

function Frame() {
  return (
    <div>
      <nav>
        <Link to="/">Accueil</Link>
      </nav>
      <Outlet />
    </div>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('route errors', () => {
  it('replaces a failed screen only, the frame and its links stay', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderRoutes(
      [
        {
          errorElement: <AppError />,
          children: [
            {
              element: <Frame />,
              children: [
                {
                  errorElement: <ScreenError />,
                  children: [
                    { path: '/', element: <p>Accueil affiché</p> },
                    { path: '/broken', element: <Broken /> },
                  ],
                },
              ],
            },
          ],
        },
      ],
      '/broken',
    )
    expect(await screen.findByRole('heading', { name: 'Cet écran a rencontré un problème' })).toBeDefined()
    // The message is shown as text, never as markup.
    expect(screen.getByText('Error: Name "<b>&</b>" broke the screen')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeDefined()
    screen.getByRole('button', { name: 'Revenir à l’accueil' }).click()
    expect(await screen.findByText('Accueil affiché')).toBeDefined()
  })
})
