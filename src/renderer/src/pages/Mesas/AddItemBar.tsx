import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { AddItemInput, Product } from '@shared/types'
import { toast } from 'sonner'

const STOCK_PREFIX = 'ESTOQUE_INSUFICIENTE:'

export function AddItemBar({
  tableId,
  onAdded
}: {
  tableId: number
  onAdded: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ input: AddItemInput; message: string } | null>(null)
  const [reason, setReason] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let active = true
    const t = setTimeout(async () => {
      try {
        const r = await api.products.search(query)
        if (active) {
          setResults(r)
          setOpen(true)
        }
      } catch {
        /* ignore */
      }
    }, 150)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function add(product: Product): Promise<void> {
    const input: AddItemInput = { tableId, productId: product.id, quantity: qty }
    try {
      await api.tables.addItem(input)
      toast.success(`${qty}× ${product.name} adicionado`)
      resetAfterAdd()
      onAdded()
    } catch (err) {
      const msg = (err as Error).message
      if (msg.startsWith(STOCK_PREFIX)) {
        setPending({ input, message: msg.replace(STOCK_PREFIX, '') })
        setReason('')
      } else {
        toast.error('Erro ao adicionar item', { description: msg })
      }
    }
  }

  async function confirmOverride(): Promise<void> {
    if (!pending) return
    if (!reason.trim()) {
      toast.warning('Informe a justificativa.')
      return
    }
    try {
      await api.tables.addItem({ ...pending.input, override: true, overrideReason: reason.trim() })
      toast.success('Item adicionado (venda sem estoque).')
      setPending(null)
      resetAfterAdd()
      onAdded()
    } catch (err) {
      toast.error('Erro ao adicionar item', { description: (err as Error).message })
    }
  }

  function resetAfterAdd(): void {
    setQuery('')
    setResults([])
    setOpen(false)
    setQty(1)
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center rounded-md border">
        <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-10 text-center text-base font-semibold">{qty}</span>
        <Button variant="ghost" size="icon" onClick={() => setQty((q) => q + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div ref={boxRef} className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar produto por nome, categoria ou código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lg">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.category ?? 'Produto'} ·{' '}
                    <span className={p.currentStock <= 0 ? 'text-destructive' : ''}>
                      {p.currentStock} {p.unit}
                    </span>
                  </p>
                </div>
                <span className="text-base font-semibold text-primary">
                  {formatBRL(p.salePrice)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Override de estoque */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estoque insuficiente</DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">{pending?.message}</p>
          <div className="space-y-1.5">
            <Label>Justificativa para vender mesmo assim</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: contagem errada, reposição a caminho"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmOverride}>
              Vender assim mesmo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
