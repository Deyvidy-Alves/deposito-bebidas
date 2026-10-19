import { useState } from 'react'
import { FileDown, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { formatBRL, formatDateTime, summarizePayments } from '@/lib/utils'
import type { TableDetails } from '@shared/types'
import { toast } from 'sonner'

export function BillDialog({
  detail,
  open,
  onOpenChange
}: {
  detail: TableDetails | null
  open: boolean
  onOpenChange: (o: boolean) => void
}): React.JSX.Element {
  const [exporting, setExporting] = useState(false)

  async function exportPdf(): Promise<void> {
    if (!detail) return
    setExporting(true)
    try {
      const path = await api.tables.billPdf(detail.id)
      if (path) toast.success('Comanda salva', { description: path })
    } catch (err) {
      toast.error('Erro ao gerar a comanda', { description: (err as Error).message })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Conta — {detail?.label ?? `Mesa #${detail?.id}`}
          </DialogTitle>
        </DialogHeader>

        {detail && (
          <>
            <p className="text-sm text-muted-foreground">
              Aberta {formatDateTime(detail.createdAt)}
              {detail.closedAt && ` · Fechada ${formatDateTime(detail.closedAt)}`}
            </p>

            <ScrollArea className="max-h-[50vh]">
              <div className="pr-2">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Itens</p>
                <div className="space-y-1">
                  {detail.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-base">
                      <span>
                        <span className="text-muted-foreground">{i.quantity}×</span> {i.description}
                      </span>
                      <span className="font-medium">{formatBRL(i.subtotal)}</span>
                    </div>
                  ))}
                  {detail.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sem itens.</p>
                  )}
                </div>

                <Separator className="my-3" />

                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Divisão por pessoa
                </p>
                <div className="space-y-1">
                  {detail.participants.map((p) => {
                    const pays = detail.clientPayments[p.id] ?? []
                    const isFiado = pays.length > 0 && pays.every((x) => x.method === 'credit')
                    return (
                      <div key={p.id} className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          {p.nickname ?? p.name}
                          {p.settled && (
                            <Badge variant={isFiado ? 'warning' : 'success'} className="text-xs">
                              {summarizePayments(pays) || 'pago'}
                            </Badge>
                          )}
                        </span>
                        <span className="font-semibold">
                          {formatBRL(detail.perClientShare[p.id] ?? 0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-bold text-primary">{formatBRL(detail.total)}</span>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={exportPdf} disabled={exporting}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
