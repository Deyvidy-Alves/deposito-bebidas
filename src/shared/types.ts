/**
 * DTOs compartilhados entre o processo principal e o renderer.
 * Mantidos como interfaces puras (sem Drizzle) para manter o renderer
 * isolado da camada de banco. Devem espelhar o schema em schema.ts.
 */

export type ProductUnit = 'un' | 'ml' | 'kg'
export type TableStatus = 'open' | 'closed'
export type PaymentMethod = 'cash' | 'pix' | 'card' | 'credit' | 'mixed'
export type CreditType = 'charge' | 'payment'
export type StockMovementType = 'in' | 'out' | 'adjust'

export interface Client {
  id: number
  name: string
  nickname: string | null
  phone: string | null
  createdAt: string
}

export interface Product {
  id: number
  name: string
  category: string | null
  unit: ProductUnit
  volumePerUnit: number
  costPrice: number
  salePrice: number
  minStock: number
  currentStock: number
  barcode: string | null
  active: boolean
  createdAt: string
}

export interface TableEntity {
  id: number
  label: string | null
  status: TableStatus
  createdAt: string
  closedAt: string | null
}

export interface TableItem {
  id: number
  tableId: number
  productId: number | null
  recipeId: number | null
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  clientId: number | null
  createdAt: string
}

export interface Payment {
  id: number
  tableId: number | null
  clientId: number | null
  method: PaymentMethod
  amount: number
  breakdown: string | null
  createdAt: string
}

export interface CreditTransaction {
  id: number
  clientId: number
  amount: number
  tableId: number | null
  type: CreditType
  description: string | null
  operator: string | null
  createdAt: string
}

export interface StockMovement {
  id: number
  productId: number
  type: StockMovementType
  quantity: number
  reason: string | null
  referenceId: number | null
  unitCost: number | null
  supplier: string | null
  operator: string | null
  createdAt: string
}

export interface CopaRecipe {
  id: number
  name: string
  totalMl: number
  costPrice: number
  salePrice: number
  marginPct: number | null
  active: boolean
  createdAt: string
}

export interface CopaIngredient {
  id: number
  recipeId: number
  productId: number
  mlUsed: number
  proportionalCost: number
}

export interface Expense {
  id: number
  description: string
  category: string | null
  amount: number
  date: string
  createdAt: string
}

// ─────────────────────── DTOs compostos ───────────────────────

export interface TableParticipant extends Client {
  settled: boolean
}

/** Mesa com participantes, itens e total calculado. */
export interface TableDetails extends TableEntity {
  participants: TableParticipant[]
  items: TableItem[]
  total: number
  /** Parte de cada participante conforme o rateio corrente. */
  perClientShare: Record<number, number>
}

/** Resumo de mesa para cards do dashboard / listagens. */
export interface TableSummary extends TableEntity {
  participants: TableParticipant[]
  total: number
  itemCount: number
}

export interface ClientWithBalance extends Client {
  /** Dívida total de crediário (saldo devedor). */
  debt: number
  openTables: number
}

export interface CopaRecipeWithIngredients extends CopaRecipe {
  ingredients: (CopaIngredient & { productName: string; unit: ProductUnit })[]
}

// ─────────────────────── Dashboard ───────────────────────

export interface DashboardOpenTable {
  id: number
  label: string | null
  status: TableStatus
  createdAt: string
  total: number
  itemCount: number
  participants: { id: number; name: string; nickname: string | null }[]
}

export interface DashboardLowStock {
  id: number
  name: string
  unit: ProductUnit
  currentStock: number
  minStock: number
}

export interface DashboardCash {
  cash: number
  pix: number
  card: number
  credit: number
  received: number
  pendingCredit: number
}

export interface DashboardData {
  openTables: DashboardOpenTable[]
  lowStock: DashboardLowStock[]
  cash: DashboardCash
}

// ─────────────────────── Busca global ───────────────────────

export type SearchResultKind = 'client' | 'product' | 'table'

export interface SearchResult {
  kind: SearchResultKind
  id: number
  title: string
  subtitle: string
}

/** Envelope padrão de resposta IPC. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
