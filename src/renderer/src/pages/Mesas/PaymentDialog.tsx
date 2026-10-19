import { useEffect, useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type {
  PaymentMethod,
  SettleParticipantInput,
  TableDetails
} from '@shared/types'
import { toast } from 'sonner'

interface Row {
  clientId: number
  name: string
  include: boolean
  amount: number
  method: PaymentMethod
  breakdown: { cash: number; pix: number; card: number; credit: number }
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'card', label: 'Cartão' },
  { value: 'credit', label: 'Crediário (fiado)' },
  { value: 'mixed', label: 'Misto' }
]

export function PaymentDialog({
  detail,
  open,
  onOpenChange,
  onDone
}: {
  detail: TableDetails | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}): React.JSX.Element {
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [fiscalEnabled, setFiscalEnabled] = useState(false)
  const [emitInvoice, setEmitInvoice] = useState(false)

  useEffect(() => {
    if (open) {
      api.fiscal
        .getConfig()
        .then((c) => setFiscalEnabled(c.enabled))
        .catch(() => setFiscalEnabled(false))
      setEmitInvoice(false)
      setReceived('')
    }
  }, [open])

  useEffect(() => {
    if (open && detail) {
      setRows(
        detail.participants
          .filter((p) => !p.settled)
          .map((p) => ({
            clientId: p.id,
            name: p.nickname ?? p.name,
            include: true,
            amount: detail.perClientShare[p.id] ?? 0,
            method: 'cash' as PaymentMethod,
            breakdown: { cash: 0, pix: 0, card: 0, credit: 0 }
          }))
      )
    }
  }, [open, detail])

  function patch(clientId: number, p: Partial<Row>): void {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...p } : r)))
  }

  function allOnCredit(): void {
    setRows((prev) => prev.map((r) => ({ ...r, include: true, method: 'credit' })))
  }

  const [received, setReceived] = useState('')

  const selectedTotal = useMemo(
    () => rows.filter((r) => r.include).reduce((acc, r) => acc + r.amount, 0),
    [rows]
  )

  const hasCash = rows.some((r) => r.include && (r.method === 'cash' || r.method === 'mixed'))
  const change = (Number(received.replace(',', '.')) || 0) - selectedTotal

  async function confirm(): Promise<void> {
    const toSettle = rows.filter((r) => r.include)
    if (toSettle.length === 0) {
      toast.warning('Selecione ao menos um participante.')
      return
    }
    const settlements: SettleParticipantInput[] = []
    for (const r of toSettle) {
      if (r.method === 'mixed') {
        const sum = r.breakdown.cash + r.breakdown.pix + r.breakdown.card + r.breakdown.credit
        if (Math.abs(sum - r.amount) > 0.009) {
          toast.warning(`Pagamento misto de ${r.name} não soma ${formatBRL(r.amount)}.`)
          return
        }
        settlements.push({ clientId: r.clientId, method: 'mixed', amount: r.amount, breakdown: r.breakdown })
      } else {
        settlements.push({ clientId: r.clientId, method: r.method, amount: r.amount })
      }
    }

    setSaving(true)
    try {
      const res = await api.payments.closeTable({ tableId: detail!.id, settlements })
      toast.success(
        res.tableClosed
          ? 'Comanda fechada!'
          : `Pagamento registrado. ${res.remainingParticipants} participante(s) em aberto.`
      )
      if (emitInvoice) {
        try {
          const inv = await api.fiscal.emit(detail!.id)
          toast[inv.status === 'error' ? 'error' : 'info'](`Nota fiscal: ${inv.message}`)
        } catch (err) {
          toast.error('Erro ao emitir nota', { description: (err as Error).message })
        }
      }
      onDone()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao registrar pagamento', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fechamento — {detail?.label ?? `Comanda #${detail?.id}`}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-base text-muted-foreground">
            Total da comanda: <span className="font-semibold text-foreground">{formatBRL(detail?.total ?? 0)}</span>
          </p>
          <Button variant="outline" size="sm" onClick={allOnCredit}>
            <CreditCard className="h-4 w-4" /> Todos no crediário
          </Button>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2 pr-2">
            {rows.map((r) => (
              <div key={r.clientId} className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={r.include}
                    onCheckedChange={(v) => patch(r.clientId, { include: !!v })}
                  />
                  <span className="flex-1 font-medium">{r.name}</span>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) => patch(r.clientId, { amount: Number(e.target.value) })}
                      disabled={!r.include}
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      value={r.method}
                      onValueChange={(v) => patch(r.clientId, { method: v as PaymentMethod })}
                      disabled={!r.include}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {r.include && r.method === 'mixed' && (
                  <div className="mt-3 grid grid-cols-4 gap-2 pl-8">
                    {(['cash', 'pix', 'card', 'credit'] as const).map((k) => (
                      <div key={k} className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {{ cash: 'Dinheiro', pix: 'PIX', card: 'Cartão', credit: 'Fiado' }[k]}
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.breakdown[k]}
                          onChange={(e) =>
                            patch(r.clientId, {
                              breakdown: { ...r.breakdown, [k]: Number(e.target.value) }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {hasCash && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="text-base text-muted-foreground">Valor recebido (dinheiro)</span>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="0,00"
              />
            </div>
            {received && (
              <span className="text-base">
                Troco:{' '}
                <span className={`font-bold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatBRL(Math.max(0, change))}
                </span>
                {change < 0 && (
                  <span className="ml-2 text-sm text-destructive">faltam {formatBRL(-change)}</span>
                )}
              </span>
            )}
          </div>
        )}

        {fiscalEnabled && (
          <label className="flex items-center gap-2 rounded-lg border p-3 text-base">
            <Checkbox checked={emitInvoice} onCheckedChange={(v) => setEmitInvoice(!!v)} />
            Emitir nota fiscal ao fechar
          </label>
        )}

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <span className="text-base">
            Selecionado: <span className="font-bold text-primary">{formatBRL(selectedTotal)}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={saving}>
              Confirmar pagamento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
