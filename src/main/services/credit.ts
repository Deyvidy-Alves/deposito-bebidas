import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { creditTransactions, payments, tables } from '../database/schema'
import { round2 } from '../lib/money'
import type {
  CreditSettlementInput,
  CreditSettlementResult,
  DebtorTable
} from '@shared/types'

/** Saldo em aberto por mesa para um cliente (cobranças - abatimentos), só > 0. */
function outstandingByTable(clientId: number): DebtorTable[] {
  const db = getDb()
  const rows = db
    .select({
      tableId: creditTransactions.tableId,
      label: tables.label,
      outstanding: sql<number>`sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else -${creditTransactions.amount} end)`
    })
    .from(creditTransactions)
    .leftJoin(tables, eq(creditTransactions.tableId, tables.id))
    .where(and(eq(creditTransactions.clientId, clientId), sql`${creditTransactions.tableId} is not null`))
    .groupBy(creditTransactions.tableId)
    .all()

  return rows
    .map((r) => ({
      tableId: r.tableId as number,
      label: r.label ?? null,
      outstanding: round2(r.outstanding ?? 0)
    }))
    .filter((r) => r.outstanding > 0.009)
}

function totalDebt(clientId: number): number {
  const row = getDb()
    .select({
      v: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else -${creditTransactions.amount} end), 0)`
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.clientId, clientId))
    .get()
  return round2(row?.v ?? 0)
}

export const CreditService = {
  debtorTables: outstandingByTable,
  debt: totalDebt,

  /**
   * Abatimento inteligente: distribui o valor informado pelas mesas com saldo
   * devedor, começando pelas de MENOR valor e progredindo para as maiores até
   * esgotar o crédito. Cada operação vira uma transação de crediário (payment)
   * e uma entrada real de caixa (payments).
   */
  settle(input: CreditSettlementInput): CreditSettlementResult {
    const db = getDb()
    const requested = round2(input.amount)
    if (!(requested > 0)) throw new Error('Informe um valor maior que zero.')

    return db.transaction(() => {
      // Mesas com dívida, ordenadas pela parte do cliente (menor → maior).
      const debts = outstandingByTable(input.clientId).sort((a, b) => a.outstanding - b.outstanding)

      let remaining = requested
      let applied = 0
      const fullySettled: CreditSettlementResult['fullySettled'] = []
      const partiallySettled: CreditSettlementResult['partiallySettled'] = []

      for (const d of debts) {
        if (remaining <= 0.009) break
        const pay = round2(Math.min(remaining, d.outstanding))

        db.insert(creditTransactions)
          .values({
            clientId: input.clientId,
            amount: pay,
            tableId: d.tableId,
            type: 'payment',
            description: `Abatimento (${input.method})`,
            operator: input.operator ?? null
          })
          .run()

        // Entrada real de caixa referente à quitação do fiado.
        db.insert(payments)
          .values({
            tableId: d.tableId,
            clientId: input.clientId,
            method: input.method,
            amount: pay
          })
          .run()

        if (round2(pay) >= round2(d.outstanding)) {
          fullySettled.push({ tableId: d.tableId, label: d.label, amount: pay })
        } else {
          partiallySettled.push({
            tableId: d.tableId,
            label: d.label,
            amount: pay,
            left: round2(d.outstanding - pay)
          })
        }

        remaining = round2(remaining - pay)
        applied = round2(applied + pay)
      }

      return {
        requested,
        applied,
        remainingCredit: round2(requested - applied),
        remainingDebt: totalDebt(input.clientId),
        fullySettled,
        partiallySettled
      }
    })
  }
}

export const creditRoutes = {
  'credit:debtorTables': (clientId: number) => CreditService.debtorTables(clientId),
  'credit:settle': (input: CreditSettlementInput) => CreditService.settle(input)
}
