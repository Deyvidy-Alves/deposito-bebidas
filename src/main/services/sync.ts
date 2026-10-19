import { isNull, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { syncOutbox } from '../database/schema'

/**
 * Camada de sincronização (fundação). Por enquanto só expõe a fila local
 * (outbox) populada pelos triggers. O motor de push/pull para a nuvem entra
 * na Fase 2 — ver SAAS-ROADMAP.md.
 */
export const SyncService = {
  /** Quantas mudanças locais ainda não foram enviadas para a nuvem. */
  pendingCount(): number {
    const row = getDb()
      .select({ n: sql<number>`count(*)` })
      .from(syncOutbox)
      .where(isNull(syncOutbox.syncedAt))
      .get()
    return row?.n ?? 0
  }
}

export const syncRoutes = {
  'sync:pendingCount': () => SyncService.pendingCount()
}
