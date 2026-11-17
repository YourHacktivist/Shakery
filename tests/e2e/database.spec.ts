import { expect, test } from '@playwright/test'
import { readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { closeApp, createUserDataDir, launchApp } from './helpers'

async function backupFolders(userDataDir: string): Promise<string[]> {
  try {
    return (await readdir(join(userDataDir, 'backups'))).filter((name) => /^\d{8}T/.test(name)).sort()
  } catch {
    return []
  }
}

test('first launch creates the notebook, its reference data and a first backup', async () => {
  const launched = await launchApp()
  try {
    const result = await launched.page.evaluate(async () => ({
      health: await window.shakery.database.getHealth(),
      glasses: await window.shakery.reference.listGlasses(),
      ice: await window.shakery.reference.listIceTypes(),
      categories: await window.shakery.reference.listCategories(),
    }))
    expect(result.health).toMatchObject({ ok: true, data: { database: 'ready', backupError: null } })
    if (!result.glasses.ok || !result.ice.ok || !result.categories.ok)
      throw new Error('reference data missing')
    expect(result.glasses.data.length).toBeGreaterThan(5)
    expect(result.ice.data.length).toBeGreaterThan(2)
    expect(result.categories.data.length).toBeGreaterThanOrEqual(50)
    // Every child comes after its parent.
    const seen = new Set<string>()
    for (const category of result.categories.data) {
      if (category.parentId) expect(seen.has(category.parentId)).toBe(true)
      seen.add(category.id)
    }

    // The daily backup runs right after the window opens.
    await expect.poll(async () => (await backupFolders(launched.userDataDir)).length).toBe(1)
  } finally {
    await launched.app.close()
  }
  // Closing the app adds a shutdown backup (same day: rotation keeps the newest only).
  const folders = await backupFolders(launched.userDataDir)
  expect(folders.at(-1)).toMatch(/_shutdown$/)
  await rm(launched.userDataDir, { recursive: true, force: true })
})

test('a backup then a restore through IPC gives back the same notebook', async () => {
  const launched = await launchApp()
  try {
    const created = await launched.page.evaluate(() => window.shakery.backups.create())
    if (!created.ok) throw new Error(created.message)
    expect(created.data).toMatchObject({ reason: 'manual', integrity: 'ok' })

    const listed = await launched.page.evaluate(() => window.shakery.backups.list())
    expect(listed.ok && listed.data.some((b) => b.id === created.data.id)).toBe(true)

    const restored = await launched.page.evaluate(
      (id) => window.shakery.backups.restore({ id }),
      created.data.id,
    )
    expect(restored).toMatchObject({ ok: true, data: { id: created.data.id } })
    // The window reloads on the restored notebook.
    await launched.page.waitForLoadState('domcontentloaded')
    await expect(launched.page.getByTestId('app-version')).toHaveText('Version 0.1.0')
    const health = await launched.page.evaluate(() => window.shakery.database.getHealth())
    expect(health).toMatchObject({ ok: true, data: { database: 'ready' } })

    const invalid = await launched.page.evaluate(() => {
      const restore = window.shakery.backups.restore as unknown as (input: unknown) => Promise<unknown>
      return restore({ id: '../../shakery' })
    })
    expect(invalid).toMatchObject({ ok: false, code: 'INVALID_INPUT' })
  } finally {
    await closeApp(launched)
  }
})

test('a damaged notebook is detected at startup and nothing is written to it', async () => {
  const userDataDir = await createUserDataDir()
  const garbage = Buffer.alloc(16_384, 0x42)
  await writeFile(join(userDataDir, 'shakery.db'), garbage)
  const launched = await launchApp(userDataDir)
  try {
    await expect(launched.page.getByTestId('app-version')).toHaveText('Version 0.1.0')
    const result = await launched.page.evaluate(async () => ({
      health: await window.shakery.database.getHealth(),
      glasses: await window.shakery.reference.listGlasses(),
    }))
    expect(result.health).toMatchObject({
      ok: true,
      data: { database: 'corrupt', latestHealthyBackupId: null },
    })
    expect(result.glasses).toMatchObject({ ok: false, code: 'UNAVAILABLE' })
  } finally {
    await launched.app.close()
  }
  // No backup of a damaged file, and the file itself is untouched.
  expect(await backupFolders(userDataDir)).toEqual([])
  const { readFile } = await import('node:fs/promises')
  expect((await readFile(join(userDataDir, 'shakery.db'))).equals(garbage)).toBe(true)
  await rm(userDataDir, { recursive: true, force: true })
})
