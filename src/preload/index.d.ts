import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>
    }
  }
}

export {}
