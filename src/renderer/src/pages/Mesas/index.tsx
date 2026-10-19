import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NewTableDialog } from './NewTableDialog'
import { TableDetail } from './TableDetail'
import { useTablesStore } from '@/stores/tables'
import { cn, formatBRL } from '@/lib/utils'
import { toast } from 'sonner'

export function MesasPage(): React.JSX.Element {
  const { summaries, filter, activeId, setFilter, loadSummaries, select } = useTablesStore()
  const [newOpen, setNewOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  // Reage a navegação vinda do dashboard / atalho F2 / busca global.
  useEffect(() => {
    const state = location.state as { newTable?: boolean; focusId?: number } | null
    if (state?.newTable) setNewOpen(true)
    if (state?.focusId) select(state.focusId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  return (
    <div className="flex h-full">
      {/* Coluna de mesas */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <PageHeader title="Mesas">
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </PageHeader>

        <div className="flex gap-1 border-b p-2">
          <FilterTab active={filter === 'open'} onClick={() => setFilter('open')}>
            Abertas
          </FilterTab>
          <FilterTab active={filter === 'closed'} onClick={() => setFilter('closed')}>
            Fechadas
          </FilterTab>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {summaries.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {filter === 'open' ? 'Nenhuma mesa aberta.' : 'Nenhuma mesa fechada.'}
              </p>
            ) : (
              summaries.map((t) => (
                <button
                  key={t.id}
                  onClick={() => select(t.id)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/50',
                    activeId === t.id ? 'border-primary bg-primary/10' : 'bg-card'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.label ?? `Mesa #${t.id}`}</span>
                    <span className="font-bold text-primary">{formatBRL(t.total)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {t.participants.length > 0
                      ? t.participants.map((p) => p.nickname ?? p.name).join(', ')
                      : 'Sem participantes'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t.itemCount} {t.itemCount === 1 ? 'item' : 'itens'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t.participants.length} pessoa(s)
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detalhe */}
      <div className="flex-1">
        <TableDetail
          onRequestClose={() =>
            toast.info('Fechamento e pagamento', {
              description: 'Disponível no módulo de Pagamentos.'
            })
          }
        />
      </div>

      <NewTableDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          loadSummaries()
          select(id)
        }}
      />
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
      )}
    >
      {children}
    </button>
  )
}
