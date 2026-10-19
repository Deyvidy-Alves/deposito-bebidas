import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { getDb } from '../database'
import { products, stockMovements } from '../database/schema'
import { round2 } from '../lib/money'
import { nowSql } from '../lib/time'
import type {
  Product,
  ProductInput,
  StockAdjustInput,
  StockEntryInput,
  StockMovement
} from '@shared/types'

/**
 * Aplica uma movimentação de estoque e atualiza o saldo do produto de forma
 * atômica. Usado por entradas, ajustes, vendas em mesa e copões.
 */
export function applyStockMovement(
  productId: number,
  type: 'in' | 'out' | 'adjust',
  quantity: number,
  opts: {
    reason?: string | null
    referenceId?: number | null
    unitCost?: number | null
    supplier?: string | null
    operator?: string | null
    delta?: number // variação explícita no saldo (para ajuste)
  } = {}
): void {
  const db = getDb()
  const delta = opts.delta ?? (type === 'in' ? quantity : type === 'out' ? -quantity : 0)
  db.update(products)
    .set({ currentStock: sql`${products.currentStock} + ${delta}`, updatedAt: nowSql })
    .where(eq(products.id, productId))
    .run()
  db.insert(stockMovements)
    .values({
      productId,
      type,
      quantity,
      reason: opts.reason ?? null,
      referenceId: opts.referenceId ?? null,
      unitCost: opts.unitCost ?? null,
      supplier: opts.supplier ?? null,
      operator: opts.operator ?? null
    })
    .run()
}

export const ProductsService = {
  list(includeInactive = false): Product[] {
    const db = getDb()
    const rows = includeInactive
      ? db.select().from(products).orderBy(products.name).all()
      : db.select().from(products).where(eq(products.active, true)).orderBy(products.name).all()
    return rows
  },

  get(id: number): Product | null {
    return getDb().select().from(products).where(eq(products.id, id)).get() ?? null
  },

  search(query: string): Product[] {
    const q = (query ?? '').trim()
    const db = getDb()
    if (!q) return db.select().from(products).where(eq(products.active, true)).limit(30).all()
    const term = `%${q}%`
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          or(like(products.name, term), like(products.category, term), like(products.barcode, term))
        )
      )
      .limit(30)
      .all()
  },

  lowStock(): Product[] {
    return getDb()
      .select()
      .from(products)
      .where(and(eq(products.active, true), sql`${products.currentStock} <= ${products.minStock}`))
      .all()
  },

  create(input: ProductInput): Product {
    if (!input.name?.trim()) throw new Error('Nome do produto é obrigatório.')
    const db = getDb()
    return db.transaction((tx) => {
      const initial = round2(input.currentStock ?? 0)
      const row = tx
        .insert(products)
        .values({
          name: input.name.trim(),
          category: input.category?.trim() || null,
          unit: input.unit,
          volumePerUnit: round2(input.volumePerUnit ?? 0),
          costPrice: round2(input.costPrice ?? 0),
          salePrice: round2(input.salePrice ?? 0),
          minStock: round2(input.minStock ?? 0),
          currentStock: initial,
          barcode: input.barcode?.trim() || null
        })
        .returning()
        .get()
      if (initial > 0) {
        tx.insert(stockMovements)
          .values({
            productId: row.id,
            type: 'in',
            quantity: initial,
            reason: 'Estoque inicial',
            unitCost: round2(input.costPrice ?? 0)
          })
          .run()
      }
      return row
    })
  },

  update(id: number, input: ProductInput): Product {
    if (!input.name?.trim()) throw new Error('Nome do produto é obrigatório.')
    // Estoque não é alterado por update direto — use entrada/ajuste.
    const row = getDb()
      .update(products)
      .set({
        name: input.name.trim(),
        category: input.category?.trim() || null,
        unit: input.unit,
        volumePerUnit: round2(input.volumePerUnit ?? 0),
        costPrice: round2(input.costPrice ?? 0),
        salePrice: round2(input.salePrice ?? 0),
        minStock: round2(input.minStock ?? 0),
        barcode: input.barcode?.trim() || null,
        updatedAt: nowSql
      })
      .where(eq(products.id, id))
      .returning()
      .get()
    if (!row) throw new Error('Produto não encontrado.')
    return row
  },

  remove(id: number): void {
    // Exclusão lógica para preservar histórico de vendas/movimentações.
    getDb().update(products).set({ active: false, updatedAt: nowSql }).where(eq(products.id, id)).run()
  },

  addEntry(input: StockEntryInput): void {
    if (!(input.quantity > 0)) throw new Error('Quantidade da entrada deve ser maior que zero.')
    getDb().transaction(() => {
      applyStockMovement(input.productId, 'in', round2(input.quantity), {
        reason: 'Entrada de compra',
        unitCost: input.unitCost != null ? round2(input.unitCost) : null,
        supplier: input.supplier ?? null,
        operator: input.operator ?? null
      })
      // Atualiza o preço de custo pelo custo da última compra, se informado.
      if (input.unitCost != null && input.unitCost > 0) {
        getDb()
          .update(products)
          .set({ costPrice: round2(input.unitCost), updatedAt: nowSql })
          .where(eq(products.id, input.productId))
          .run()
      }
    })
  },

  adjust(input: StockAdjustInput): void {
    if (!input.reason?.trim()) throw new Error('Motivo do ajuste é obrigatório.')
    const current = ProductsService.get(input.productId)
    if (!current) throw new Error('Produto não encontrado.')
    const delta = round2(input.newQuantity - current.currentStock)
    applyStockMovement(input.productId, 'adjust', Math.abs(delta), {
      reason: input.reason.trim(),
      operator: input.operator ?? null,
      delta
    })
  },

  categories(): string[] {
    const rows = getDb()
      .selectDistinct({ category: products.category })
      .from(products)
      .all()
    return rows.map((r) => r.category).filter((c): c is string => !!c)
  },

  movements(productId: number): StockMovement[] {
    return getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.id))
      .limit(200)
      .all()
  }
}

export const productsRoutes = {
  'products:list': (includeInactive?: boolean) => ProductsService.list(includeInactive),
  'products:get': (id: number) => ProductsService.get(id),
  'products:search': (query: string) => ProductsService.search(query),
  'products:lowStock': () => ProductsService.lowStock(),
  'products:categories': () => ProductsService.categories(),
  'products:create': (input: ProductInput) => ProductsService.create(input),
  'products:update': (p: { id: number; input: ProductInput }) =>
    ProductsService.update(p.id, p.input),
  'products:remove': (id: number) => ProductsService.remove(id),
  'products:addEntry': (input: StockEntryInput) => ProductsService.addEntry(input),
  'products:adjust': (input: StockAdjustInput) => ProductsService.adjust(input),
  'products:movements': (productId: number) => ProductsService.movements(productId)
}
