import type { ElectronAPI, RendererConfig } from './index'

export type { RendererConfig }

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
