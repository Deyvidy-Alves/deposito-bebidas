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
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import type { Product } from '@shared/types'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  category: z.string().trim().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  minStock: z.number().min(0),
  currentStock: z.number().min(0),
  volumePerUnit: z.number().min(0),
  barcode: z.string().trim().optional()
})

const CATEGORIES = [
  'Cerveja',
  'Whisky',
  'Vodka',
  'Cachaça',
  'Gin',
  'Licor',
  'Vinho',
  'Energético',
  'Refrigerante',
  'Suco',
  'Água',
  'Gelo',
  'Cigarro',
  'Salgadinho',
  'Acessórios',
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
  const [volumePerUnit, setVolumePerUnit] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [minStock, setMinStock] = useState('0')
  const [currentStock, setCurrentStock] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setCategory(product?.category ?? '')
      setVolumePerUnit(product?.volumePerUnit ? String(product.volumePerUnit) : '')
      setCostPrice(product ? String(product.costPrice) : '')
      setSalePrice(product ? String(product.salePrice) : '')
      setMinStock(String(product?.minStock ?? 0))
      setCurrentStock(String(product?.currentStock ?? 0))
      setBarcode(product?.barcode ?? '')
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
      volumePerUnit: Number(volumePerUnit.replace(',', '.')) || 0,
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

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-5 pr-2">
            {/* Bloco: Produto */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Produto</h3>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    list="categorias"
                    placeholder="Ex.: Whisky, Cigarro, Gelo"
                  />
                  <datalist id="categorias">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Código de barras</Label>
                  <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Bloco: Preços e estoque */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Preços e estoque</h3>
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
                    Estoque atual{' '}
                    {product && <span className="text-xs">(use Entrada/Ajuste)</span>}
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
            </section>

            {/* Bloco: Uso em copão (opcional) */}
            <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Uso em copão <span className="font-normal">(opcional)</span>
              </h3>
              <div className="space-y-1.5">
                <Label>Conteúdo da embalagem (ml)</Label>
                <Input
                  type="number"
                  step="1"
                  value={volumePerUnit}
                  onChange={(e) => setVolumePerUnit(e.target.value)}
                  placeholder="Ex.: 1000 (garrafa 1 L), 473 (energético)"
                />
                <p className="text-xs text-muted-foreground">
                  Preencha só para bebidas, energéticos ou refrigerantes usados em copão (para o
                  cálculo proporcional). Gelo, cigarro, salgadinho e demais itens: deixe vazio.
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>

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
