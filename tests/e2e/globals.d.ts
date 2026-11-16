import type { ShakeryApi } from '../../src/shared/ipc/api'

declare global {
  interface Window {
    readonly shakery: ShakeryApi
  }
}

export {}
