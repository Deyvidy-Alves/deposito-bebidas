import { ipcMain } from 'electron'
import { settingsRoutes } from './services/settings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteMap = Record<string, (payload: any) => unknown | Promise<unknown>>

// Cada módulo registra suas rotas aqui. O canal segue o padrão "dominio:acao".
const routes: RouteMap = {
  ...settingsRoutes
}

/** Registra todos os handlers IPC com envelope padrão { ok, data | error }. */
export function registerIpc(): void {
  for (const [channel, handler] of Object.entries(routes)) {
    ipcMain.handle(channel, async (_event, payload) => {
      try {
        const data = await handler(payload)
        return { ok: true, data }
      } catch (err) {
        console.error(`[IPC] ${channel} falhou:`, err)
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  }
}
