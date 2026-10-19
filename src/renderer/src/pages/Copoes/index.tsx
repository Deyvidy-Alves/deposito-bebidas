import { useEffect, useState } from 'react'
import { GlassWater, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecipeFormDialog } from './RecipeFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { CopaRecipeWithIngredients } from '@shared/types'
import { toast } from 'sonner'

export function CopoesPage(): React.JSX.Element {
  const [recipes, setRecipes] = useState<CopaRecipeWithIngredients[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CopaRecipeWithIngredients | null>(null)
  const [toDelete, setToDelete] = useState<CopaRecipeWithIngredients | null>(null)

  async function load(): Promise<void> {
    try {
      setRecipes(await api.copa.list())
    } catch (err) {
      toast.error('Erro ao carregar copões', { description: (err as Error).message })
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(): Promise<void> {
    if (!toDelete) return
    try {
      await api.copa.remove(toDelete.id)
      toast.success('Copão removido.')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error('Erro ao remover', { description: (err as Error).message })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Copões" description="Receitas de bebidas e custo proporcional">
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> Novo copão
        </Button>
      </PageHeader>

      <ScrollArea className="flex-1">
        <div className="p-8">
          {recipes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <GlassWater className="h-8 w-8 text-muted-foreground" />
              <p className="text-base text-muted-foreground">
                Nenhuma receita. Crie um copão com as bebidas do estoque.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recipes.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <GlassWater className="h-5 w-5 text-primary" /> {r.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(r)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {r.ingredients.map((i) => (
                        <div key={i.id} className="flex justify-between text-sm text-muted-foreground">
                          <span>{i.productName}</span>
                          <span>{i.mlUsed} ml</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Custo {formatBRL(r.costPrice)}</p>
                        <p className="text-xl font-bold text-primary">{formatBRL(r.salePrice)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="success">{Math.round(r.marginPct ?? 0)}% margem</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{r.totalMl} ml</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <RecipeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recipe={editing}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir copão"
        description={`Remover a receita "${toDelete?.name}"?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
