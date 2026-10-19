import { invoke } from './ipc'
import type { DashboardData, SearchResult } from '@shared/types'

/**
 * Fachada tipada sobre o IPC. Cada domínio ganha seus métodos conforme
 * os módulos são implementados.
 */
export const api = {
  settings: {
    getAll: () => invoke<Record<string, string>>('settings:getAll'),
    get: (key: string) => invoke<string | null>('settings:get', key),
    set: (key: string, value: string) => invoke<void>('settings:set', { key, value })
  },
  dashboard: {
    getData: () => invoke<DashboardData>('dashboard:getData')
  },
  search: {
    global: (query: string) => invoke<SearchResult[]>('search:global', query)
  }
}

export type Api = typeof api
