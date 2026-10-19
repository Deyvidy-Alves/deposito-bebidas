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
import { RECIPE_TYPES } from '@/config/recipeTypes'
import type { CopaRecipeWithIngredients, Product, RecipeType } from '@shared/types'
import { toast } from 'sonner'

// bottleMl > 0 => medido por dose (ml); bottleMl = 0 => medido por unidade (ex.: gelo)
interface IngRow {
  productId: number
  name: string
  amount: number
  bottleMl: number
  costPrice: number
  salePrice: number
}

function rowUnits(r: IngRow): number {
  return r.bottleMl > 0 ? r.amount / r.bottleMl : r.amount
}
function rowCost(r: IngRow): number {
  return rowUnits(r) * r.costPrice
}
function rowSale(r: IngRow): number {
  return rowUnits(r) * r.salePrice
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  defaultType = 'copao',
  onSaved
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  recipe?: CopaRecipeWithIngredients | null
  defaultType?: RecipeType
  onSaved: () => void
}): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [name, setName] = useState('')
  const [recipeType, setRecipeType] = useState<RecipeType>('copao')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<IngRow[]>([])
  const [pickId, setPickId] = useState('')
  const [measure, setMeasure] = useState<'dose' | 'unit'>('dose')
  const [bottle, setBottle] = useState('')
  const [amount, setAmount] = useState('')
  const [priceMode, setPriceMode] = useState<'margin' | 'direct'>('margin')
  const [margin, setMargin] = useState('100')
  const [directPrice, setDirectPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    api.products.list().then(setProducts).catch(() => setProducts([]))
    setName(recipe?.name ?? '')
    setRecipeType(recipe?.recipeType ?? defaultType)
    setDescription(recipe?.description ?? '')
    setPickId('')
    setMeasure('dose')
    setBottle('')
    setAmount('')
    if (recipe) {
      setRows(
        recipe.ingredients.map((i) => ({
          productId: i.productId,
          name: i.productName,
          amount: i.mlUsed,
          bottleMl: i.volumePerUnit || 0,
          costPrice: 0,
          salePrice: 0
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
  }, [open, recipe, defaultType])

  // Reconcilia custos (e bottleMl padrão) quando a lista de produtos chega.
  useEffect(() => {
    if (products.length === 0) return
    setRows((prev) =>
      prev.map((r) => {
        const p = products.find((x) => x.id === r.productId)
        return p
          ? {
              ...r,
              costPrice: p.costPrice,
              salePrice: p.salePrice,
              bottleMl: r.bottleMl || p.volumePerUnit || 0
            }
          : r
      })
    )
  }, [products])

  // Ao escolher um produto, sugere o modo e preenche o tamanho conhecido.
  useEffect(() => {
    const p = products.find((x) => x.id === Number(pickId))
    if (!p) return
    if (p.volumePerUnit > 0) {
      setMeasure('dose')
      setBottle(String(p.volumePerUnit))
    } else {
      setMeasure('unit')
      setBottle('')
    }
    setAmount('')
  }, [pickId, products])

  const cost = useMemo(() => rows.reduce((acc, r) => acc + rowCost(r), 0), [rows])
  const saleRef = useMemo(() => rows.reduce((acc, r) => acc + rowSale(r), 0), [rows])
  const totalMl = useMemo(
    () => rows.filter((r) => r.bottleMl > 0).reduce((a, r) => a + r.amount, 0),
    [rows]
  )
  const salePreview = useMemo(() => {
    if (priceMode === 'direct') return Number(directPrice.replace(',', '.')) || 0
    const m = Number(margin.replace(',', '.')) || 0
    return cost * (1 + m / 100)
  }, [priceMode, directPrice, margin, cost])

  function addIngredient(): void {
    const id = Number(pickId)
    const p = products.find((x) => x.id === id)
    if (!p) {
      toast.warning('Selecione o insumo.')
      return
    }
    const amt = Number(amount.replace(',', '.'))
    if (!(amt > 0)) {
      toast.warning('Informe a quantidade usada.')
      return
    }
    let bottleMl = 0
    if (measure === 'dose') {
      bottleMl = Number(bottle.replace(',', '.'))
      if (!(bottleMl > 0)) {
        toast.warning('Informe o tamanho da garrafa/lata em ml.')
        return
      }
    }
    setRows((prev) => [
      ...prev.filter((r) => r.productId !== id),
      { productId: id, name: p.name, amount: amt, bottleMl, costPrice: p.costPrice, salePrice: p.salePrice }
    ])
    setPickId('')
    setBottle('')
    setAmount('')
  }

  async function save(): Promise<void> {
    if (!name.trim()) {
      toast.warning('Informe o nome da receita.')
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
        recipeType,
        description: description.trim() || null,
        ingredients: rows.map((r) => ({
          productId: r.productId,
          mlUsed: r.amount,
          bottleMl: r.bottleMl > 0 ? r.bottleMl : null
        })),
        salePrice: priceMode === 'direct' ? Number(directPrice.replace(',', '.')) : null,
        marginPct: priceMode === 'margin' ? Number(margin.replace(',', '.')) : null
      }
      if (recipe) await api.copa.update(recipe.id, input)
      else await api.copa.create(input)
      toast.success(recipe ? 'Receita atualizada.' : 'Receita cadastrada.')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao salvar receita', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Editar receita' : 'Nova receita'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da receita *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Copão de Whisky com energético"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={recipeType} onValueChange={(v) => setRecipeType(v as RecipeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição / modo de preparo (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: 2 doses de whisky, completar com energético e gelo"
            />
          </div>

          {/* Adicionar insumo */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Insumo (bebida, energético, gelo…)</Label>
                <Select value={pickId} onValueChange={setPickId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhum produto. Cadastre no Estoque.
                      </div>
                    ) : (
                      products.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} · {formatBRL(p.costPrice)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs">Medir por</Label>
                <Select value={measure} onValueChange={(v) => setMeasure(v as 'dose' | 'unit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dose">Dose (ml)</SelectItem>
                    <SelectItem value="unit">Unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-end gap-2">
              {measure === 'dose' && (
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Tamanho da garrafa/lata (ml)</Label>
                  <Input
                    type="number"
                    value={bottle}
                    onChange={(e) => setBottle(e.target.value)}
                    placeholder="Ex.: 1000"
                  />
                </div>
              )}
              <div className="w-32 space-y-1">
                <Label className="text-xs">{measure === 'dose' ? 'ML usados' : 'Quantidade'}</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <Button onClick={addIngredient}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            {measure === 'dose' && (
              <p className="text-xs text-muted-foreground">
                O tamanho da garrafa é lembrado no produto para a baixa de estoque.
              </p>
            )}
          </div>

          {/* Lista de insumos */}
          <ScrollArea className="h-40 rounded-lg border">
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum insumo adicionado.
              </p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => (
                  <div key={r.productId} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.bottleMl > 0 ? `${r.amount} ml (garrafa ${r.bottleMl} ml)` : `${r.amount} un`}{' '}
                        · custo {formatBRL(rowCost(r))}
                      </p>
                    </div>
                    <button
                      onClick={() => setRows((prev) => prev.filter((x) => x.productId !== r.productId))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
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
              <Label>Volume líquido</Label>
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
            <div title="Soma dos preços de venda dos insumos (proporcional ao usado)">
              <p className="text-xs text-muted-foreground">Venda insumos</p>
              <p className="text-lg font-bold text-muted-foreground">{formatBRL(saleRef)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Venda da receita</p>
              <p className="text-lg font-bold text-primary">{formatBRL(salePreview)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className="text-lg font-bold text-success">{formatBRL(salePreview - cost)}</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Dica: para cobrar o preço de balcão (ex.: R$ 15–17), use “Valor direto” e digite o preço.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar receita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
