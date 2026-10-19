import { useCallback, useEffect, useState } from 'react'
import { CircleDollarSign, Phone, Wallet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreditSettlementDialog } from './CreditSettlementDialog'
import { api } from '@/lib/api'
import { formatBRL, formatDateTime } from '@/lib/utils'
import type { ClientDetail } from '@shared/types'
import { toast } from 'sonner'

export function ClientDetailDialog({
  clientId,
  open,
  onOpenChange,
  onChanged
}: {
  clientId: number | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onChanged?: () => void
}): React.JSX.Element {
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [settleOpen, setSettleOpen] = useState(false)

  const reload = useCallback(() => {
    if (clientId == null) return
    api.clients
      .detail(clientId)
      .then(setDetail)
      .catch((err) => toast.error('Erro ao carregar cliente', { description: err.message }))
  }, [clientId])

  useEffect(() => {
    if (open && clientId != null) reload()
    else setDetail(null)
  }, [open, clientId, reload])

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {detail && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {detail.client.name}
                {detail.client.nickname && (
                  <span className="text-muted-foreground">({detail.client.nickname})</span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
                <Wallet className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo devedor</p>
                  <p className={`text-xl font-bold ${detail.debt > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatBRL(detail.debt)}
                  </p>
                </div>
              </div>
              {detail.client.phone && (
                <div className="flex items-center gap-2 text-base text-muted-foreground">
                  <Phone className="h-4 w-4" /> {detail.client.phone}
                </div>
              )}
              {detail.debt > 0 && (
                <Button className="ml-auto" onClick={() => setSettleOpen(true)}>
                  <CircleDollarSign className="h-4 w-4" /> Abater crédito
                </Button>
              )}
            </div>

            <Tabs defaultValue="tables" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="tables" className="flex-1">
                  Mesas ({detail.tableHistory.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex-1">
                  Pagamentos ({detail.payments.length})
                </TabsTrigger>
                <TabsTrigger value="credit" className="flex-1">
                  Crediário ({detail.creditTransactions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tables">
                <ScrollArea className="h-72">
                  <HistoryList
                    empty="Nenhuma mesa no histórico."
                    rows={detail.tableHistory.map((t) => ({
                      key: t.tableId,
                      left: t.label ?? `Mesa #${t.tableId}`,
                      sub: `${t.status === 'open' ? 'Aberta' : 'Fechada'} · ${formatDateTime(t.createdAt)}`,
                      right: formatBRL(t.share)
                    }))}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="payments">
                <ScrollArea className="h-72">
                  <HistoryList
                    empty="Nenhum pagamento registrado."
                    rows={detail.payments.map((p) => ({
                      key: p.id,
                      left: methodLabel(p.method),
                      sub: formatDateTime(p.createdAt),
                      right: formatBRL(p.amount)
                    }))}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="credit">
                <ScrollArea className="h-72">
                  <HistoryList
                    empty="Nenhuma movimentação de crediário."
                    rows={detail.creditTransactions.map((c) => ({
                      key: c.id,
                      left: c.type === 'charge' ? 'Cobrança' : 'Abatimento',
                      sub: `${c.description ?? ''} ${formatDateTime(c.createdAt)}`.trim(),
                      right: `${c.type === 'charge' ? '+' : '-'} ${formatBRL(c.amount)}`,
                      danger: c.type === 'charge'
                    }))}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>

    <CreditSettlementDialog
      clientId={clientId}
      clientName={detail?.client.nickname ?? detail?.client.name ?? ''}
      open={settleOpen}
      onOpenChange={setSettleOpen}
      onDone={() => {
        reload()
        onChanged?.()
      }}
    />
    </>
  )
}

function methodLabel(m: string): string {
  return (
    { cash: 'Dinheiro', pix: 'PIX', card: 'Cartão', credit: 'Crediário', mixed: 'Misto' }[m] ?? m
  )
}

function HistoryList({
  rows,
  empty
}: {
  rows: { key: number; left: string; sub: string; right: string; danger?: boolean }[]
  empty: string
}): React.JSX.Element {
  if (rows.length === 0)
    return <p className="py-10 text-center text-base text-muted-foreground">{empty}</p>
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between px-1 py-2.5">
          <div>
            <p className="font-medium">{r.left}</p>
            <p className="text-sm text-muted-foreground">{r.sub}</p>
          </div>
          <Badge variant={r.danger ? 'warning' : 'secondary'} className="text-sm">
            {r.right}
          </Badge>
        </div>
      ))}
    </div>
  )
}
