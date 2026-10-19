import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { RecipeFormDialog } from './RecipeFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { api } from '@/lib/api'
import { formatBRL, cn } from '@/lib/utils'
import { RECIPE_TYPES, recipeTypeMeta } from '@/config/recipeTypes'
import type { CopaRecipeWithIngredients, RecipeType } from '@shared/types'
import { toast } from 'sonner'

type Filter = 'all' | RecipeType

export function ReceitasPage(): React.JSX.Element {
  const [recipes, setRecipes] = useState<CopaRecipeWithIngredients[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CopaRecipeWithIngredients | null>(null)
  const [preset, setPreset] = useState<RecipeType>('copao')
  const [toDelete, setToDelete] = useState<CopaRecipeWithIngredients | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  async function load(): Promise<void> {
    try {
      setRecipes(await api.copa.list())
    } catch (err) {
      toast.error('Erro ao carregar receitas', { description: (err as Error).message })
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Quantidade por tipo (para badges das abas).
  const counts = useMemo(() => {
    const map = new Map<RecipeType, number>()
    for (const r of recipes) map.set(r.recipeType, (map.get(r.recipeType) ?? 0) + 1)
    return map
  }, [recipes])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter(
      (r) =>
        (filter === 'all' || r.recipeType === filter) &&
        (q === '' || r.name.toLowerCase().includes(q))
    )
  }, [recipes, filter, query])

  function openNew(type: RecipeType): void {
    setEditing(null)
    setPreset(type)
    setFormOpen(true)
  }

  async function duplicate(r: CopaRecipeWithIngredients): Promise<void> {
    try {
      await api.copa.create({
        name: `${r.name} (cópia)`,
        recipeType: r.recipeType,
        description: r.description,
        ingredients: r.ingredients.map((i) => ({
          productId: i.productId,
          mlUsed: i.mlUsed,
          bottleMl: i.volumePerUnit || null
        })),
        salePrice: r.salePrice
      })
      toast.success('Receita duplicada.')
      load()
    } catch (err) {
      toast.error('Erro ao duplicar', { description: (err as Error).message })
    }
  }

  async function remove(): Promise<void> {
    if (!toDelete) return
    try {
      await api.copa.remove(toDelete.id)
      toast.success('Receita removida.')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error('Erro ao remover', { description: (err as Error).message })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Receitas" description="Fichas técnicas: copões, drinks, combos e porções">
        <Button onClick={() => openNew(filter === 'all' ? 'copao' : filter)}>
          <Plus /> Nova receita
        </Button>
      </PageHeader>

      {/* Filtros por tipo + busca */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 px-8 py-3">
        <FilterChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Todas"
          count={recipes.length}
        />
        {RECIPE_TYPES.map((t) => (
          <FilterChip
            key={t.value}
            active={filter === t.value}
            onClick={() => setFilter(t.value)}
            label={t.plural}
            count={counts.get(t.value) ?? 0}
          />
        ))}
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar receita..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8">
          {visible.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={recipes.length === 0 ? 'Nenhuma receita ainda' : 'Nada encontrado'}
              message={
                recipes.length === 0
                  ? 'Monte copões, drinks e combos a partir dos produtos do estoque — o custo é calculado proporcionalmente.'
                  : 'Ajuste o filtro ou a busca para ver outras receitas.'
              }
              action={
                recipes.length === 0 ? (
                  <Button onClick={() => openNew('copao')}>
                    <Plus /> Criar primeira receita
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((r) => {
                const meta = recipeTypeMeta(r.recipeType)
                const Icon = meta.icon
                const margin = Math.round(r.marginPct ?? 0)
                return (
                  <Card key={r.id} className="group transition-colors hover:border-primary/40">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate">{r.name}</span>
                        </CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicate(r)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => {
                            setEditing(r)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setToDelete(r)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        {r.ingredients.map((i) => (
                          <div
                            key={i.id}
                            className="flex justify-between text-sm text-muted-foreground"
                          >
                            <span className="truncate">{i.productName}</span>
                            <span className="shrink-0 tabular-nums">
                              {i.volumePerUnit > 0 ? `${i.mlUsed} ml` : `${i.mlUsed} un`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-end justify-between border-t pt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo {formatBRL(r.costPrice)}</p>
                          <p className="text-xl font-bold text-primary tabular-nums">
                            {formatBRL(r.salePrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={margin >= 50 ? 'success' : margin >= 20 ? 'warning' : 'secondary'}
                          >
                            {margin}% margem
                          </Badge>
                          {r.totalMl > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                              {r.totalMl} ml
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <RecipeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recipe={editing}
        defaultType={preset}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir receita"
        description={`Remover a receita "${toDelete?.name}"?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs tabular-nums',
          active ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        {count}
      </span>
    </button>
  )
}
