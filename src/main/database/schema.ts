import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core'

/**
 * Schema do banco (SQLite via Drizzle ORM).
 *
 * Convenções:
 * - Valores monetários em `real` (reais), sempre arredondados a 2 casas na
 *   lógica de negócio (ver src/main/lib/money.ts).
 * - Datas em texto ISO no horário local ("YYYY-MM-DD HH:MM:SS"), como o
 *   app legado, para facilitar filtros por período nos relatórios.
 */

const timestamp = (name: string) =>
  text(name)
    .notNull()
    .default(sql`(datetime('now', 'localtime'))`)

// ───────────────────────────── Clientes ─────────────────────────────
export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nickname: text('nickname'),
  phone: text('phone'),
  createdAt: timestamp('created_at')
})

// ─────────────────────── Mesas (sessões de consumo) ──────────────────
export const tables = sqliteTable('tables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Rótulo opcional para a mesa (ex.: "Mesa 3", "Varanda")
  label: text('label'),
  status: text('status', { enum: ['open', 'closed'] })
    .notNull()
    .default('open'),
  createdAt: timestamp('created_at'),
  closedAt: text('closed_at')
})

// Relação N:N entre mesas e clientes
export const tableClients = sqliteTable(
  'table_clients',
  {
    tableId: integer('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'cascade' }),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    // Indica que o participante já pagou sua parte e "saiu" (fechamento parcial)
    settled: integer('settled', { mode: 'boolean' }).notNull().default(false)
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tableId, t.clientId] })
  })
)

// ──────────────────────────── Produtos ──────────────────────────────
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  unit: text('unit', { enum: ['un', 'ml', 'kg'] })
    .notNull()
    .default('un'),
  // Volume/peso por unidade (ex.: 1000 para garrafa de 1L em ml)
  volumePerUnit: real('volume_per_unit').notNull().default(0),
  costPrice: real('cost_price').notNull().default(0),
  salePrice: real('sale_price').notNull().default(0),
  minStock: real('min_stock').notNull().default(0),
  currentStock: real('current_stock').notNull().default(0),
  barcode: text('barcode'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp('created_at')
})

// ─────────────────── Itens consumidos em uma mesa ───────────────────
export const tableItems = sqliteTable(
  'table_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableId: integer('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id),
    // Receita de copão vendida (nulo quando é produto direto)
    recipeId: integer('recipe_id').references(() => copaRecipes.id),
    description: text('description').notNull(),
    quantity: real('quantity').notNull().default(1),
    unitPrice: real('unit_price').notNull().default(0),
    subtotal: real('subtotal').notNull().default(0),
    // Opcional: qual cliente consumiu (para rateio manual por item)
    clientId: integer('client_id').references(() => clients.id),
    createdAt: timestamp('created_at')
  },
  (t) => ({
    byTable: index('idx_table_items_table').on(t.tableId)
  })
)

// ───────────────────────────── Pagamentos ───────────────────────────
export const payments = sqliteTable(
  'payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableId: integer('table_id').references(() => tables.id, { onDelete: 'set null' }),
    clientId: integer('client_id').references(() => clients.id),
    method: text('method', {
      enum: ['cash', 'pix', 'card', 'credit', 'mixed']
    }).notNull(),
    amount: real('amount').notNull().default(0),
    // Detalhamento de pagamento misto (JSON: { cash, pix, card, credit })
    breakdown: text('breakdown'),
    createdAt: timestamp('created_at')
  },
  (t) => ({
    byTable: index('idx_payments_table').on(t.tableId),
    byClient: index('idx_payments_client').on(t.clientId)
  })
)

// ───────────────── Transações de crédito (crediário) ────────────────
export const creditTransactions = sqliteTable(
  'credit_transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clientId: integer('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    // Positivo sempre; o sinal é dado por `type`
    amount: real('amount').notNull().default(0),
    tableId: integer('table_id').references(() => tables.id, { onDelete: 'set null' }),
    // charge = aumenta dívida; payment = abate dívida
    type: text('type', { enum: ['charge', 'payment'] }).notNull(),
    description: text('description'),
    operator: text('operator'),
    createdAt: timestamp('created_at')
  },
  (t) => ({
    byClient: index('idx_credit_client').on(t.clientId),
    byTable: index('idx_credit_table').on(t.tableId)
  })
)

// ──────────────────── Movimentações de estoque ──────────────────────
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // in = entrada; out = saída (venda/copão); adjust = ajuste manual
    type: text('type', { enum: ['in', 'out', 'adjust'] }).notNull(),
    quantity: real('quantity').notNull().default(0),
    reason: text('reason'),
    // Origem: id da mesa, do item, da entrada de compra, etc.
    referenceId: integer('reference_id'),
    // Custo unitário da entrada (para histórico de compras)
    unitCost: real('unit_cost'),
    supplier: text('supplier'),
    operator: text('operator'),
    createdAt: timestamp('created_at')
  },
  (t) => ({
    byProduct: index('idx_stock_product').on(t.productId)
  })
)

// ───────────────────── Receitas de copão ────────────────────────────
export const copaRecipes = sqliteTable('copa_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  totalMl: real('total_ml').notNull().default(0),
  costPrice: real('cost_price').notNull().default(0),
  salePrice: real('sale_price').notNull().default(0),
  marginPct: real('margin_pct'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp('created_at')
})

export const copaIngredients = sqliteTable(
  'copa_ingredients',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => copaRecipes.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    mlUsed: real('ml_used').notNull().default(0),
    proportionalCost: real('proportional_cost').notNull().default(0)
  },
  (t) => ({
    byRecipe: index('idx_copa_ing_recipe').on(t.recipeId)
  })
)

// ───────────────────────────── Despesas ─────────────────────────────
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  description: text('description').notNull(),
  category: text('category'),
  amount: real('amount').notNull().default(0),
  // Data de competência (YYYY-MM-DD)
  date: text('date').notNull(),
  createdAt: timestamp('created_at')
})

// ──────────────────── Configurações do sistema ──────────────────────
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
})

// ─────────────────────────── Tipos inferidos ────────────────────────
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Table = typeof tables.$inferSelect
export type NewTable = typeof tables.$inferInsert
export type TableClient = typeof tableClients.$inferSelect
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type TableItem = typeof tableItems.$inferSelect
export type NewTableItem = typeof tableItems.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
export type CopaRecipe = typeof copaRecipes.$inferSelect
export type NewCopaRecipe = typeof copaRecipes.$inferInsert
export type CopaIngredient = typeof copaIngredients.$inferSelect
export type NewCopaIngredient = typeof copaIngredients.$inferInsert
export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
export type Setting = typeof settings.$inferSelect
