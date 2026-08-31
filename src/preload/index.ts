import { contextBridge, ipcRenderer } from 'electron'

export interface RendererConfig {
  apiBaseUrl: string
  apiToken: string
}

const electronAPI = {
  getConfig: (): Promise<RendererConfig> => ipcRenderer.invoke('get-config')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
