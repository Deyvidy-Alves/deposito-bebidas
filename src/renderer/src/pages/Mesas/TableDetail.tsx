import { useEffect, useMemo, useState } from 'react'
import { Trash2, UserPlus, Users, Receipt, DoorClosed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AddItemBar } from './AddItemBar'
import { useTablesStore } from '@/stores/tables'
import { api } from '@/lib/api'
import { formatBRL, formatDateTime } from '@/lib/utils'
import type { ClientWithBalance } from '@shared/types'
import { toast } from 'sonner'

export function TableDetail({ onRequestClose }: { onRequestClose: () => void }): React.JSX.Element {
  const detail = useTablesStore((s) => s.detail)
  const refreshAll = useTablesStore((s) => s.refreshAll)
  const [addOpen, setAddOpen] = useState(false)

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Receipt className="h-10 w-10" />
        <p className="text-base">Selecione uma mesa para ver os detalhes.</p>
      </div>
    )
  }

  const isOpen = detail.status === 'open'

  async function removeItem(id: number): Promise<void> {
    try {
      await api.tables.removeItem(id)
      await refreshAll()
      toast.success('Item removido.')
    } catch (err) {
      toast.error('Erro ao remover item', { description: (err as Error).message })
    }
  }

  async function removeParticipant(clientId: number): Promise<void> {
    try {
      await api.tables.removeClient(detail!.id, clientId)
      await refreshAll()
    } catch (err) {
      toast.error('Erro ao remover participante', { description: (err as Error).message })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between border-b px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{detail.label ?? `Mesa #${detail.id}`}</h2>
            <Badge variant={isOpen ? 'success' : 'secondary'}>
              {isOpen ? 'Aberta' : 'Fechada'}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Aberta em {formatDateTime(detail.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-primary">{formatBRL(detail.total)}</p>
        </div>
      </div>

      {/* Participantes e rateio */}
      <div className="border-b px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" /> Participantes ({detail.participants.length})
          </div>
          {isOpen && (
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Adicionar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div>
                <p className="font-medium leading-tight">{p.nickname ?? p.name}</p>
                <p className="text-sm leading-tight text-primary">
                  {formatBRL(detail.perClientShare[p.id] ?? 0)}
                </p>
              </div>
              {p.settled ? (
                <Badge variant="secondary" className="text-xs">
                  pago
                </Badge>
              ) : (
                isOpen && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar item */}
      {isOpen && (
        <div className="border-b px-6 py-4">
          <AddItemBar tableId={detail.id} onAdded={refreshAll} />
        </div>
      )}

      {/* Itens */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          {detail.items.length === 0 ? (
            <p className="py-10 text-center text-base text-muted-foreground">
              Nenhum item ainda. Use a busca acima para adicionar.
            </p>
          ) : (
            <div className="space-y-1">
              {detail.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="min-w-8 rounded bg-muted px-2 py-0.5 text-center text-sm font-semibold">
                      {item.quantity}×
                    </span>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBRL(item.unitPrice)} un.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold">{formatBRL(item.subtotal)}</span>
                    {isOpen && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Rodapé: fechar/pagamento */}
      {isOpen && (
        <div className="border-t px-6 py-4">
          <Button
            className="w-full"
            size="lg"
            disabled={detail.items.length === 0}
            onClick={onRequestClose}
          >
            <DoorClosed className="h-5 w-5" /> Fechar / Pagamento
          </Button>
        </div>
      )}

      <AddParticipantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingIds={detail.participants.map((p) => p.id)}
        onAdded={async (clientId) => {
          await api.tables.addClient(detail.id, clientId)
          await refreshAll()
          setAddOpen(false)
        }}
      />
    </div>
  )
}

function AddParticipantDialog({
  open,
  onOpenChange,
  existingIds,
  onAdded
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  existingIds: number[]
  onAdded: (clientId: number) => void
}): React.JSX.Element {
  const [clients, setClients] = useState<ClientWithBalance[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      api.clients.list().then(setClients).catch(() => setClients([]))
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients
      .filter((c) => !existingIds.includes(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.nickname ?? '').toLowerCase().includes(q))
  }, [clients, query, existingIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar participante</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar cliente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Separator />
        <ScrollArea className="h-64">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente disponível.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onAdded(c.id)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-accent"
                >
                  <span className="font-medium">
                    {c.name}
                    {c.nickname && <span className="ml-1 text-muted-foreground">({c.nickname})</span>}
                  </span>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
