import type { IpcChannel } from './channels'
import type { IpcInput, IpcOutput } from './contract'
import type { IpcResult } from './result'

type DomainOf<C extends string> = C extends `${infer D}.${string}` ? D : never
type OperationOf<C extends string, D extends string> = C extends `${D}.${infer O}` ? O : never

type Caller<C extends IpcChannel> = [IpcInput<C>] extends [undefined]
  ? () => Promise<IpcResult<IpcOutput<C>>>
  : (input: IpcInput<C>) => Promise<IpcResult<IpcOutput<C>>>

/**
 * Shape of `window.shakery`, derived from the contract: `app.getVersion` becomes
 * `window.shakery.app.getVersion()`.
 */
export type ShakeryApi = {
  readonly [D in DomainOf<IpcChannel>]: {
    readonly [O in OperationOf<IpcChannel, D>]: Caller<`${D}.${O}` & IpcChannel>
  }
}
