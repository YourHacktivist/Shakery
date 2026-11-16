import { isIpcChannel, type IpcChannel } from '../../shared/ipc/channels'
import { ipcContract, type IpcOutput, type IpcParsedInput } from '../../shared/ipc/contract'
import { fail, ok, type IpcResult } from '../../shared/ipc/result'
import { DomainError } from '../errors'

export type IpcHandlers = {
  readonly [C in IpcChannel]: (input: IpcParsedInput<C>) => IpcOutput<C> | Promise<IpcOutput<C>>
}

type UntypedHandler = (input: unknown) => unknown

/**
 * Validates and runs one IPC call. Pure with respect to Electron: the sender check is
 * done by the caller (`ipc/index.ts`), which keeps this function testable under Vitest.
 */
export async function dispatch(
  channel: string,
  rawInput: unknown,
  handlers: IpcHandlers,
  onUnexpectedError: (error: unknown) => void = () => undefined,
): Promise<IpcResult<unknown>> {
  if (!isIpcChannel(channel)) return fail('UNKNOWN_CHANNEL', `Unknown channel: ${channel.slice(0, 64)}`)

  const parsed = ipcContract[channel].input.safeParse(rawInput)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.code}`)
      .join('; ')
    return fail('INVALID_INPUT', `Invalid input for ${channel}: ${issues}`)
  }

  try {
    // The contract guarantees that `handlers[channel]` accepts the parsed input of
    // `channel`; TypeScript cannot correlate the two through the union, hence the cast.
    const handler = handlers[channel] as UntypedHandler
    return ok(await handler(parsed.data))
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message)
    onUnexpectedError(error)
    return fail('INTERNAL', 'Internal error')
  }
}
