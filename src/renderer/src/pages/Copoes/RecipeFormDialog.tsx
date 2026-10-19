import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import type { CopaRecipeWithIngredients, Product, ProductUnit } from '@shared/types'
import { toast } from 'sonner'

interface IngRow {
  productId: number
  name: string
  mlUsed: number
  costPrice: number
  volumePerUnit: number
  unit: ProductUnit
}

/** Unidades de estoque consumidas por copão (igual ao backend). */
function stockUnits(unit: ProductUnit, volumePerUnit: number, amount: number): number {
  if (unit === 'ml') return amount
  if (volumePerUnit > 0) return amount / volumePerUnit
  return amount
}

/** True quando o insumo é medido em ML (líquido). */
function isLiquid(unit: ProductUnit, volumePerUnit: number): boolean {
  return unit === 'ml' || volumePerUnit > 0
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  onSaved
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  recipe?: CopaRecipeWithIngredients | null
  onSaved: () => void
}): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [name, setName] = useState('')
  const [rows, setRows] = useState<IngRow[]>([])
  const [pickId, setPickId] = useState('')
  const [pickMl, setPickMl] = useState('')
  const [priceMode, setPriceMode] = useState<'margin' | 'direct'>('margin')
  const [margin, setMargin] = useState('100')
  const [directPrice, setDirectPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.products.list().then(setProducts).catch(() => setProducts([]))
      setName(recipe?.name ?? '')
      setPickId('')
      setPickMl('')
      if (recipe) {
        setRows(
          recipe.ingredients.map((i) => ({
            productId: i.productId,
            name: i.productName,
            mlUsed: i.mlUsed,
            costPrice: 0,
            volumePerUnit: 0,
            unit: i.unit
          }))
        )
        setPriceMode('direct')
        setDirectPrice(String(recipe.salePrice))
        setMargin(String(recipe.marginPct ?? 100))
      } else {
        setRows([])
        setPriceMode('margin')
        setMargin('100')
        setDirectPrice('')
      }
    }
  }, [open, recipe])

  // Reconcilia custos dos insumos quando a lista de produtos chega (para edição).
  useEffect(() => {
    if (products.length === 0) return
    setRows((prev) =>
      prev.map((r) => {
        const p = products.find((x) => x.id === r.productId)
        return p
          ? { ...r, costPrice: p.costPrice, volumePerUnit: p.volumePerUnit, unit: p.unit }
          : r
      })
    )
  }, [products])

  const cost = useMemo(
    () =>
      rows.reduce((acc, r) => acc + stockUnits(r.unit, r.volumePerUnit, r.mlUsed) * r.costPrice, 0),
    [rows]
  )
  const totalMl = useMemo(
    () => rows.filter((r) => isLiquid(r.unit, r.volumePerUnit)).reduce((a, r) => a + r.mlUsed, 0),
    [rows]
  )

  const salePreview = useMemo(() => {
    if (priceMode === 'direct') return Number(directPrice.replace(',', '.')) || 0
    const m = Number(margin.replace(',', '.')) || 0
    return cost * (1 + m / 100)
  }, [priceMode, directPrice, margin, cost])

  function addIngredient(): void {
    const id = Number(pickId)
    const ml = Number(pickMl.replace(',', '.'))
    if (!id || !(ml > 0)) {
      toast.warning('Selecione o insumo e informe a quantidade.')
      return
    }
    const p = products.find((x) => x.id === id)
    if (!p) return
    setRows((prev) => [
      ...prev.filter((r) => r.productId !== id),
      {
        productId: id,
        name: p.name,
        mlUsed: ml,
        costPrice: p.costPrice,
        volumePerUnit: p.volumePerUnit,
        unit: p.unit
      }
    ])
    setPickId('')
    setPickMl('')
  }

  const pickedProduct = products.find((x) => x.id === Number(pickId))
  const pickLiquid = pickedProduct ? isLiquid(pickedProduct.unit, pickedProduct.volumePerUnit) : true
  const pickAmountLabel = pickedProduct && !pickLiquid ? `Qtd. (${pickedProduct.unit})` : 'ML usados'

  async function save(): Promise<void> {
    if (!name.trim()) {
      toast.warning('Informe o nome do copão.')
      return
    }
    if (rows.length === 0) {
      toast.warning('Adicione ao menos um insumo.')
      return
    }
    setSaving(true)
    try {
      const input = {
        name: name.trim(),
        ingredients: rows.map((r) => ({ productId: r.productId, mlUsed: r.mlUsed })),
        salePrice: priceMode === 'direct' ? Number(directPrice.replace(',', '.')) : null,
        marginPct: priceMode === 'margin' ? Number(margin.replace(',', '.')) : null
      }
      if (recipe) await api.copa.update(recipe.id, input)
      else await api.copa.create(input)
      toast.success(recipe ? 'Copão atualizado.' : 'Copão cadastrado.')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao salvar copão', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Editar copão' : 'Novo copão'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do copão *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Copão de Whisky com energético" />
          </div>

          {/* Adicionar insumo */}
          <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Insumo (bebida, gelo, etc.)</Label>
              <Select value={pickId} onValueChange={setPickId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      Nenhum produto cadastrado. Cadastre no Estoque.
                    </div>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ·{' '}
                        {isLiquid(p.unit, p.volumePerUnit)
                          ? `${formatBRL(p.costPrice)} / ${p.volumePerUnit || '?'}ml`
                          : `${formatBRL(p.costPrice)} / ${p.unit}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs">{pickAmountLabel}</Label>
              <Input type="number" value={pickMl} onChange={(e) => setPickMl(e.target.value)} />
            </div>
            <Button onClick={addIngredient}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de insumos */}
          <ScrollArea className="h-40 rounded-lg border">
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum insumo adicionado.
              </p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => {
                  const c = stockUnits(r.unit, r.volumePerUnit, r.mlUsed) * r.costPrice
                  const amountLabel = isLiquid(r.unit, r.volumePerUnit) ? 'ml' : r.unit
                  return (
                    <div key={r.productId} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.mlUsed} {amountLabel} · custo {formatBRL(c)}
                        </p>
                      </div>
                      <button
                        onClick={() => setRows((prev) => prev.filter((x) => x.productId !== r.productId))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Preço */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Definir por</Label>
              <Select value={priceMode} onValueChange={(v) => setPriceMode(v as 'margin' | 'direct')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margin">Margem (%)</SelectItem>
                  <SelectItem value="direct">Valor direto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {priceMode === 'margin' ? (
              <div className="space-y-1.5">
                <Label>Margem (%)</Label>
                <Input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Preço de venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={directPrice}
                  onChange={(e) => setDirectPrice(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Total</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
                {totalMl} ml
              </div>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="flex items-center justify-around rounded-lg border bg-card p-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Custo</p>
              <p className="text-lg font-bold">{formatBRL(cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Venda</p>
              <p className="text-lg font-bold text-primary">{formatBRL(salePreview)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className="text-lg font-bold text-success">{formatBRL(salePreview - cost)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar copão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
