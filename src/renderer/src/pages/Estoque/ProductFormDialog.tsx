import { useEffect, useState } from 'react'
import { z } from 'zod'
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
import { Combobox } from '@/components/ui/combobox'
import { api } from '@/lib/api'
import { mergeCategories } from '@/config/categories'
import type { Product } from '@shared/types'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  category: z.string().trim().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  minStock: z.number().min(0),
  currentStock: z.number().min(0),
  barcode: z.string().trim().optional()
})

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  product?: Product | null
  onSaved: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [minStock, setMinStock] = useState('0')
  const [currentStock, setCurrentStock] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [categories, setCategories] = useState<string[]>(mergeCategories([]))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setCategory(product?.category ?? '')
      setCostPrice(product ? String(product.costPrice) : '')
      setSalePrice(product ? String(product.salePrice) : '')
      setMinStock(String(product?.minStock ?? 0))
      setCurrentStock(String(product?.currentStock ?? 0))
      setBarcode(product?.barcode ?? '')
      api.products
        .categories()
        .then((c) => setCategories(mergeCategories(c)))
        .catch(() => setCategories(mergeCategories([])))
    }
  }, [open, product])

  async function save(): Promise<void> {
    const parsed = schema.safeParse({
      name,
      category,
      costPrice: Number(costPrice.replace(',', '.')) || 0,
      salePrice: Number(salePrice.replace(',', '.')) || 0,
      minStock: Number(minStock.replace(',', '.')) || 0,
      currentStock: Number(currentStock.replace(',', '.')) || 0,
      barcode
    })
    if (!parsed.success) {
      toast.warning(parsed.error.issues[0].message)
      return
    }
    setSaving(true)
    try {
      const input = {
        name: parsed.data.name,
        category: parsed.data.category || null,
        unit: 'un' as const, // tudo é contado por unidade
        // O conteúdo em ml é definido no módulo de Copões (quando o produto vira insumo).
        volumePerUnit: product?.volumePerUnit ?? 0,
        costPrice: parsed.data.costPrice,
        salePrice: parsed.data.salePrice,
        minStock: parsed.data.minStock,
        currentStock: parsed.data.currentStock,
        barcode: parsed.data.barcode || null
      }
      if (product) await api.products.update(product.id, input)
      else await api.products.create(input)
      toast.success(product ? 'Produto atualizado.' : 'Produto cadastrado.')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao salvar produto', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Combobox
                value={category}
                onChange={setCategory}
                options={categories}
                placeholder="Selecionar/criar..."
                searchPlaceholder="Buscar ou criar categoria..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código de barras</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço de custo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço de venda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estoque mínimo (alerta)</Label>
              <Input
                type="number"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Estoque atual {product && <span className="text-xs">(use Entrada/Ajuste)</span>}
              </Label>
              <Input
                type="number"
                step="1"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                disabled={!!product}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
