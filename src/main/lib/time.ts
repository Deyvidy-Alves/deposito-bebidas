import { sql } from 'drizzle-orm'

/**
 * Fragmento SQL do "agora" no horário local, no mesmo formato ISO usado pelos
 * defaults do schema ("YYYY-MM-DD HH:MM:SS"). Usado para marcar `updated_at` nas
 * escritas — base da sincronização na nuvem (ver SAAS-ROADMAP.md).
 */
export const nowSql = sql`(datetime('now', 'localtime'))`
