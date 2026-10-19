import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Banknote, CreditCard, Plus, TrendingUp, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
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
  const storeName = useSettingsStore((s) => s.storeName)

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

  const hoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(new Date())
  const dataLabel = hoje.charAt(0).toUpperCase() + hoje.slice(1)

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={`Olá, ${storeName}`} description={dataLabel}>
        <Button onClick={() => navigate('/mesas', { state: { newTable: true } })}>
          <Plus /> Nova comanda <span className="ml-1 opacity-60">F2</span>
        </Button>
      </PageHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-8">
          {/* Resumo do caixa */}
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              title="Recebido hoje"
              value={formatBRL(cash.received)}
              icon={TrendingUp}
              accent="success"
            />
            <StatCard
              title="Crediário pendente"
              value={formatBRL(cash.pendingCredit)}
              icon={Wallet}
              accent="warning"
            />
            <StatCard
              title="Dinheiro + PIX"
              value={formatBRL(cash.cash + cash.pix)}
              icon={Banknote}
              accent="primary"
            />
            <StatCard title="Cartão hoje" value={formatBRL(cash.card)} icon={CreditCard} />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Mesas abertas */}
            <section className="xl:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-lg font-semibold">Comandas abertas</h2>
                <Badge variant="secondary">{openTables.length}</Badge>
              </div>
              {openTables.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message="Nenhuma comanda aberta no momento."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => navigate('/mesas', { state: { newTable: true } })}
                    >
                      <Plus /> Abrir comanda
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
                        <span className="font-semibold">{t.label ?? `Comanda #${t.id}`}</span>
                        <span className="text-lg font-bold text-primary tabular-nums">
                          {formatBRL(t.total)}
                        </span>
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
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-lg font-semibold">Estoque baixo</h2>
                <Badge variant={lowStock.length > 0 ? 'destructive' : 'secondary'}>
                  {lowStock.length}
                </Badge>
              </div>
              {lowStock.length === 0 ? (
                <EmptyState icon={AlertTriangle} message="Nenhum produto abaixo do mínimo." />
              ) : (
                <Card>
                  <CardContent className="divide-y p-0">
                    {lowStock.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-muted-foreground">
                            mín. {p.minStock} {p.unit}
                          </p>
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
