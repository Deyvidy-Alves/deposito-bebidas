import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, UserPlus, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ClientWithBalance } from '@shared/types'
import { toast } from 'sonner'

interface NewTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (tableId: number) => void
}

export function NewTableDialog({
  open,
  onOpenChange,
  onCreated
}: NewTableDialogProps): React.JSX.Element {
  const [clients, setClients] = useState<ClientWithBalance[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Map<number, string>>(new Map())
  const [label, setLabel] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNick, setNewNick] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(new Map())
      setLabel('')
      setCreatingNew(false)
      setNewName('')
      setNewNick('')
      api.clients.list().then(setClients).catch(() => setClients([]))
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (c.nickname ?? '').toLowerCase().includes(q)
    )
  }, [clients, query])

  function toggle(c: ClientWithBalance): void {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(c.id)) next.delete(c.id)
      else next.set(c.id, c.nickname ?? c.name)
      return next
    })
  }

  async function createInline(): Promise<void> {
    if (!newName.trim()) {
      toast.warning('Informe o nome do cliente.')
      return
    }
    try {
      const c = await api.clients.create({ name: newName.trim(), nickname: newNick.trim() || null })
      setClients((prev) => [...prev, { ...c, debt: 0, openTables: 0 }])
      setSelected((prev) => new Map(prev).set(c.id, c.nickname ?? c.name))
      setCreatingNew(false)
      setNewName('')
      setNewNick('')
      toast.success('Cliente cadastrado.')
    } catch (err) {
      toast.error('Erro ao cadastrar cliente', { description: (err as Error).message })
    }
  }

  async function handleCreate(): Promise<void> {
    if (selected.size === 0) {
      toast.warning('Selecione ao menos um cliente.')
      return
    }
    setSaving(true)
    try {
      const id = await api.tables.create({
        clientIds: [...selected.keys()],
        label: label.trim() || null
      })
      toast.success('Comanda aberta!')
      onCreated(id)
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao abrir comanda', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rótulo da comanda (opcional)</Label>
            <Input
              placeholder="Ex.: Comanda 3, Varanda, Galera do Zé"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Chips dos selecionados */}
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {[...selected.entries()].map(([id, name]) => (
                <Badge key={id} variant="secondary" className="gap-1 py-1 text-sm">
                  {name}
                  <button onClick={() => toggle({ id } as ClientWithBalance)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Participantes</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreatingNew((v) => !v)}
              >
                <UserPlus className="h-4 w-4" /> Novo cliente
              </Button>
            </div>

            {creatingNew && (
              <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Apelido</Label>
                  <Input value={newNick} onChange={(e) => setNewNick(e.target.value)} />
                </div>
                <Button onClick={createInline}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            )}

            <Input
              placeholder="Buscar cliente por nome ou apelido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <ScrollArea className="h-56 rounded-lg border">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum cliente. Cadastre um novo acima.
                </p>
              ) : (
                <div className="divide-y">
                  {filtered.map((c) => {
                    const isSel = selected.has(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggle(c)}
                        className={cn(
                          'flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-accent',
                          isSel && 'bg-primary/10'
                        )}
                      >
                        <div>
                          <p className="font-medium">
                            {c.name}
                            {c.nickname && (
                              <span className="ml-1 text-muted-foreground">({c.nickname})</span>
                            )}
                          </p>
                          {c.debt > 0 && (
                            <p className="text-xs text-warning">deve R$ {c.debt.toFixed(2)}</p>
                          )}
                        </div>
                        {isSel && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving || selected.size === 0}>
            Abrir comanda ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
