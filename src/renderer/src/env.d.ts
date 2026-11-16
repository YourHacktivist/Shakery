/// <reference types="vite/client" />
import type { ShakeryApi } from '@shared/ipc/api'

declare global {
  interface Window {
    readonly shakery: ShakeryApi
  }
}

export {}
