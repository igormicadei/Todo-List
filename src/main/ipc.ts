import { ipcMain } from 'electron'

export interface RendererConfig {
  apiBaseUrl: string
  apiToken: string
}

export function registerIpcHandlers(config: RendererConfig): void {
  ipcMain.handle('get-config', () => config)
}
