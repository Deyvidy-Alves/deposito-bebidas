import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import {
  clients,
  creditTransactions,
  payments,
  products,
  tableClients,
  tableItems,
  tables
} from '../database/schema'
import { round2 } from '../lib/money'
import type { DashboardCash, DashboardData, DashboardOpenTable } from '@shared/types'

export const DashboardService = {
  getData(): DashboardData {
    const db = getDb()

    // ── Mesas abertas com participantes e total parcial ──
    const openRows = db.select().from(tables).where(eq(tables.status, 'open')).all()
    const openTables: DashboardOpenTable[] = openRows.map((t) => {
      const totalRow = db
        .select({ total: sql<number>`coalesce(sum(${tableItems.subtotal}), 0)`, count: sql<number>`count(*)` })
        .from(tableItems)
        .where(eq(tableItems.tableId, t.id))
        .get()

      const parts = db
        .select({ id: clients.id, name: clients.name, nickname: clients.nickname })
        .from(tableClients)
        .innerJoin(clients, eq(tableClients.clientId, clients.id))
        .where(eq(tableClients.tableId, t.id))
        .all()

      return {
        id: t.id,
        label: t.label,
        status: t.status,
        createdAt: t.createdAt,
        total: round2(totalRow?.total ?? 0),
        itemCount: totalRow?.count ?? 0,
        participants: parts
      }
    })

    // ── Estoque baixo (ativo e abaixo/igual ao mínimo) ──
    const lowStock = db
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        currentStock: products.currentStock,
        minStock: products.minStock
      })
      .from(products)
      .where(
        and(eq(products.active, true), sql`${products.currentStock} <= ${products.minStock}`)
      )
      .all()

    // ── Caixa do dia ──
    const today = sql`date('now', 'localtime')`
    const payRows = db
      .select({ method: payments.method, total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(sql`date(${payments.createdAt}) = ${today}`)
      .groupBy(payments.method)
      .all()

    const cash: DashboardCash = {
      cash: 0,
      pix: 0,
      card: 0,
      credit: 0,
      received: 0,
      pendingCredit: 0
    }
    for (const r of payRows) {
      if (r.method === 'cash') cash.cash += r.total
      else if (r.method === 'pix') cash.pix += r.total
      else if (r.method === 'card') cash.card += r.total
      else if (r.method === 'credit') cash.credit += r.total
    }
    cash.received = round2(cash.cash + cash.pix + cash.card)
    cash.cash = round2(cash.cash)
    cash.pix = round2(cash.pix)
    cash.card = round2(cash.card)
    cash.credit = round2(cash.credit)

    // Saldo devedor total = cobranças - pagamentos de crediário
    const debtRow = db
      .select({
        charges: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else 0 end), 0)`,
        pays: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'payment' then ${creditTransactions.amount} else 0 end), 0)`
      })
      .from(creditTransactions)
      .get()
    cash.pendingCredit = round2((debtRow?.charges ?? 0) - (debtRow?.pays ?? 0))

    return { openTables, lowStock, cash }
  }
}

export const dashboardRoutes = {
  'dashboard:getData': () => DashboardService.getData()
}
