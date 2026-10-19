import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleDollarSign } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { CreditSettlementResult, DebtorTable } from '@shared/types'
import { toast } from 'sonner'

type Method = 'cash' | 'pix' | 'card'

export function CreditSettlementDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onDone
}: {
  clientId: number | null
  clientName: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}): React.JSX.Element {
  const [debts, setDebts] = useState<DebtorTable[]>([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Method>('cash')
  const [result, setResult] = useState<CreditSettlementResult | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && clientId != null) {
      setAmount('')
      setMethod('cash')
      setResult(null)
      api.credit.debtorTables(clientId).then(setDebts).catch(() => setDebts([]))
    }
  }, [open, clientId])

  const totalDebt = useMemo(() => debts.reduce((a, d) => a + d.outstanding, 0), [debts])

  // Pré-visualização: distribui o valor nas mesas de menor para maior (igual ao backend).
  const preview = useMemo(() => {
    const value = Number(amount.replace(',', '.')) || 0
    const sorted = [...debts].sort((a, b) => a.outstanding - b.outstanding)
    let remaining = value
    const rows: { table: DebtorTable; pay: number; full: boolean }[] = []
    for (const d of sorted) {
      if (remaining <= 0.009) break
      const pay = Math.min(remaining, d.outstanding)
      rows.push({ table: d, pay, full: pay >= d.outstanding - 0.009 })
      remaining -= pay
    }
    return { rows, leftover: Math.max(0, remaining) }
  }, [amount, debts])

  async function confirm(): Promise<void> {
    const value = Number(amount.replace(',', '.')) || 0
    if (!(value > 0)) {
      toast.warning('Informe um valor maior que zero.')
      return
    }
    if (clientId == null) return
    setSaving(true)
    try {
      const res = await api.credit.settle({ clientId, amount: value, method })
      setResult(res)
      onDone()
      toast.success(`Abatimento de ${formatBRL(res.applied)} aplicado.`)
    } catch (err) {
      toast.error('Erro ao abater crédito', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" /> Abater crédito — {clientName}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <SettlementSummary result={result} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
              <span className="text-base text-muted-foreground">Saldo devedor total</span>
              <span className="text-xl font-bold text-warning">{formatBRL(totalDebt)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor a abater</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">
                Distribuição (mesas de menor para maior)
              </Label>
              <ScrollArea className="h-48 rounded-lg border">
                {debts.length === 0 ? (
                  <p className="p-6 text-center text-base text-muted-foreground">
                    Cliente sem saldo devedor.
                  </p>
                ) : (
                  <div className="divide-y">
                    {[...debts]
                      .sort((a, b) => a.outstanding - b.outstanding)
                      .map((d) => {
                        const row = preview.rows.find((r) => r.table.tableId === d.tableId)
                        return (
                          <div
                            key={d.tableId}
                            className="flex items-center justify-between px-3 py-2.5"
                          >
                            <div>
                              <p className="font-medium">{d.label ?? `Mesa #${d.tableId}`}</p>
                              <p className="text-sm text-muted-foreground">
                                deve {formatBRL(d.outstanding)}
                              </p>
                            </div>
                            {row ? (
                              <Badge variant={row.full ? 'success' : 'warning'}>
                                {row.full ? 'quita' : 'abate'} {formatBRL(row.pay)}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </ScrollArea>
              {preview.leftover > 0.009 && (
                <p className="mt-2 text-sm text-warning">
                  Sobram {formatBRL(preview.leftover)} além da dívida (não serão cobrados).
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={confirm} disabled={saving || debts.length === 0}>
                Aplicar abatimento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettlementSummary({ result }: { result: CreditSettlementResult }): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <div>
          <p className="text-lg font-bold">{formatBRL(result.applied)} abatidos</p>
          <p className="text-sm text-muted-foreground">
            Saldo devedor restante: {formatBRL(result.remainingDebt)}
          </p>
        </div>
      </div>

      {result.fullySettled.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-muted-foreground">Mesas quitadas</p>
          <div className="space-y-1">
            {result.fullySettled.map((t) => (
              <div key={t.tableId} className="flex items-center justify-between text-base">
                <span className="flex items-center gap-1">
                  {t.label ?? `Mesa #${t.tableId}`} <ArrowRight className="h-4 w-4" />
                </span>
                <Badge variant="success">{formatBRL(t.amount)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.partiallySettled.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-muted-foreground">Abatimento parcial</p>
          <div className="space-y-1">
            {result.partiallySettled.map((t) => (
              <div key={t.tableId} className="flex items-center justify-between text-base">
                <span>{t.label ?? `Mesa #${t.tableId}`}</span>
                <span>
                  <Badge variant="warning">{formatBRL(t.amount)}</Badge>
                  <span className="ml-2 text-sm text-muted-foreground">
                    resta {formatBRL(t.left)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.remainingCredit > 0.009 && (
        <p className="text-sm text-muted-foreground">
          {formatBRL(result.remainingCredit)} do valor informado não foram usados (dívida menor que
          o valor).
        </p>
      )}
    </div>
  )
}
