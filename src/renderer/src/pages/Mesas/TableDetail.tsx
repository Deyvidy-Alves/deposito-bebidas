import { useEffect, useMemo, useState } from 'react'
import { Trash2, UserPlus, Users, Receipt, DoorClosed, X, Plus, Minus, SplitSquareHorizontal } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { AddItemBar } from './AddItemBar'
import { BillDialog } from './BillDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useTablesStore } from '@/stores/tables'
import { api } from '@/lib/api'
import { formatBRL, formatDateTime, summarizePayments } from '@/lib/utils'
import type { ClientWithBalance } from '@shared/types'
import { toast } from 'sonner'

export function TableDetail({ onRequestClose }: { onRequestClose: () => void }): React.JSX.Element {
  const detail = useTablesStore((s) => s.detail)
  const refreshAll = useTablesStore((s) => s.refreshAll)
  const select = useTablesStore((s) => s.select)
  const [addOpen, setAddOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [confirm, setConfirm] = useState<
    { kind: 'item'; id: number; label: string } | { kind: 'participant'; id: number; label: string } | null
  >(null)

  // Esc fecha o detalhe da mesa (quando nenhum diálogo está aberto).
  useEffect(() => {
    if (!detail) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail, select])

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

  async function changeQty(itemId: number, quantity: number): Promise<void> {
    try {
      await api.tables.updateItemQuantity(itemId, quantity)
      await refreshAll()
    } catch (err) {
      const msg = (err as Error).message.replace('ESTOQUE_INSUFICIENTE:', '')
      toast.error('Não foi possível alterar a quantidade', { description: msg })
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
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">{formatBRL(detail.total)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBillOpen(true)}>
            <Receipt className="h-4 w-4" /> Conta
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Fechar (Esc)"
            onClick={() => select(null)}
          >
            <X className="h-5 w-5" />
          </Button>
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
          {detail.participants.map((p) => {
            const pays = detail.clientPayments[p.id] ?? []
            const payLabel = summarizePayments(pays)
            const isFiado = pays.length > 0 && pays.every((x) => x.method === 'credit')
            return (
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
                  <Badge variant={isFiado ? 'warning' : 'success'} className="text-xs">
                    {payLabel || 'pago'}
                  </Badge>
                ) : (
                  isOpen && (
                    <button
                      onClick={() =>
                        setConfirm({ kind: 'participant', id: p.id, label: p.nickname ?? p.name })
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
            )
          })}
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
                    {isOpen ? (
                      <div className="flex items-center rounded-md border">
                        <button
                          onClick={() => changeQty(item.id, item.quantity - 1)}
                          className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                          title="Diminuir"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-7 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => changeQty(item.id, item.quantity + 1)}
                          className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                          title="Aumentar"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="min-w-8 rounded bg-muted px-2 py-0.5 text-center text-sm font-semibold">
                        {item.quantity}×
                      </span>
                    )}
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBRL(item.unitPrice)} un.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOpen && detail.participants.length > 1 && (
                      <ItemSplitControl
                        itemQuantity={item.quantity}
                        participants={detail.participants}
                        splits={detail.itemSplits[item.id] ?? []}
                        onChange={async (splits) => {
                          await api.tables.setItemSplit(item.id, splits)
                          await refreshAll()
                        }}
                      />
                    )}
                    <span className="text-base font-semibold">{formatBRL(item.subtotal)}</span>
                    {isOpen && (
                      <button
                        onClick={() =>
                          setConfirm({ kind: 'item', id: item.id, label: item.description })
                        }
                        className="text-muted-foreground hover:text-destructive"
                        title="Remover"
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

      <BillDialog detail={detail} open={billOpen} onOpenChange={setBillOpen} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'participant' ? 'Remover participante' : 'Remover item'}
        description={
          confirm?.kind === 'participant'
            ? `Tirar "${confirm?.label}" desta mesa?`
            : `Remover "${confirm?.label}"? O estoque será devolvido.`
        }
        confirmLabel="Remover"
        destructive
        onConfirm={async () => {
          if (!confirm) return
          if (confirm.kind === 'item') await removeItem(confirm.id)
          else await removeParticipant(confirm.id)
          setConfirm(null)
        }}
      />
    </div>
  )
}

function ItemSplitControl({
  itemQuantity,
  participants,
  splits,
  onChange
}: {
  itemQuantity: number
  participants: { id: number; name: string; nickname: string | null }[]
  splits: { clientId: number; quantity: number }[]
  onChange: (splits: { clientId: number; quantity: number }[]) => void
}): React.JSX.Element {
  const custom = splits.length > 0
  // Quantidade atribuída a cada pessoa (0 quando ninguém foi definido = igual).
  const qtyOf = (id: number): number => splits.find((s) => s.clientId === id)?.quantity ?? 0

  function setQty(id: number, q: number): void {
    const map = new Map(splits.map((s) => [s.clientId, s.quantity]))
    const q2 = Math.max(0, q)
    if (q2 === 0) map.delete(id)
    else map.set(id, q2)
    onChange([...map.entries()].map(([clientId, quantity]) => ({ clientId, quantity })))
  }

  const assigned = splits.reduce((a, s) => a + s.quantity, 0)
  const label = custom ? `${assigned}/${itemQuantity}` : 'Igual'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm"
          title="Dividir item por quem pegou"
        >
          <SplitSquareHorizontal className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-xs text-muted-foreground">Quanto cada um pegou</p>
          {custom && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => onChange([])}
            >
              Dividir igual
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {participants.map((p) => {
            const q = qtyOf(p.id)
            return (
              <div key={p.id} className="flex items-center justify-between rounded-md px-2 py-1">
                <span className="text-base">{p.nickname ?? p.name}</span>
                <div className="flex items-center rounded-md border">
                  <button
                    className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setQty(p.id, q - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold">{q}</span>
                  <button
                    className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setQty(p.id, q + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {custom && (
          <p
            className={`px-1 pt-1 text-xs ${
              Math.abs(assigned - itemQuantity) < 0.001 ? 'text-muted-foreground' : 'text-warning'
            }`}
          >
            Atribuído: {assigned} de {itemQuantity}
            {Math.abs(assigned - itemQuantity) >= 0.001 && ' (o valor é rateado proporcionalmente)'}
          </p>
        )}
      </PopoverContent>
    </Popover>
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
