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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Product, ProductUnit } from '@shared/types'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  category: z.string().trim().optional(),
  unit: z.enum(['un', 'ml', 'kg']),
  volumePerUnit: z.number().min(0),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  minStock: z.number().min(0),
  currentStock: z.number().min(0),
  barcode: z.string().trim().optional()
})

const CATEGORIES = [
  'Cerveja',
  'Refrigerante',
  'Água',
  'Gelo',
  'Whisky',
  'Vodka',
  'Cachaça',
  'Gin',
  'Licor',
  'Vinho',
  'Energético',
  'Suco',
  'Outros'
]

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
  const [unit, setUnit] = useState<ProductUnit>('un')
  const [volumePerUnit, setVolumePerUnit] = useState('0')
  const [costPrice, setCostPrice] = useState('0')
  const [salePrice, setSalePrice] = useState('0')
  const [minStock, setMinStock] = useState('0')
  const [currentStock, setCurrentStock] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setCategory(product?.category ?? '')
      setUnit(product?.unit ?? 'un')
      setVolumePerUnit(String(product?.volumePerUnit ?? 0))
      setCostPrice(String(product?.costPrice ?? 0))
      setSalePrice(String(product?.salePrice ?? 0))
      setMinStock(String(product?.minStock ?? 0))
      setCurrentStock(String(product?.currentStock ?? 0))
      setBarcode(product?.barcode ?? '')
    }
  }, [open, product])

  async function save(): Promise<void> {
    const parsed = schema.safeParse({
      name,
      category,
      unit,
      volumePerUnit: Number(volumePerUnit.replace(',', '.')),
      costPrice: Number(costPrice.replace(',', '.')),
      salePrice: Number(salePrice.replace(',', '.')),
      minStock: Number(minStock.replace(',', '.')),
      currentStock: Number(currentStock.replace(',', '.')),
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
        unit: parsed.data.unit,
        volumePerUnit: parsed.data.volumePerUnit,
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

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="categorias"
              placeholder="Ex.: Cerveja"
            />
            <datalist id="categorias">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label>Unidade de medida</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as ProductUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="un">Unidade (un)</SelectItem>
                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                <SelectItem value="kg">Quilo (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Volume/peso por unidade {unit === 'un' && '(ml p/ copão)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={volumePerUnit}
              onChange={(e) => setVolumePerUnit(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Código de barras</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>

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
              step="0.01"
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
              step="0.01"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              disabled={!!product}
            />
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
