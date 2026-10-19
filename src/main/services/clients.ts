import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { clients, creditTransactions, payments, tableClients, tables } from '../database/schema'
import { round2 } from '../lib/money'
import { nowSql } from '../lib/time'

/**
 * Lança um saldo devedor anterior (migração) como fiado de uma comanda fechada
 * rotulada "Saldo anterior". Assim a dívida vira crediário normal: aparece no
 * saldo, no histórico e pode ser recebida pelo abatimento (que só enxerga dívida
 * ligada a uma comanda). Precisa rodar dentro de uma transação.
 */
function seedOpeningDebt(tx: Tx, clientId: number, amount: number): void {
  const value = round2(amount)
  if (!(value > 0)) return
  const table = tx
    .insert(tables)
    .values({ label: 'Saldo anterior', status: 'closed', closedAt: nowSql })
    .returning()
    .get()
  tx.insert(tableClients).values({ tableId: table.id, clientId, settled: true }).run()
  tx.insert(creditTransactions)
    .values({
      clientId,
      amount: value,
      tableId: table.id,
      type: 'charge',
      description: 'Saldo anterior (migração)',
      operator: 'Migração'
    })
    .run()
}
import type { Client, ClientDetail, ClientInput, ClientWithBalance } from '@shared/types'

// Tipo da transação do Drizzle (para o helper rodar dentro do tx).
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

/** Saldo devedor de um cliente = soma de cobranças - pagamentos de crediário. */
function computeDebt(clientId: number): number {
  const row = getDb()
    .select({
      charges: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else 0 end), 0)`,
      pays: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'payment' then ${creditTransactions.amount} else 0 end), 0)`
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.clientId, clientId))
    .get()
  return round2((row?.charges ?? 0) - (row?.pays ?? 0))
}

export const ClientsService = {
  list(): ClientWithBalance[] {
    const db = getDb()
    const rows = db
      .select()
      .from(clients)
      .where(eq(clients.active, true))
      .orderBy(clients.name)
      .all()
    return rows.map((c) => {
      const openCount = db
        .select({ n: sql<number>`count(*)` })
        .from(tableClients)
        .innerJoin(tables, eq(tableClients.tableId, tables.id))
        .where(sql`${tableClients.clientId} = ${c.id} and ${tables.status} = 'open'`)
        .get()
      return {
        ...c,
        debt: computeDebt(c.id),
        openTables: openCount?.n ?? 0
      }
    })
  },

  get(id: number): Client | null {
    return getDb().select().from(clients).where(eq(clients.id, id)).get() ?? null
  },

  create(input: ClientInput): Client {
    const name = input.name?.trim()
    if (!name) throw new Error('Nome do cliente é obrigatório.')
    return getDb().transaction((tx) => {
      const row = tx
        .insert(clients)
        .values({
          name,
          nickname: input.nickname?.trim() || null,
          phone: input.phone?.trim() || null
        })
        .returning()
        .get()
      if (input.openingDebt && input.openingDebt > 0) {
        seedOpeningDebt(tx, row.id, input.openingDebt)
      }
      return row
    })
  },

  update(id: number, input: ClientInput): Client {
    const name = input.name?.trim()
    if (!name) throw new Error('Nome do cliente é obrigatório.')
    const row = getDb()
      .update(clients)
      .set({
        name,
        nickname: input.nickname?.trim() || null,
        phone: input.phone?.trim() || null,
        updatedAt: nowSql
      })
      .where(eq(clients.id, id))
      .returning()
      .get()
    if (!row) throw new Error('Cliente não encontrado.')
    return row
  },

  remove(id: number): void {
    const debt = computeDebt(id)
    if (debt > 0.009) {
      throw new Error(`Cliente possui saldo devedor de R$ ${debt.toFixed(2)}. Quite antes de excluir.`)
    }
    const open = getDb()
      .select({ n: sql<number>`count(*)` })
      .from(tableClients)
      .innerJoin(tables, eq(tableClients.tableId, tables.id))
      .where(sql`${tableClients.clientId} = ${id} and ${tables.status} = 'open'`)
      .get()
    if ((open?.n ?? 0) > 0) throw new Error('Cliente está em uma comanda aberta.')
    // Exclusão lógica — preserva o histórico de mesas/pagamentos.
    getDb().update(clients).set({ active: false, updatedAt: nowSql }).where(eq(clients.id, id)).run()
  },

  getDetail(id: number): ClientDetail {
    const db = getDb()
    const client = ClientsService.get(id)
    if (!client) throw new Error('Cliente não encontrado.')

    // Histórico de mesas em que participou, com a parte que lhe coube (via cobranças/pagamentos).
    const tableRows = db
      .select({
        tableId: tables.id,
        label: tables.label,
        status: tables.status,
        createdAt: tables.createdAt,
        closedAt: tables.closedAt
      })
      .from(tableClients)
      .innerJoin(tables, eq(tableClients.tableId, tables.id))
      .where(eq(tableClients.clientId, id))
      .orderBy(desc(tables.id))
      .all()

    const tableHistory = tableRows.map((t) => {
      const paid = db
        .select({ v: sql<number>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(sql`${payments.tableId} = ${t.tableId} and ${payments.clientId} = ${id}`)
        .get()
      const charged = db
        .select({ v: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)` })
        .from(creditTransactions)
        .where(
          sql`${creditTransactions.tableId} = ${t.tableId} and ${creditTransactions.clientId} = ${id} and ${creditTransactions.type} = 'charge'`
        )
        .get()
      return { ...t, share: round2((paid?.v ?? 0) + (charged?.v ?? 0)) }
    })

    const pays = db
      .select()
      .from(payments)
      .where(eq(payments.clientId, id))
      .orderBy(desc(payments.id))
      .all()

    const credits = db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.clientId, id))
      .orderBy(desc(creditTransactions.id))
      .all()

    return {
      client,
      debt: computeDebt(id),
      tableHistory,
      payments: pays,
      creditTransactions: credits
    }
  },

  debt: computeDebt
}

export const clientsRoutes = {
  'clients:list': () => ClientsService.list(),
  'clients:get': (id: number) => ClientsService.get(id),
  'clients:create': (input: ClientInput) => ClientsService.create(input),
  'clients:update': (p: { id: number; input: ClientInput }) =>
    ClientsService.update(p.id, p.input),
  'clients:remove': (id: number) => ClientsService.remove(id),
  'clients:detail': (id: number) => ClientsService.getDetail(id)
}
