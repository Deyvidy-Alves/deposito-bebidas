import { useEffect, useState } from 'react'
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
import { api } from '@/lib/api'
import { formatBRL, formatDateTime } from '@/lib/utils'
import type { Product, StockMovement } from '@shared/types'
import { toast } from 'sonner'

export function StockEntryDialog({
  product,
  open,
  onOpenChange,
  onDone
}: {
  product: Product | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}): React.JSX.Element {
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [supplier, setSupplier] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && product) {
      setQuantity('')
      setUnitCost(String(product.costPrice || ''))
      setSupplier('')
    }
  }, [open, product])

  async function save(): Promise<void> {
    const qty = Number(quantity.replace(',', '.'))
    if (!(qty > 0)) {
      toast.warning('Informe uma quantidade maior que zero.')
      return
    }
    setSaving(true)
    try {
      await api.products.addEntry({
        productId: product!.id,
        quantity: qty,
        unitCost: unitCost ? Number(unitCost.replace(',', '.')) : null,
        supplier: supplier || null
      })
      toast.success('Entrada registrada.')
      onDone()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro na entrada', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrada de estoque — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Custo unitário (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Fornecedor (opcional)</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Registrar entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function StockAdjustDialog({
  product,
  open,
  onOpenChange,
  onDone
}: {
  product: Product | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}): React.JSX.Element {
  const [newQuantity, setNewQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && product) {
      setNewQuantity(String(product.currentStock))
      setReason('')
    }
  }, [open, product])

  async function save(): Promise<void> {
    if (!reason.trim()) {
      toast.warning('Informe o motivo do ajuste.')
      return
    }
    setSaving(true)
    try {
      await api.products.adjust({
        productId: product!.id,
        newQuantity: Number(newQuantity.replace(',', '.')),
        reason: reason.trim()
      })
      toast.success('Estoque ajustado.')
      onDone()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro no ajuste', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de estoque — {product?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-base text-muted-foreground">
          Estoque atual: <span className="font-semibold text-foreground">{product?.currentStock} {product?.unit}</span>
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nova quantidade *</Label>
            <Input
              type="number"
              step="0.01"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Motivo * (obrigatório)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: perda, quebra, contagem de inventário"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MOVEMENT_META: Record<string, { label: string; variant: 'success' | 'destructive' | 'secondary' }> = {
  in: { label: 'Entrada', variant: 'success' },
  out: { label: 'Saída', variant: 'destructive' },
  adjust: { label: 'Ajuste', variant: 'secondary' }
}

export function MovementsDialog({
  product,
  open,
  onOpenChange
}: {
  product: Product | null
  open: boolean
  onOpenChange: (o: boolean) => void
}): React.JSX.Element {
  const [movements, setMovements] = useState<StockMovement[]>([])

  useEffect(() => {
    if (open && product) {
      api.products.movements(product.id).then(setMovements).catch(() => setMovements([]))
    }
  }, [open, product])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentações — {product?.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96">
          {movements.length === 0 ? (
            <p className="py-10 text-center text-base text-muted-foreground">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            <div className="divide-y">
              {movements.map((m) => {
                const meta = MOVEMENT_META[m.type]
                return (
                  <div key={m.id} className="flex items-center justify-between px-1 py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={meta.variant} className="text-xs">
                          {meta.label}
                        </Badge>
                        <span className="font-medium">
                          {m.type === 'out' ? '-' : m.type === 'in' ? '+' : '±'}
                          {m.quantity} {product?.unit}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {m.reason ?? '—'}
                        {m.supplier ? ` · ${m.supplier}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {m.unitCost != null && <p>{formatBRL(m.unitCost)}</p>}
                      <p>{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
