import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import {
  clients,
  creditTransactions,
  expenses,
  payments,
  products,
  stockMovements,
  tableItems
} from '../database/schema'
import { round2 } from '../lib/money'
import { nowSql } from '../lib/time'
import { SettingsService } from './settings'
import type {
  CashFlowDay,
  Debtor,
  ExpenseInput,
  FinanceSummary,
  Period,
  SalesByDay,
  TopProduct,
  Expense
} from '@shared/types'

const PWD_KEY = 'financial_password'

function hashPassword(pwd: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pwd, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export const FinanceService = {
  // ─── Controle de acesso ───
  hasPassword(): boolean {
    const v = SettingsService.get(PWD_KEY)
    return !!v && v.length > 0
  },

  setPassword(pwd: string): void {
    if (!pwd || pwd.length < 4) throw new Error('A senha deve ter ao menos 4 caracteres.')
    SettingsService.set(PWD_KEY, hashPassword(pwd))
  },

  /** Altera a senha (exige a senha atual correta). */
  changePassword(current: string, next: string): void {
    if (FinanceService.hasPassword() && !FinanceService.verifyPassword(current)) {
      throw new Error('Senha atual incorreta.')
    }
    FinanceService.setPassword(next)
  },

  verifyPassword(pwd: string): boolean {
    const stored = SettingsService.get(PWD_KEY)
    if (!stored) return false
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) {
      // Compatibilidade: hash simples antigo
      return createHash('sha256').update(pwd).digest('hex') === stored
    }
    const candidate = scryptSync(pwd, salt, 64)
    const original = Buffer.from(hash, 'hex')
    return candidate.length === original.length && timingSafeEqual(candidate, original)
  },

  // ─── Resumo financeiro ───
  summary(period: Period): FinanceSummary {
    const db = getDb()
    const inRange = (col: typeof payments.createdAt): ReturnType<typeof sql> =>
      sql`date(${col}) between ${period.from} and ${period.to}`

    const byMethodRows = db
      .select({ method: payments.method, total: sql<number>`coalesce(sum(${payments.amount}),0)` })
      .from(payments)
      .where(inRange(payments.createdAt))
      .groupBy(payments.method)
      .all()

    let revenue = 0
    const byMethod = { cash: 0, pix: 0, card: 0 }
    for (const r of byMethodRows) {
      revenue += r.total
      if (r.method === 'cash') byMethod.cash += r.total
      else if (r.method === 'pix') byMethod.pix += r.total
      else if (r.method === 'card') byMethod.card += r.total
    }

    const cmvRow = db
      .select({
        v: sql<number>`coalesce(sum(${stockMovements.quantity} * ${products.costPrice}), 0)`
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(sql`${stockMovements.type} = 'out' and date(${stockMovements.createdAt}) between ${period.from} and ${period.to}`)
      .get()
    const cmv = round2(cmvRow?.v ?? 0)

    const expRow = db
      .select({ v: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(sql`${expenses.active} = 1 and ${expenses.date} between ${period.from} and ${period.to}`)
      .get()
    const expensesTotal = round2(expRow?.v ?? 0)

    const debtRow = db
      .select({
        v: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else -${creditTransactions.amount} end), 0)`
      })
      .from(creditTransactions)
      .get()

    revenue = round2(revenue)
    const grossProfit = round2(revenue - cmv)
    return {
      revenue,
      byMethod: {
        cash: round2(byMethod.cash),
        pix: round2(byMethod.pix),
        card: round2(byMethod.card)
      },
      cmv,
      grossProfit,
      expenses: expensesTotal,
      netProfit: round2(grossProfit - expensesTotal),
      pendingCredit: round2(debtRow?.v ?? 0)
    }
  },

  topProducts(period: Period): TopProduct[] {
    return getDb()
      .select({
        productId: tableItems.productId,
        name: tableItems.description,
        quantity: sql<number>`sum(${tableItems.quantity})`,
        revenue: sql<number>`sum(${tableItems.subtotal})`
      })
      .from(tableItems)
      .where(sql`date(${tableItems.createdAt}) between ${period.from} and ${period.to}`)
      .groupBy(tableItems.description)
      .orderBy(sql`sum(${tableItems.quantity}) desc`)
      .limit(20)
      .all()
      .map((r) => ({ ...r, quantity: round2(r.quantity), revenue: round2(r.revenue) }))
  },

  salesByDay(period: Period): SalesByDay[] {
    return getDb()
      .select({
        date: sql<string>`date(${payments.createdAt})`,
        total: sql<number>`coalesce(sum(${payments.amount}), 0)`
      })
      .from(payments)
      .where(sql`date(${payments.createdAt}) between ${period.from} and ${period.to}`)
      .groupBy(sql`date(${payments.createdAt})`)
      .orderBy(sql`date(${payments.createdAt})`)
      .all()
      .map((r) => ({ date: r.date, total: round2(r.total) }))
  },

  debtors(): Debtor[] {
    const rows = getDb()
      .select({
        id: clients.id,
        name: clients.name,
        nickname: clients.nickname,
        debt: sql<number>`coalesce(sum(case when ${creditTransactions.type} = 'charge' then ${creditTransactions.amount} else -${creditTransactions.amount} end), 0)`
      })
      .from(clients)
      .innerJoin(creditTransactions, eq(creditTransactions.clientId, clients.id))
      .groupBy(clients.id)
      .all()
    return rows
      .map((r) => ({ ...r, debt: round2(r.debt) }))
      .filter((r) => r.debt > 0.009)
      .sort((a, b) => b.debt - a.debt)
  },

  cashFlow(period: Period): CashFlowDay[] {
    const db = getDb()
    const inflow = db
      .select({
        date: sql<string>`date(${payments.createdAt})`,
        v: sql<number>`coalesce(sum(${payments.amount}), 0)`
      })
      .from(payments)
      .where(sql`date(${payments.createdAt}) between ${period.from} and ${period.to}`)
      .groupBy(sql`date(${payments.createdAt})`)
      .all()
    const outflow = db
      .select({ date: expenses.date, v: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(sql`${expenses.active} = 1 and ${expenses.date} between ${period.from} and ${period.to}`)
      .groupBy(expenses.date)
      .all()

    const map = new Map<string, CashFlowDay>()
    for (const i of inflow) map.set(i.date, { date: i.date, inflow: round2(i.v), outflow: 0 })
    for (const o of outflow) {
      const e = map.get(o.date) ?? { date: o.date, inflow: 0, outflow: 0 }
      e.outflow = round2(o.v)
      map.set(o.date, e)
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  },

  // ─── Despesas ───
  listExpenses(period: Period): Expense[] {
    return getDb()
      .select()
      .from(expenses)
      .where(sql`${expenses.active} = 1 and ${expenses.date} between ${period.from} and ${period.to}`)
      .orderBy(desc(expenses.date))
      .all()
  },

  addExpense(input: ExpenseInput): Expense {
    if (!input.description?.trim()) throw new Error('Informe a descrição da despesa.')
    if (!(input.amount > 0)) throw new Error('Valor deve ser maior que zero.')
    return getDb()
      .insert(expenses)
      .values({
        description: input.description.trim(),
        category: input.category?.trim() || null,
        amount: round2(input.amount),
        date: input.date
      })
      .returning()
      .get()
  },

  removeExpense(id: number): void {
    // Exclusão lógica — preserva histórico e sincroniza a remoção.
    getDb().update(expenses).set({ active: false, updatedAt: nowSql }).where(eq(expenses.id, id)).run()
  }
}

export const financeRoutes = {
  'finance:hasPassword': () => FinanceService.hasPassword(),
  'finance:setPassword': (pwd: string) => FinanceService.setPassword(pwd),
  'finance:changePassword': (p: { current: string; next: string }) =>
    FinanceService.changePassword(p.current, p.next),
  'finance:verifyPassword': (pwd: string) => FinanceService.verifyPassword(pwd),
  'finance:summary': (period: Period) => FinanceService.summary(period),
  'finance:topProducts': (period: Period) => FinanceService.topProducts(period),
  'finance:salesByDay': (period: Period) => FinanceService.salesByDay(period),
  'finance:debtors': () => FinanceService.debtors(),
  'finance:cashFlow': (period: Period) => FinanceService.cashFlow(period),
  'finance:listExpenses': (period: Period) => FinanceService.listExpenses(period),
  'finance:addExpense': (input: ExpenseInput) => FinanceService.addExpense(input),
  'finance:removeExpense': (id: number) => FinanceService.removeExpense(id)
}
