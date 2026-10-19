import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Plus,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { DashboardData } from '@shared/types'
import { toast } from 'sonner'

const EMPTY: DashboardData = {
  openTables: [],
  lowStock: [],
  cash: { cash: 0, pix: 0, card: 0, credit: 0, received: 0, pendingCredit: 0 }
}

export function DashboardPage(): React.JSX.Element {
  const [data, setData] = useState<DashboardData>(EMPTY)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard.getData())
    } catch (err) {
      toast.error('Erro ao carregar o painel', { description: (err as Error).message })
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // atualiza a cada 10s
    return () => clearInterval(t)
  }, [load])

  const { cash, openTables, lowStock } = data

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Início" description="Visão geral do dia">
        <Button onClick={() => navigate('/mesas', { state: { newTable: true } })}>
          <Plus /> Nova mesa <span className="ml-1 opacity-60">F2</span>
        </Button>
      </PageHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-8">
          {/* Resumo do caixa */}
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SummaryCard
              title="Recebido hoje"
              value={cash.received}
              icon={<TrendingUp className="h-5 w-5" />}
              accent="success"
            />
            <SummaryCard
              title="Crediário pendente"
              value={cash.pendingCredit}
              icon={<Wallet className="h-5 w-5" />}
              accent="warning"
            />
            <SummaryCard
              title="Dinheiro + PIX"
              value={cash.cash + cash.pix}
              icon={<Banknote className="h-5 w-5" />}
            />
            <SummaryCard
              title="Cartão hoje"
              value={cash.card}
              icon={<CreditCard className="h-5 w-5" />}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Mesas abertas */}
            <section className="xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Mesas abertas</h2>
                <Badge variant="secondary">{openTables.length}</Badge>
              </div>
              {openTables.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  message="Nenhuma mesa aberta no momento."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => navigate('/mesas', { state: { newTable: true } })}
                    >
                      <Plus /> Abrir mesa
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {openTables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigate('/mesas', { state: { focusId: t.id } })}
                      className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{t.label ?? `Mesa #${t.id}`}</span>
                        <span className="text-lg font-bold text-primary">{formatBRL(t.total)}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {t.participants.length > 0
                          ? t.participants.map((p) => p.nickname ?? p.name).join(', ')
                          : 'Sem participantes'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t.itemCount} {t.itemCount === 1 ? 'item' : 'itens'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Estoque baixo */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Estoque baixo</h2>
                <Badge variant={lowStock.length > 0 ? 'destructive' : 'secondary'}>
                  {lowStock.length}
                </Badge>
              </div>
              {lowStock.length === 0 ? (
                <EmptyState
                  icon={<AlertTriangle className="h-8 w-8" />}
                  message="Nenhum produto abaixo do mínimo."
                />
              ) : (
                <Card>
                  <CardContent className="divide-y p-0">
                    {lowStock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-muted-foreground">mín. {p.minStock} {p.unit}</p>
                        </div>
                        <Badge variant={p.currentStock <= 0 ? 'destructive' : 'warning'}>
                          {p.currentStock} {p.unit}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function SummaryCard({
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
    accent === 'success'
      ? 'text-success'
      : accent === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color}`}>{formatBRL(value)}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  icon,
  message,
  action
}: {
  icon: React.ReactNode
  message: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-base text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
