import { invoke } from './ipc'
import type {
  AddItemInput,
  Client,
  ClientDetail,
  ClientInput,
  ClientWithBalance,
  CloseTableInput,
  CloseTableResult,
  CopaRecipeInput,
  CopaRecipeWithIngredients,
  CreateTableInput,
  CreditSettlementInput,
  CreditSettlementResult,
  DashboardData,
  Debtor,
  DebtorTable,
  CashFlowDay,
  ExpenseInput,
  Expense,
  FinanceSummary,
  Period,
  ReportKind,
  SalesByDay,
  TopProduct,
  Product,
  ProductInput,
  SearchResult,
  StockAdjustInput,
  StockEntryInput,
  StockMovement,
  TableDetails,
  TableSummary
} from '@shared/types'

/**
 * Fachada tipada sobre o IPC. Cada domínio ganha seus métodos conforme
 * os módulos são implementados.
 */
export const api = {
  settings: {
    getAll: () => invoke<Record<string, string>>('settings:getAll'),
    get: (key: string) => invoke<string | null>('settings:get', key),
    set: (key: string, value: string) => invoke<void>('settings:set', { key, value })
  },
  dashboard: {
    getData: () => invoke<DashboardData>('dashboard:getData')
  },
  search: {
    global: (query: string) => invoke<SearchResult[]>('search:global', query)
  },
  clients: {
    list: () => invoke<ClientWithBalance[]>('clients:list'),
    get: (id: number) => invoke<Client | null>('clients:get', id),
    create: (input: ClientInput) => invoke<Client>('clients:create', input),
    update: (id: number, input: ClientInput) => invoke<Client>('clients:update', { id, input }),
    remove: (id: number) => invoke<void>('clients:remove', id),
    detail: (id: number) => invoke<ClientDetail>('clients:detail', id)
  },
  products: {
    list: (includeInactive?: boolean) => invoke<Product[]>('products:list', includeInactive),
    get: (id: number) => invoke<Product | null>('products:get', id),
    search: (query: string) => invoke<Product[]>('products:search', query),
    lowStock: () => invoke<Product[]>('products:lowStock'),
    create: (input: ProductInput) => invoke<Product>('products:create', input),
    update: (id: number, input: ProductInput) => invoke<Product>('products:update', { id, input }),
    remove: (id: number) => invoke<void>('products:remove', id),
    addEntry: (input: StockEntryInput) => invoke<void>('products:addEntry', input),
    adjust: (input: StockAdjustInput) => invoke<void>('products:adjust', input),
    movements: (productId: number) => invoke<StockMovement[]>('products:movements', productId)
  },
  tables: {
    create: (input: CreateTableInput) => invoke<number>('tables:create', input),
    summaries: (status?: 'open' | 'closed') => invoke<TableSummary[]>('tables:summaries', status),
    details: (tableId: number) => invoke<TableDetails>('tables:details', tableId),
    addClient: (tableId: number, clientId: number) =>
      invoke<void>('tables:addClient', { tableId, clientId }),
    removeClient: (tableId: number, clientId: number) =>
      invoke<void>('tables:removeClient', { tableId, clientId }),
    addItem: (input: AddItemInput) => invoke<void>('tables:addItem', input),
    removeItem: (itemId: number) => invoke<void>('tables:removeItem', itemId)
  },
  payments: {
    closeTable: (input: CloseTableInput) => invoke<CloseTableResult>('payments:closeTable', input)
  },
  credit: {
    debtorTables: (clientId: number) => invoke<DebtorTable[]>('credit:debtorTables', clientId),
    settle: (input: CreditSettlementInput) =>
      invoke<CreditSettlementResult>('credit:settle', input)
  },
  copa: {
    list: () => invoke<CopaRecipeWithIngredients[]>('copa:list'),
    get: (id: number) => invoke<CopaRecipeWithIngredients>('copa:get', id),
    create: (input: CopaRecipeInput) => invoke<CopaRecipeWithIngredients>('copa:create', input),
    update: (id: number, input: CopaRecipeInput) =>
      invoke<CopaRecipeWithIngredients>('copa:update', { id, input }),
    remove: (id: number) => invoke<void>('copa:remove', id)
  },
  finance: {
    hasPassword: () => invoke<boolean>('finance:hasPassword'),
    setPassword: (pwd: string) => invoke<void>('finance:setPassword', pwd),
    verifyPassword: (pwd: string) => invoke<boolean>('finance:verifyPassword', pwd),
    summary: (period: Period) => invoke<FinanceSummary>('finance:summary', period),
    topProducts: (period: Period) => invoke<TopProduct[]>('finance:topProducts', period),
    salesByDay: (period: Period) => invoke<SalesByDay[]>('finance:salesByDay', period),
    debtors: () => invoke<Debtor[]>('finance:debtors'),
    cashFlow: (period: Period) => invoke<CashFlowDay[]>('finance:cashFlow', period),
    listExpenses: (period: Period) => invoke<Expense[]>('finance:listExpenses', period),
    addExpense: (input: ExpenseInput) => invoke<Expense>('finance:addExpense', input),
    removeExpense: (id: number) => invoke<void>('finance:removeExpense', id),
    exportCsv: (kind: ReportKind, period: Period) =>
      invoke<string | null>('finance:exportCsv', { kind, period }),
    exportPdf: (period: Period) => invoke<string | null>('finance:exportPdf', period)
  }
}

export type Api = typeof api
