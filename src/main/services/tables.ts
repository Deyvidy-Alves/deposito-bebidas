import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../database'
import {
  clients,
  copaIngredients,
  copaRecipes,
  creditTransactions,
  payments,
  products,
  tableClients,
  tableItemConsumers,
  tableItems,
  tables
} from '../database/schema'
import { round2, splitEqually } from '../lib/money'
import { ingredientStockUnits } from '../lib/copa'
import { nowSql } from '../lib/time'
import { applyStockMovement } from './products'
import type {
  AddItemInput,
  CreateTableInput,
  PaymentMethod,
  ProductUnit,
  TableDetails,
  TableParticipant,
  TableSummary
} from '@shared/types'

/** Insuficiência de estoque sinalizada à UI para oferecer override. */
export const STOCK_ERROR_PREFIX = 'ESTOQUE_INSUFICIENTE:'

function tableTotal(tableId: number): number {
  const row = getDb()
    .select({ total: sql<number>`coalesce(sum(${tableItems.subtotal}), 0)` })
    .from(tableItems)
    .where(eq(tableItems.tableId, tableId))
    .get()
  return round2(row?.total ?? 0)
}

/** Quanto um participante já liquidou nesta mesa (pagamentos + cobranças de crediário). */
function settledAmount(tableId: number, clientId: number): number {
  const db = getDb()
  const paid = db
    .select({ v: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.tableId, tableId), eq(payments.clientId, clientId)))
    .get()
  const charged = db
    .select({ v: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.tableId, tableId),
        eq(creditTransactions.clientId, clientId),
        eq(creditTransactions.type, 'charge')
      )
    )
    .get()
  return round2((paid?.v ?? 0) + (charged?.v ?? 0))
}

export const TablesService = {
  create(input: CreateTableInput): number {
    const db = getDb()
    return db.transaction((tx) => {
      const t = tx
        .insert(tables)
        .values({ label: input.label?.trim() || null, status: 'open' })
        .returning()
        .get()
      const ids = Array.from(new Set(input.clientIds ?? []))
      for (const cid of ids) {
        tx.insert(tableClients).values({ tableId: t.id, clientId: cid }).run()
      }
      return t.id
    })
  },

  listSummaries(status?: 'open' | 'closed'): TableSummary[] {
    const db = getDb()
    const rows = status
      ? db.select().from(tables).where(eq(tables.status, status)).orderBy(desc(tables.id)).all()
      : db.select().from(tables).orderBy(desc(tables.id)).all()
    return rows.map((t) => {
      const parts = db
        .select({
          id: clients.id,
          name: clients.name,
          nickname: clients.nickname,
          phone: clients.phone,
          createdAt: clients.createdAt,
          settled: tableClients.settled
        })
        .from(tableClients)
        .innerJoin(clients, eq(tableClients.clientId, clients.id))
        .where(eq(tableClients.tableId, t.id))
        .all()
      const agg = db
        .select({
          total: sql<number>`coalesce(sum(${tableItems.subtotal}), 0)`,
          count: sql<number>`count(*)`
        })
        .from(tableItems)
        .where(eq(tableItems.tableId, t.id))
        .get()
      return {
        ...t,
        participants: parts as TableParticipant[],
        total: round2(agg?.total ?? 0),
        itemCount: agg?.count ?? 0
      }
    })
  },

  getDetails(tableId: number): TableDetails {
    const db = getDb()
    const t = db.select().from(tables).where(eq(tables.id, tableId)).get()
    if (!t) throw new Error('Comanda não encontrada.')

    const participants = db
      .select({
        id: clients.id,
        name: clients.name,
        nickname: clients.nickname,
        phone: clients.phone,
        createdAt: clients.createdAt,
        settled: tableClients.settled
      })
      .from(tableClients)
      .innerJoin(clients, eq(tableClients.clientId, clients.id))
      .where(eq(tableClients.tableId, tableId))
      .all() as TableParticipant[]

    const items = db
      .select()
      .from(tableItems)
      .where(eq(tableItems.tableId, tableId))
      .orderBy(tableItems.id)
      .all()

    const total = tableTotal(tableId)

    // Como cada item é dividido (sem linhas = dividido igualmente por todos).
    const consRows = db
      .select({
        itemId: tableItemConsumers.itemId,
        clientId: tableItemConsumers.clientId,
        quantity: tableItemConsumers.quantity
      })
      .from(tableItemConsumers)
      .innerJoin(tableItems, eq(tableItemConsumers.itemId, tableItems.id))
      .where(eq(tableItems.tableId, tableId))
      .all()
    const itemSplits: Record<number, { clientId: number; quantity: number }[]> = {}
    for (const r of consRows) {
      ;(itemSplits[r.itemId] ??= []).push({ clientId: r.clientId, quantity: r.quantity })
    }

    // Rateio por consumo: cada item é dividido pelo peso (quantidade) de quem pegou.
    const allIds = participants.map((p) => p.id)
    const consumption: Record<number, number> = {}
    for (const id of allIds) consumption[id] = 0
    for (const item of items) {
      const explicit = (itemSplits[item.id] ?? []).filter(
        (s) => allIds.includes(s.clientId) && s.quantity > 0
      )
      if (explicit.length > 0) {
        // Rateio proporcional ao que cada um pegou (soma sempre o subtotal).
        const totalW = explicit.reduce((a, s) => a + s.quantity, 0)
        const cents = Math.round(round2(item.subtotal) * 100)
        let used = 0
        explicit.forEach((s, idx) => {
          const portionCents =
            idx === explicit.length - 1
              ? cents - used
              : Math.round((cents * s.quantity) / totalW)
          used += portionCents
          consumption[s.clientId] = round2((consumption[s.clientId] ?? 0) + portionCents / 100)
        })
      } else {
        // Sem atribuição = dividido igualmente entre todos os participantes.
        const parts = splitEqually(item.subtotal, allIds.length || 1)
        allIds.forEach((cid, idx) => {
          consumption[cid] = round2((consumption[cid] ?? 0) + (parts[idx] ?? 0))
        })
      }
    }

    const perClientShare: Record<number, number> = {}
    for (const p of participants) {
      perClientShare[p.id] = p.settled
        ? settledAmount(tableId, p.id)
        : round2(consumption[p.id] ?? 0)
    }

    // Como cada participante liquidou: pagamentos reais + cobranças de crediário (fiado).
    const clientPayments: Record<number, { method: PaymentMethod; amount: number }[]> = {}
    const payRows = db
      .select({ clientId: payments.clientId, method: payments.method, amount: payments.amount })
      .from(payments)
      .where(eq(payments.tableId, tableId))
      .all()
    for (const r of payRows) {
      if (r.clientId == null) continue
      ;(clientPayments[r.clientId] ??= []).push({ method: r.method, amount: round2(r.amount) })
    }
    const creditRows = db
      .select({ clientId: creditTransactions.clientId, amount: creditTransactions.amount })
      .from(creditTransactions)
      .where(
        and(eq(creditTransactions.tableId, tableId), eq(creditTransactions.type, 'charge'))
      )
      .all()
    for (const r of creditRows) {
      ;(clientPayments[r.clientId] ??= []).push({ method: 'credit', amount: round2(r.amount) })
    }

    return { ...t, participants, items, total, perClientShare, itemSplits, clientPayments }
  },

  addClient(tableId: number, clientId: number): void {
    getDb()
      .insert(tableClients)
      .values({ tableId, clientId })
      .onConflictDoNothing()
      .run()
  },

  removeClient(tableId: number, clientId: number): void {
    const s = settledAmount(tableId, clientId)
    if (s > 0.009) throw new Error('Participante já possui pagamento/crediário nesta comanda.')
    getDb()
      .delete(tableClients)
      .where(and(eq(tableClients.tableId, tableId), eq(tableClients.clientId, clientId)))
      .run()
  },

  addItem(input: AddItemInput): void {
    const db = getDb()
    const qty = round2(input.quantity)
    if (!(qty > 0)) throw new Error('Quantidade deve ser maior que zero.')

    const t = db.select().from(tables).where(eq(tables.id, input.tableId)).get()
    if (!t || t.status !== 'open') throw new Error('Comanda não está aberta.')

    db.transaction(() => {
      if (input.recipeId) {
        TablesService.addRecipeItem(input, qty)
      } else if (input.productId) {
        TablesService.addProductItem(input, qty)
      } else {
        throw new Error('Informe um produto ou receita.')
      }
    })
  },

  // ─── Item de produto direto ───
  addProductItem(input: AddItemInput, qty: number): void {
    const db = getDb()
    const product = db.select().from(products).where(eq(products.id, input.productId!)).get()
    if (!product) throw new Error('Produto não encontrado.')

    if (product.currentStock < qty && !input.override) {
      throw new Error(
        `${STOCK_ERROR_PREFIX}${product.name} tem apenas ${product.currentStock} em estoque.`
      )
    }

    const unitPrice = round2(input.unitPrice ?? product.salePrice)
    const subtotal = round2(unitPrice * qty)

    const row = db
      .insert(tableItems)
      .values({
        tableId: input.tableId,
        productId: product.id,
        recipeId: null,
        description: product.name,
        quantity: qty,
        unitPrice,
        subtotal,
        clientId: input.clientId ?? null
      })
      .returning()
      .get()
    insertConsumers(row.id, input.consumerIds)

    applyStockMovement(product.id, 'out', qty, {
      reason: input.override ? `Venda (override: ${input.overrideReason ?? 'sem estoque'})` : 'Venda em comanda',
      referenceId: input.tableId
    })
  },

  // ─── Item de copão (receita) — baixa proporcional dos insumos ───
  addRecipeItem(input: AddItemInput, qty: number): void {
    const db = getDb()
    const recipe = db.select().from(copaRecipes).where(eq(copaRecipes.id, input.recipeId!)).get()
    if (!recipe) throw new Error('Receita não encontrada.')

    const ingredients = db
      .select()
      .from(copaIngredients)
      .where(eq(copaIngredients.recipeId, recipe.id))
      .all()

    // Checa estoque de todos os insumos antes de dar baixa.
    for (const ing of ingredients) {
      const p = db.select().from(products).where(eq(products.id, ing.productId)).get()
      if (!p) continue
      const deduct = deductionForIngredient(p.unit, p.volumePerUnit, ing.mlUsed, qty)
      if (p.currentStock < deduct && !input.override) {
        throw new Error(`${STOCK_ERROR_PREFIX}${p.name} insuficiente para a receita "${recipe.name}".`)
      }
    }

    const unitPrice = round2(input.unitPrice ?? recipe.salePrice)
    const subtotal = round2(unitPrice * qty)

    const row = db
      .insert(tableItems)
      .values({
        tableId: input.tableId,
        productId: null,
        recipeId: recipe.id,
        description: recipe.name,
        quantity: qty,
        unitPrice,
        subtotal,
        clientId: input.clientId ?? null
      })
      .returning()
      .get()
    insertConsumers(row.id, input.consumerIds)

    for (const ing of ingredients) {
      const p = db.select().from(products).where(eq(products.id, ing.productId)).get()
      if (!p) continue
      const deduct = deductionForIngredient(p.unit, p.volumePerUnit, ing.mlUsed, qty)
      applyStockMovement(p.id, 'out', round2(deduct), {
        reason: `Receita: ${recipe.name}`,
        referenceId: input.tableId
      })
    }
  },

  /** Ajusta a quantidade de um item já na mesa, sincronizando o estoque. */
  updateItemQuantity(itemId: number, newQty: number): void {
    const db = getDb()
    const item = db.select().from(tableItems).where(eq(tableItems.id, itemId)).get()
    if (!item) throw new Error('Item não encontrado.')
    const qty = round2(newQty)
    if (qty <= 0) {
      TablesService.removeItem(itemId)
      return
    }
    const delta = round2(qty - item.quantity)
    if (delta === 0) return

    db.transaction(() => {
      // delta > 0 = saída adicional; delta < 0 = devolução ao estoque.
      const applyDelta = (productId: number, perUnit: number): void => {
        const change = round2(perUnit * Math.abs(delta))
        if (delta > 0) {
          const p = db.select().from(products).where(eq(products.id, productId)).get()
          if (p && p.currentStock < change) {
            throw new Error(`${STOCK_ERROR_PREFIX}Estoque insuficiente para aumentar a quantidade.`)
          }
          applyStockMovement(productId, 'out', change, { reason: 'Ajuste de item', referenceId: item.tableId })
        } else {
          applyStockMovement(productId, 'in', change, { reason: 'Ajuste de item', referenceId: item.tableId })
        }
      }

      if (item.productId) {
        applyDelta(item.productId, 1)
      } else if (item.recipeId) {
        const ingredients = db
          .select()
          .from(copaIngredients)
          .where(eq(copaIngredients.recipeId, item.recipeId))
          .all()
        for (const ing of ingredients) {
          const p = db.select().from(products).where(eq(products.id, ing.productId)).get()
          if (!p) continue
          applyDelta(p.id, deductionForIngredient(p.unit, p.volumePerUnit, ing.mlUsed, 1))
        }
      }

      db.update(tableItems)
        .set({ quantity: qty, subtotal: round2(item.unitPrice * qty), updatedAt: nowSql })
        .where(eq(tableItems.id, itemId))
        .run()
    })
  },

  /**
   * Redefine como um item é dividido. Lista vazia (ou todas as quantidades = 0)
   * volta ao rateio igualitário entre todos os participantes.
   */
  setItemSplit(itemId: number, splits: { clientId: number; quantity: number }[]): void {
    const db = getDb()
    db.transaction(() => {
      db.delete(tableItemConsumers).where(eq(tableItemConsumers.itemId, itemId)).run()
      for (const s of splits) {
        if (s.quantity > 0) {
          db.insert(tableItemConsumers)
            .values({ itemId, clientId: s.clientId, quantity: round2(s.quantity) })
            .onConflictDoNothing()
            .run()
        }
      }
    })
  },

  removeItem(itemId: number): void {
    const db = getDb()
    const item = db.select().from(tableItems).where(eq(tableItems.id, itemId)).get()
    if (!item) return
    db.transaction(() => {
      // Devolve estoque (produto direto ou insumos do copão).
      if (item.productId) {
        applyStockMovement(item.productId, 'in', item.quantity, {
          reason: 'Estorno de item da comanda',
          referenceId: item.tableId
        })
      } else if (item.recipeId) {
        const ingredients = db
          .select()
          .from(copaIngredients)
          .where(eq(copaIngredients.recipeId, item.recipeId))
          .all()
        for (const ing of ingredients) {
          const p = db.select().from(products).where(eq(products.id, ing.productId)).get()
          if (!p) continue
          const back = deductionForIngredient(p.unit, p.volumePerUnit, ing.mlUsed, item.quantity)
          applyStockMovement(p.id, 'in', round2(back), {
            reason: 'Estorno de receita',
            referenceId: item.tableId
          })
        }
      }
      db.delete(tableItems).where(eq(tableItems.id, itemId)).run()
    })
  }
}

/** Define quem divide um item: lista vazia = dividido por todos os participantes. */
function insertConsumers(itemId: number, consumerIds?: number[]): void {
  if (!consumerIds || consumerIds.length === 0) return
  const db = getDb()
  for (const cid of Array.from(new Set(consumerIds))) {
    db.insert(tableItemConsumers).values({ itemId, clientId: cid }).onConflictDoNothing().run()
  }
}

/** Baixa em unidades de estoque do produto para um insumo por copão × quantidade. */
function deductionForIngredient(
  unit: ProductUnit,
  volumePerUnit: number,
  mlUsed: number,
  qty: number
): number {
  return ingredientStockUnits(unit, volumePerUnit, mlUsed) * qty
}

export const tablesRoutes = {
  'tables:create': (input: CreateTableInput) => TablesService.create(input),
  'tables:summaries': (status?: 'open' | 'closed') => TablesService.listSummaries(status),
  'tables:details': (tableId: number) => TablesService.getDetails(tableId),
  'tables:addClient': (p: { tableId: number; clientId: number }) =>
    TablesService.addClient(p.tableId, p.clientId),
  'tables:removeClient': (p: { tableId: number; clientId: number }) =>
    TablesService.removeClient(p.tableId, p.clientId),
  'tables:addItem': (input: AddItemInput) => TablesService.addItem(input),
  'tables:updateItemQuantity': (p: { itemId: number; quantity: number }) =>
    TablesService.updateItemQuantity(p.itemId, p.quantity),
  'tables:setItemSplit': (p: { itemId: number; splits: { clientId: number; quantity: number }[] }) =>
    TablesService.setItemSplit(p.itemId, p.splits),
  'tables:removeItem': (itemId: number) => TablesService.removeItem(itemId)
}
