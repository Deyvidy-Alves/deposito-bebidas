import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { creditTransactions, payments, tableClients, tables } from '../database/schema'
import { round2 } from '../lib/money'
import { nowSql } from '../lib/time'
import type { CloseTableInput, CloseTableResult, SettleParticipantInput } from '@shared/types'

/**
 * Modelo de contabilidade:
 * - `payments` = dinheiro realmente recebido (cash/pix/card e a parte paga de misto).
 * - `credit_transactions` = razão do crediário (charge aumenta a dívida,
 *   payment abate). Fiado NÃO gera linha em `payments`.
 */
export const PaymentsService = {
  closeTable(input: CloseTableInput): CloseTableResult {
    const db = getDb()
    return db.transaction(() => {
      const table = db.select().from(tables).where(eq(tables.id, input.tableId)).get()
      if (!table) throw new Error('Comanda não encontrada.')
      if (table.status !== 'open') throw new Error('Comanda já está fechada.')

      for (const s of input.settlements) {
        PaymentsService.settleOne(input.tableId, s, input.operator ?? null)
      }

      // Verifica se ainda há participantes não liquidados.
      const remaining = db
        .select({ n: sql<number>`count(*)` })
        .from(tableClients)
        .where(and(eq(tableClients.tableId, input.tableId), eq(tableClients.settled, false)))
        .get()
      const remainingParticipants = remaining?.n ?? 0

      if (remainingParticipants === 0) {
        db.update(tables)
          .set({ status: 'closed', closedAt: nowSql, updatedAt: nowSql })
          .where(eq(tables.id, input.tableId))
          .run()
        return { tableClosed: true, remainingParticipants: 0 }
      }
      return { tableClosed: false, remainingParticipants }
    })
  },

  settleOne(tableId: number, s: SettleParticipantInput, operator: string | null): void {
    const db = getDb()
    const amount = round2(s.amount)
    if (amount < 0) throw new Error('Valor inválido.')

    // Participante precisa estar na mesa e não liquidado.
    const tc = db
      .select()
      .from(tableClients)
      .where(and(eq(tableClients.tableId, tableId), eq(tableClients.clientId, s.clientId)))
      .get()
    if (!tc) throw new Error('Participante não pertence à comanda.')
    if (tc.settled) throw new Error('Participante já liquidado.')

    if (s.method === 'credit') {
      // Fiado integral: cobrança no crediário.
      db.insert(creditTransactions)
        .values({
          clientId: s.clientId,
          amount,
          tableId,
          type: 'charge',
          description: `Consumo comanda #${tableId}`,
          operator
        })
        .run()
    } else if (s.method === 'mixed') {
      const b = s.breakdown ?? {}
      const paid = round2((b.cash ?? 0) + (b.pix ?? 0) + (b.card ?? 0))
      const credit = round2(b.credit ?? 0)
      if (round2(paid + credit) !== amount) {
        throw new Error('A soma do pagamento misto não confere com o valor devido.')
      }
      if (paid > 0) {
        db.insert(payments)
          .values({
            tableId,
            clientId: s.clientId,
            method: 'mixed',
            amount: paid,
            breakdown: JSON.stringify(b)
          })
          .run()
      }
      if (credit > 0) {
        db.insert(creditTransactions)
          .values({
            clientId: s.clientId,
            amount: credit,
            tableId,
            type: 'charge',
            description: `Consumo comanda #${tableId} (parte no crediário)`,
            operator
          })
          .run()
      }
    } else {
      // cash / pix / card
      db.insert(payments)
        .values({ tableId, clientId: s.clientId, method: s.method, amount })
        .run()
    }

    db.update(tableClients)
      .set({ settled: true })
      .where(and(eq(tableClients.tableId, tableId), eq(tableClients.clientId, s.clientId)))
      .run()
  }
}

export const paymentsRoutes = {
  'payments:closeTable': (input: CloseTableInput) => PaymentsService.closeTable(input)
}
