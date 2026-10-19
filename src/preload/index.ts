import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Canal único e tipado: o renderer chama api.invoke('dominio:acao', payload)
// e o processo principal responde via ipcMain.handle. Mantém o renderer
// isolado (contextIsolation) sem acesso direto ao Node/SQLite.
const api = {
  invoke: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (fallback sem isolamento)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type PreloadApi = typeof api
