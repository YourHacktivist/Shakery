import { describe, expect, it, vi } from 'vitest'
import { IPC_CHANNEL_PATTERN, IPC_CHANNELS } from '../../shared/ipc/channels'
import { ipcContract } from '../../shared/ipc/contract'
import { DomainError } from '../errors'
import { dispatch, type IpcHandlers } from './dispatch'

/** Every handler of the contract, failing if called; tests override the ones they use. */
function handlersWith(overrides: Partial<IpcHandlers>): IpcHandlers {
  const unexpected = (): never => {
    throw new Error('unexpected call')
  }
  const base = Object.fromEntries(
    IPC_CHANNELS.map((channel) => [channel, unexpected]),
  ) as unknown as IpcHandlers
  return { ...base, ...overrides }
}

const handlers = handlersWith({ 'app.getVersion': () => ({ version: '1.2.3' }) })

describe('IPC contract', () => {
  it('declares exactly the channels of the closed list, all well named', () => {
    expect(Object.keys(ipcContract).sort()).toEqual([...IPC_CHANNELS].sort())
    for (const channel of IPC_CHANNELS) expect(channel).toMatch(IPC_CHANNEL_PATTERN)
  })

  it('app.getVersion accepts no input at all', () => {
    const schema = ipcContract['app.getVersion'].input
    expect(schema.safeParse(undefined).success).toBe(true)
    expect(schema.safeParse(null).success).toBe(false)
    expect(schema.safeParse({}).success).toBe(false)
    expect(schema.safeParse('x').success).toBe(false)
  })

  it('app.getVersion output refuses extra keys and overlong strings', () => {
    const schema = ipcContract['app.getVersion'].output
    expect(schema.safeParse({ version: '1.0.0' }).success).toBe(true)
    expect(schema.safeParse({ version: '1.0.0', extra: true }).success).toBe(false)
    expect(schema.safeParse({ version: 'x'.repeat(65) }).success).toBe(false)
  })
})

describe('dispatch', () => {
  it('runs the handler with valid input', async () => {
    await expect(dispatch('app.getVersion', undefined, handlers)).resolves.toEqual({
      ok: true,
      data: { version: '1.2.3' },
    })
  })

  it('refuses an unknown channel without calling anything', async () => {
    const result = await dispatch('fs.readFile', '/etc/passwd', handlers)
    expect(result).toMatchObject({ ok: false, code: 'UNKNOWN_CHANNEL' })
  })

  it('refuses inherited object keys used as channel names', async () => {
    const result = await dispatch('__proto__', undefined, handlers)
    expect(result).toMatchObject({ ok: false, code: 'UNKNOWN_CHANNEL' })
  })

  it('refuses invalid input before reaching the handler', async () => {
    const spy = vi.fn(() => ({ version: 'never' }))
    const result = await dispatch(
      'app.getVersion',
      { injected: true },
      handlersWith({ 'app.getVersion': spy }),
    )
    expect(result).toMatchObject({ ok: false, code: 'INVALID_INPUT' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('passes expected domain errors through', async () => {
    const failing = handlersWith({
      'app.getVersion': () => {
        throw new DomainError('NOT_FOUND', 'Recipe not found')
      },
    })
    await expect(dispatch('app.getVersion', undefined, failing)).resolves.toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'Recipe not found',
    })
  })

  it('hides unexpected errors behind INTERNAL and reports them', async () => {
    const onError = vi.fn()
    const failing = handlersWith({
      'app.getVersion': () => {
        throw new Error('SQLITE_CORRUPT at C:\\Users\\me\\secret.db')
      },
    })
    const result = await dispatch('app.getVersion', undefined, failing, onError)
    expect(result).toEqual({ ok: false, code: 'INTERNAL', message: 'Internal error' })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(onError).toHaveBeenCalledOnce()
  })
})
