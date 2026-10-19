import { ipcMain } from 'electron'
import { settingsRoutes } from './services/settings'
import { dashboardRoutes } from './services/dashboard'
import { searchRoutes } from './services/search'
import { clientsRoutes } from './services/clients'
import { productsRoutes } from './services/products'
import { tablesRoutes } from './services/tables'
import { paymentsRoutes } from './services/payments'
import { creditRoutes } from './services/credit'
import { copaRoutes } from './services/copa'
import { financeRoutes } from './services/finance'
import { financeExportRoutes } from './services/financeExport'
import { fiscalRoutes } from './services/fiscal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteMap = Record<string, (payload: any) => unknown | Promise<unknown>>

// Cada módulo registra suas rotas aqui. O canal segue o padrão "dominio:acao".
const routes: RouteMap = {
  ...settingsRoutes,
  ...dashboardRoutes,
  ...searchRoutes,
  ...clientsRoutes,
  ...productsRoutes,
  ...tablesRoutes,
  ...paymentsRoutes,
  ...creditRoutes,
  ...copaRoutes,
  ...financeRoutes,
  ...financeExportRoutes,
  ...fiscalRoutes
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
