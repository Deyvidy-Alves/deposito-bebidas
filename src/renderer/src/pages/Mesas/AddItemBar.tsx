import { useEffect, useRef, useState } from 'react'
import { Minus, Package, Plus, Search } from 'lucide-react'
import { recipeTypeMeta } from '@/config/recipeTypes'
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
import type { AddItemInput, CopaRecipeWithIngredients, Product } from '@shared/types'
import { toast } from 'sonner'

const STOCK_PREFIX = 'ESTOQUE_INSUFICIENTE:'

type Hit =
  | { kind: 'product'; product: Product }
  | { kind: 'recipe'; recipe: CopaRecipeWithIngredients }

export function AddItemBar({
  tableId,
  onAdded
}: {
  tableId: number
  onAdded: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [recipes, setRecipes] = useState<CopaRecipeWithIngredients[]>([])
  const [qty, setQty] = useState(1)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ input: AddItemInput; message: string } | null>(null)
  const [reason, setReason] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.copa.list().then(setRecipes).catch(() => setRecipes([]))
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let active = true
    const t = setTimeout(async () => {
      try {
        const prods = await api.products.search(query)
        const q = query.trim().toLowerCase()
        const recipeHits: Hit[] = recipes
          .filter((r) => r.name.toLowerCase().includes(q))
          .map((r) => ({ kind: 'recipe', recipe: r }))
        const prodHits: Hit[] = prods.map((p) => ({ kind: 'product', product: p }))
        if (active) {
          setResults([...recipeHits, ...prodHits])
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
  }, [query, recipes])

  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function add(hit: Hit): Promise<void> {
    const input: AddItemInput =
      hit.kind === 'product'
        ? { tableId, productId: hit.product.id, quantity: qty }
        : { tableId, recipeId: hit.recipe.id, quantity: qty }
    const name = hit.kind === 'product' ? hit.product.name : hit.recipe.name
    try {
      await api.tables.addItem(input)
      toast.success(`${qty}× ${name} adicionado`)
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
          placeholder="Buscar produto ou receita por nome, categoria ou código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-lg">
            {results.map((hit) =>
              hit.kind === 'product' ? (
                <button
                  key={`p-${hit.product.id}`}
                  onClick={() => add(hit)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{hit.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {hit.product.category ?? 'Produto'} ·{' '}
                        <span className={hit.product.currentStock <= 0 ? 'text-destructive' : ''}>
                          {hit.product.currentStock} {hit.product.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-semibold text-primary">
                    {formatBRL(hit.product.salePrice)}
                  </span>
                </button>
              ) : (
                (() => {
                  const meta = recipeTypeMeta(hit.recipe.recipeType)
                  const Icon = meta.icon
                  return (
                    <button
                      key={`r-${hit.recipe.id}`}
                      onClick={() => add(hit)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{hit.recipe.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {meta.label}
                            {hit.recipe.totalMl > 0 ? ` · ${hit.recipe.totalMl} ml` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-base font-semibold text-primary">
                        {formatBRL(hit.recipe.salePrice)}
                      </span>
                    </button>
                  )
                })()
              )
            )}
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
