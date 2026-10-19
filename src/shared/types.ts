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
  ingredients: (CopaIngredient & {
    productName: string
    unit: ProductUnit
    volumePerUnit: number
  })[]
}

export interface CopaIngredientInput {
  productId: number
  /** Quantidade usada: em ml quando medido por dose; em unidades caso contrário. */
  mlUsed: number
  /** Tamanho da embalagem em ml (dose). Vazio/0 = insumo medido por unidade (ex.: gelo). */
  bottleMl?: number | null
}

export interface CopaRecipeInput {
  name: string
  ingredients: CopaIngredientInput[]
  salePrice?: number | null
  marginPct?: number | null
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

// ─────────────────────── Inputs (formulários) ───────────────────────

export interface ClientInput {
  name: string
  nickname?: string | null
  phone?: string | null
}

export interface ProductInput {
  name: string
  category?: string | null
  unit: ProductUnit
  volumePerUnit?: number
  costPrice: number
  salePrice: number
  minStock?: number
  currentStock?: number
  barcode?: string | null
}

export interface StockEntryInput {
  productId: number
  quantity: number
  unitCost?: number | null
  supplier?: string | null
  operator?: string | null
  date?: string | null
}

export interface StockAdjustInput {
  productId: number
  newQuantity: number
  reason: string
  operator?: string | null
}

export interface CreateTableInput {
  clientIds: number[]
  label?: string | null
}

export interface AddItemInput {
  tableId: number
  productId?: number | null
  recipeId?: number | null
  quantity: number
  unitPrice?: number | null
  clientId?: number | null
  override?: boolean
  overrideReason?: string | null
}

export interface PaymentBreakdown {
  cash?: number
  pix?: number
  card?: number
  credit?: number
}

export interface SettleParticipantInput {
  clientId: number
  method: PaymentMethod
  amount: number
  breakdown?: PaymentBreakdown
}

export interface CloseTableInput {
  tableId: number
  settlements: SettleParticipantInput[]
  operator?: string | null
}

export interface CloseTableResult {
  tableClosed: boolean
  remainingParticipants: number
}

export interface CreditSettlementInput {
  clientId: number
  amount: number
  method: Exclude<PaymentMethod, 'credit' | 'mixed'>
  operator?: string | null
}

export interface CreditSettlementResult {
  requested: number
  applied: number
  remainingCredit: number // valor do abatimento que sobrou (crédito não usado)
  remainingDebt: number
  fullySettled: { tableId: number; label: string | null; amount: number }[]
  partiallySettled: { tableId: number; label: string | null; amount: number; left: number }[]
}

export interface DebtorTable {
  tableId: number
  label: string | null
  outstanding: number
}

export interface ClientDetail {
  client: Client
  debt: number
  tableHistory: {
    tableId: number
    label: string | null
    status: string
    createdAt: string
    closedAt: string | null
    share: number
  }[]
  payments: Payment[]
  creditTransactions: CreditTransaction[]
}

// ─────────────────────── Financeiro ───────────────────────

export interface Period {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface FinanceSummary {
  revenue: number // faturamento recebido (dinheiro + pix + cartão + misto)
  byMethod: { cash: number; pix: number; card: number }
  cmv: number // custo de mercadoria vendida
  grossProfit: number // faturamento - CMV
  expenses: number // despesas operacionais do período
  netProfit: number // lucro bruto - despesas
  pendingCredit: number // saldo devedor total (crediário)
}

export interface TopProduct {
  productId: number | null
  name: string
  quantity: number
  revenue: number
}

export interface SalesByDay {
  date: string
  total: number
}

export interface Debtor {
  id: number
  name: string
  nickname: string | null
  debt: number
}

export interface CashFlowDay {
  date: string
  inflow: number
  outflow: number
}

export interface ExpenseInput {
  description: string
  category?: string | null
  amount: number
  date: string
}

export type ReportKind = 'top-products' | 'sales-by-day' | 'debtors' | 'cash-flow' | 'summary'

// ─────────────────────── Fiscal (opcional) ───────────────────────

export interface FiscalConfig {
  enabled: boolean
  providerUrl: string
  apiToken: string
  cnpj: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoicePayload {
  cnpj: string
  tableId: number
  customer: { name: string; nickname: string | null } | null
  items: InvoiceItem[]
  total: number
  payments: { method: string; amount: number }[]
  issuedAt: string
}

export interface InvoiceResult {
  status: 'draft' | 'sent' | 'error'
  message: string
  payload: InvoicePayload
}

// ─────────────────────── Configurações ───────────────────────

export interface AppSettings {
  storeName: string
  fiscal: FiscalConfig
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
