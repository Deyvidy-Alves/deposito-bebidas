import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  History,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Sliders,
  Trash2
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ProductFormDialog } from './ProductFormDialog'
import { StockEntryDialog, StockAdjustDialog, MovementsDialog } from './StockDialogs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { Product } from '@shared/types'
import { toast } from 'sonner'

type DialogKind = 'form' | 'entry' | 'adjust' | 'movements' | 'delete' | null

export function EstoquePage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  async function load(): Promise<void> {
    try {
      setProducts(await api.products.list())
    } catch (err) {
      toast.error('Erro ao carregar produtos', { description: (err as Error).message })
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => !onlyLow || p.currentStock <= p.minStock)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').includes(q)
      )
  }, [products, query, onlyLow])

  const lowCount = useMemo(
    () => products.filter((p) => p.currentStock <= p.minStock).length,
    [products]
  )

  function openDialog(kind: DialogKind, product: Product | null): void {
    setSelected(product)
    setDialog(kind)
  }

  async function remove(): Promise<void> {
    if (!selected) return
    try {
      await api.products.remove(selected.id)
      toast.success('Produto removido.')
      setDialog(null)
      load()
    } catch (err) {
      toast.error('Erro ao remover', { description: (err as Error).message })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Estoque" description="Produtos e movimentações">
        <Button onClick={() => openDialog('form', null)}>
          <Plus /> Novo produto
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 border-b px-8 py-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar produto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant={onlyLow ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOnlyLow((v) => !v)}
        >
          <AlertTriangle className="h-4 w-4" /> Estoque baixo
          {lowCount > 0 && (
            <Badge variant={onlyLow ? 'secondary' : 'destructive'} className="ml-1">
              {lowCount}
            </Badge>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-base text-muted-foreground">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const low = p.currentStock <= p.minStock
                  const zero = p.currentStock <= 0
                  return (
                    <TableRow key={p.id} className={low ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category ?? '—'}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatBRL(p.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBRL(p.salePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {low ? (
                          <Badge variant={zero ? 'destructive' : 'warning'}>
                            {p.currentStock} {p.unit}
                          </Badge>
                        ) : (
                          <span className="font-medium">
                            {p.currentStock} {p.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog('entry', p)}>
                              <ArrowDownToLine className="h-4 w-4" /> Entrada
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('adjust', p)}>
                              <Sliders className="h-4 w-4" /> Ajustar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('movements', p)}>
                              <History className="h-4 w-4" /> Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('form', p)}>
                              <Pencil className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog('delete', p)}>
                              <Trash2 className="h-4 w-4 text-destructive" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </ScrollArea>

      <ProductFormDialog
        open={dialog === 'form'}
        onOpenChange={(o) => !o && setDialog(null)}
        product={selected}
        onSaved={load}
      />
      <StockEntryDialog
        product={selected}
        open={dialog === 'entry'}
        onOpenChange={(o) => !o && setDialog(null)}
        onDone={load}
      />
      <StockAdjustDialog
        product={selected}
        open={dialog === 'adjust'}
        onOpenChange={(o) => !o && setDialog(null)}
        onDone={load}
      />
      <MovementsDialog
        product={selected}
        open={dialog === 'movements'}
        onOpenChange={(o) => !o && setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Excluir produto"
        description={`Remover "${selected?.name}"? Ele deixará de aparecer nas vendas (histórico é preservado).`}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
