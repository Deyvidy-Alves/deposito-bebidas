import { useCallback, useEffect, useState } from 'react'
import {
  Banknote,
  Download,
  FileText,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { FinanceGate } from './FinanceGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { cn, formatBRL, periodPreset, toISODate } from '@/lib/utils'
import type {
  CashFlowDay,
  Debtor,
  Expense,
  FinanceSummary,
  Period,
  ReportKind,
  SalesByDay,
  TopProduct
} from '@shared/types'
import { toast } from 'sonner'

export function FinanceiroPage(): React.JSX.Element {
  return (
    <FinanceGate>
      <FinanceContent />
    </FinanceGate>
  )
}

function FinanceContent(): React.JSX.Element {
  const [preset, setPreset] = useState<'day' | 'week' | 'month'>('month')
  const [period, setPeriod] = useState<Period>(periodPreset('month'))
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [tab, setTab] = useState('resumo')

  const applyPreset = (p: 'day' | 'week' | 'month'): void => {
    setPreset(p)
    setPeriod(periodPreset(p))
  }

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.finance.summary(period))
    } catch (err) {
      toast.error('Erro ao carregar financeiro', { description: (err as Error).message })
    }
  }, [period])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  async function exportPdf(): Promise<void> {
    try {
      const path = await api.finance.exportPdf(period)
      if (path) toast.success('PDF exportado', { description: path })
    } catch (err) {
      toast.error('Erro ao exportar PDF', { description: (err as Error).message })
    }
  }

  async function exportCsv(kind: ReportKind): Promise<void> {
    try {
      const path = await api.finance.exportCsv(kind, period)
      if (path) toast.success('CSV exportado', { description: path })
    } catch (err) {
      toast.error('Erro ao exportar CSV', { description: (err as Error).message })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Financeiro" description="Faturamento, custos e lucro">
        <Button variant="outline" onClick={exportPdf}>
          <FileText /> Exportar PDF
        </Button>
      </PageHeader>

      {/* Período */}
      <div className="flex flex-wrap items-center gap-3 border-b px-8 py-3">
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                preset === p ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {{ day: 'Hoje', week: '7 dias', month: 'Mês' }[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-40"
            value={period.from}
            max={period.to}
            onChange={(e) => setPeriod((pr) => ({ ...pr, from: e.target.value }))}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-40"
            value={period.to}
            max={toISODate(new Date())}
            onChange={(e) => setPeriod((pr) => ({ ...pr, to: e.target.value }))}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-8">
          {/* KPIs */}
          {summary && (
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              <Kpi title="Faturamento" value={summary.revenue} icon={<TrendingUp />} accent="success" />
              <Kpi title="CMV (custo)" value={summary.cmv} icon={<TrendingDown />} />
              <Kpi title="Lucro bruto" value={summary.grossProfit} icon={<Banknote />} />
              <Kpi title="Despesas" value={summary.expenses} icon={<TrendingDown />} accent="warning" />
              <Kpi
                title="Lucro líquido"
                value={summary.netProfit}
                icon={<Banknote />}
                accent={summary.netProfit >= 0 ? 'success' : 'warning'}
              />
              <Kpi title="Crediário pendente" value={summary.pendingCredit} icon={<Wallet />} accent="warning" />
            </section>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="devedores">Devedores</TabsTrigger>
              <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              {summary && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MethodCard label="Dinheiro" value={summary.byMethod.cash} />
                  <MethodCard label="PIX" value={summary.byMethod.pix} />
                  <MethodCard label="Cartão" value={summary.byMethod.card} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="produtos">
              <TopProductsReport period={period} onExport={() => exportCsv('top-products')} />
            </TabsContent>
            <TabsContent value="vendas">
              <SalesReport period={period} onExport={() => exportCsv('sales-by-day')} />
            </TabsContent>
            <TabsContent value="devedores">
              <DebtorsReport onExport={() => exportCsv('debtors')} />
            </TabsContent>
            <TabsContent value="fluxo">
              <CashFlowReport period={period} onExport={() => exportCsv('cash-flow')} />
            </TabsContent>
            <TabsContent value="despesas">
              <ExpensesReport period={period} onChanged={loadSummary} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}

function Kpi({
  title,
  value,
  icon,
  accent
}: {
  title: string
  value: number
  icon: React.ReactNode
  accent?: 'success' | 'warning'
}): React.JSX.Element {
  const color =
    accent === 'success' ? 'text-success' : accent === 'warning' ? 'text-warning' : 'text-foreground'
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold', color)}>{formatBRL(value)}</p>
      </CardContent>
    </Card>
  )
}

function MethodCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <span className="text-base text-muted-foreground">{label}</span>
        <span className="text-xl font-bold">{formatBRL(value)}</span>
      </CardContent>
    </Card>
  )
}

function ExportBar({ onExport }: { onExport: () => void }): React.JSX.Element {
  return (
    <div className="mb-2 flex justify-end">
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-4 w-4" /> Exportar CSV
      </Button>
    </div>
  )
}

function TopProductsReport({
  period,
  onExport
}: {
  period: Period
  onExport: () => void
}): React.JSX.Element {
  const [data, setData] = useState<TopProduct[]>([])
  useEffect(() => {
    api.finance.topProducts(period).then(setData).catch(() => setData([]))
  }, [period])
  return (
    <div>
      <ExportBar onExport={onExport} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow key={p.name}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-right">{p.quantity}</TableCell>
              <TableCell className="text-right font-semibold">{formatBRL(p.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && <EmptyRow />}
    </div>
  )
}

function SalesReport({ period, onExport }: { period: Period; onExport: () => void }): React.JSX.Element {
  const [data, setData] = useState<SalesByDay[]>([])
  useEffect(() => {
    api.finance.salesByDay(period).then(setData).catch(() => setData([]))
  }, [period])
  return (
    <div>
      <ExportBar onExport={onExport} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.date}>
              <TableCell>{d.date.split('-').reverse().join('/')}</TableCell>
              <TableCell className="text-right font-semibold">{formatBRL(d.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && <EmptyRow />}
    </div>
  )
}

function DebtorsReport({ onExport }: { onExport: () => void }): React.JSX.Element {
  const [data, setData] = useState<Debtor[]>([])
  useEffect(() => {
    api.finance.debtors().then(setData).catch(() => setData([]))
  }, [])
  return (
    <div>
      <ExportBar onExport={onExport} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Saldo devedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">
                {d.name}
                {d.nickname && <span className="ml-1 text-muted-foreground">({d.nickname})</span>}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="warning">{formatBRL(d.debt)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && <EmptyRow />}
    </div>
  )
}

function CashFlowReport({
  period,
  onExport
}: {
  period: Period
  onExport: () => void
}): React.JSX.Element {
  const [data, setData] = useState<CashFlowDay[]>([])
  useEffect(() => {
    api.finance.cashFlow(period).then(setData).catch(() => setData([]))
  }, [period])
  return (
    <div>
      <ExportBar onExport={onExport} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Entradas</TableHead>
            <TableHead className="text-right">Saídas</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.date}>
              <TableCell>{d.date.split('-').reverse().join('/')}</TableCell>
              <TableCell className="text-right text-success">{formatBRL(d.inflow)}</TableCell>
              <TableCell className="text-right text-destructive">{formatBRL(d.outflow)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatBRL(d.inflow - d.outflow)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && <EmptyRow />}
    </div>
  )
}

function ExpensesReport({
  period,
  onChanged
}: {
  period: Period
  onChanged: () => void
}): React.JSX.Element {
  const [data, setData] = useState<Expense[]>([])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))

  const load = useCallback(() => {
    api.finance.listExpenses(period).then(setData).catch(() => setData([]))
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  async function add(): Promise<void> {
    const value = Number(amount.replace(',', '.'))
    if (!description.trim() || !(value > 0)) {
      toast.warning('Informe descrição e valor.')
      return
    }
    try {
      await api.finance.addExpense({ description, category: category || null, amount: value, date })
      setDescription('')
      setCategory('')
      setAmount('')
      load()
      onChanged()
      toast.success('Despesa lançada.')
    } catch (err) {
      toast.error('Erro ao lançar despesa', { description: (err as Error).message })
    }
  }

  async function remove(id: number): Promise<void> {
    await api.finance.removeExpense(id)
    load()
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex-1 space-y-1" style={{ minWidth: 180 }}>
          <label className="text-xs text-muted-foreground">Descrição</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel" />
        </div>
        <div className="w-36 space-y-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fixo" />
        </div>
        <div className="w-28 space-y-1">
          <label className="text-xs text-muted-foreground">Valor</label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <label className="text-xs text-muted-foreground">Data</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={add}>
          <Plus className="h-4 w-4" /> Lançar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.date.split('-').reverse().join('/')}</TableCell>
              <TableCell className="font-medium">{e.description}</TableCell>
              <TableCell className="text-muted-foreground">{e.category ?? '—'}</TableCell>
              <TableCell className="text-right font-semibold">{formatBRL(e.amount)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && <EmptyRow />}
    </div>
  )
}

function EmptyRow(): React.JSX.Element {
  return <p className="py-8 text-center text-base text-muted-foreground">Sem dados no período.</p>
}
