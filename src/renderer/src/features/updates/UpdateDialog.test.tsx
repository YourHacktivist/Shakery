import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { UpdateState } from '@shared/domain/updates'
import { ok } from '@shared/ipc/result'
import { SETTING_DEFAULTS } from '@shared/settings'
import { installShakery, renderRoutes, type FakeShakery } from '@renderer/test/shakery'
import { UpdateHost } from './UpdateDialog'
import { useUpdateWindow } from './useUpdates'

const AVAILABLE: UpdateState = {
  status: 'available',
  mode: 'installed',
  current: '0.1.0',
  release: { version: '0.2.0', notes: 'Nouveautés\n• Une <b>fenêtre</b>', date: Date.UTC(2026, 10, 23) },
  skipped: false,
  progress: null,
  error: null,
  checkedAt: 1,
}

let shakery: FakeShakery

beforeEach(() => {
  shakery = installShakery()
  shakery.settings.getAll.mockResolvedValue(ok({ ...SETTING_DEFAULTS, 'onboarding.done': true }))
  useUpdateWindow.setState({ held: false, dismissed: [] })
})

function show() {
  return renderRoutes([{ path: '/', element: <UpdateHost /> }], '/')
}

describe('UpdateHost', () => {
  it('opens by itself at launch on a newer release, then downloads and restarts', async () => {
    let state = AVAILABLE
    shakery.updates.status.mockImplementation(() => Promise.resolve(ok(state)))
    shakery.updates.download.mockImplementation(() => {
      state = { ...state, status: 'downloading', progress: 40 }
      return Promise.resolve(ok(state))
    })
    shakery.updates.install.mockImplementation(() => Promise.resolve(ok(state)))
    show()

    const dialog = await screen.findByRole('dialog', { name: /Shakery 0\.2\.0 est disponible/ })
    expect(dialog.textContent).toContain('Tu as la version 0.1.0.')
    // The notes are text: a tag in them stays visible as typed.
    expect(dialog.textContent).toContain('• Une <b>fenêtre</b>')

    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(shakery.updates.download).toHaveBeenCalledTimes(1)
    const bar = await screen.findByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('40')

    act(() => {
      state = { ...state, status: 'ready', progress: 100 }
    })
    await userEvent.click(
      await screen.findByRole('button', { name: 'Redémarrer maintenant' }, { timeout: 3000 }),
    )
    expect(shakery.updates.install).toHaveBeenCalledTimes(1)
  })

  it('stays closed for an ignored release', async () => {
    shakery.updates.status.mockResolvedValue(ok({ ...AVAILABLE, skipped: true }))
    show()
    await waitFor(() => {
      expect(shakery.updates.status).toHaveBeenCalled()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('« Plus tard » closes it until the next launch, « Ignorer » remembers the version', async () => {
    shakery.updates.status.mockResolvedValue(ok(AVAILABLE))
    shakery.updates.skip.mockResolvedValue(ok({ ...AVAILABLE, skipped: true }))
    const view = show()
    await userEvent.click(await screen.findByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(() => view.client.refetchQueries())
    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => {
      useUpdateWindow.getState().show()
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Ignorer cette version' }))
    expect(shakery.updates.skip).toHaveBeenCalledWith({ version: '0.2.0' })
  })

  it('says why nothing was installed when the backup failed', async () => {
    shakery.updates.status.mockResolvedValue(
      ok({ ...AVAILABLE, status: 'ready', progress: 100, error: 'backup' }),
    )
    show()
    expect((await screen.findByRole('alert')).textContent).toContain('La sauvegarde du carnet a échoué')
  })

  it('on a portable copy, sends to the page of the release instead of installing', async () => {
    shakery.updates.status.mockResolvedValue(ok({ ...AVAILABLE, mode: 'portable' }))
    shakery.updates.openRelease.mockResolvedValue(ok({ ...AVAILABLE, mode: 'portable' }))
    show()
    const dialog = await screen.findByRole('dialog', { name: /Shakery 0\.2\.0 est disponible/ })
    expect(dialog.textContent).toContain('Shakery Data')
    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Télécharger la version portable' }))
    expect(shakery.updates.openRelease).toHaveBeenCalledTimes(1)
    expect(shakery.updates.download).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('waits for the first-launch assistant', async () => {
    shakery.settings.getAll.mockResolvedValue(ok({ ...SETTING_DEFAULTS, 'onboarding.done': false }))
    shakery.updates.status.mockResolvedValue(ok(AVAILABLE))
    show()
    await waitFor(() => {
      expect(shakery.updates.status).toHaveBeenCalled()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
