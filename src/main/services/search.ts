import { and, eq, like, or, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { clients, products, tables, tableItems } from '../database/schema'
import { formatBRL } from '../lib/money'
import type { SearchResult } from '@shared/types'

export const SearchService = {
  global(query: string): SearchResult[] {
    const q = (query ?? '').trim()
    if (!q) return []
    const db = getDb()
    const term = `%${q}%`
    const results: SearchResult[] = []

    // Clientes por nome ou apelido
    const cs = db
      .select()
      .from(clients)
      .where(
        and(eq(clients.active, true), or(like(clients.name, term), like(clients.nickname, term)))
      )
      .limit(6)
      .all()
    for (const c of cs) {
      results.push({
        kind: 'client',
        id: c.id,
        title: c.nickname ? `${c.name} (${c.nickname})` : c.name,
        subtitle: c.phone ?? 'Cliente'
      })
    }

    // Produtos por nome, categoria ou código de barras
    const ps = db
      .select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          or(like(products.name, term), like(products.category, term), like(products.barcode, term))
        )
      )
      .limit(6)
      .all()
    for (const p of ps) {
      results.push({
        kind: 'product',
        id: p.id,
        title: p.name,
        subtitle: `${p.category ?? 'Produto'} · ${formatBRL(p.salePrice)} · ${p.currentStock} em estoque`
      })
    }

    // Mesas por número/id ou rótulo
    const numeric = Number(q.replace(/\D/g, ''))
    const ts = db
      .select()
      .from(tables)
      .where(
        or(
          like(tables.label, term),
          Number.isFinite(numeric) && numeric > 0 ? eq(tables.id, numeric) : sql`0`
        )
      )
      .limit(6)
      .all()
    for (const t of ts) {
      const totalRow = db
        .select({ total: sql<number>`coalesce(sum(${tableItems.subtotal}), 0)` })
        .from(tableItems)
        .where(eq(tableItems.tableId, t.id))
        .get()
      results.push({
        kind: 'table',
        id: t.id,
        title: t.label ? `${t.label}` : `Comanda #${t.id}`,
        subtitle: `${t.status === 'open' ? 'Aberta' : 'Fechada'} · ${formatBRL(totalRow?.total ?? 0)}`
      })
    }

    return results
  }
}

export const searchRoutes = {
  'search:global': (query: string) => SearchService.global(query)
}
