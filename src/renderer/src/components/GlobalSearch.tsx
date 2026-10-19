import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Beer, Package, Users } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { api } from '@/lib/api'
import type { SearchResult, SearchResultKind } from '@shared/types'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const KIND_META: Record<SearchResultKind, { label: string; icon: typeof Beer; route: string }> = {
  client: { label: 'Clientes', icon: Users, route: '/clientes' },
  product: { label: 'Produtos', icon: Package, route: '/estoque' },
  table: { label: 'Comandas', icon: Beer, route: '/mesas' }
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let active = true
    const t = setTimeout(async () => {
      try {
        const r = await api.search.global(query)
        if (active) setResults(r)
      } catch {
        if (active) setResults([])
      }
    }, 150)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query])

  const grouped = (['client', 'product', 'table'] as SearchResultKind[])
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)

  function select(result: SearchResult): void {
    const meta = KIND_META[result.kind]
    onOpenChange(false)
    navigate(meta.route, { state: { focusId: result.id } })
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar cliente, produto ou comanda..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() && grouped.length === 0 && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}
        {!query.trim() && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Digite para buscar em clientes, produtos e comandas.
          </div>
        )}
        {grouped.map((g) => {
          const meta = KIND_META[g.kind]
          const Icon = meta.icon
          return (
            <CommandGroup key={g.kind} heading={meta.label}>
              {g.items.map((item) => (
                <CommandItem
                  key={`${item.kind}-${item.id}`}
                  value={`${item.kind}-${item.id}-${item.title}`}
                  onSelect={() => select(item)}
                >
                  <Icon className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-sm text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
