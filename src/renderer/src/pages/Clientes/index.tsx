import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientFormDialog } from './ClientFormDialog'
import { ClientDetailDialog } from './ClientDetailDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/utils'
import type { Client, ClientWithBalance } from '@shared/types'
import { toast } from 'sonner'

export function ClientesPage(): React.JSX.Element {
  const [clients, setClients] = useState<ClientWithBalance[]>([])
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ClientWithBalance | null>(null)
  const location = useLocation()

  async function load(): Promise<void> {
    try {
      setClients(await api.clients.list())
    } catch (err) {
      toast.error('Erro ao carregar clientes', { description: (err as Error).message })
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const state = location.state as { focusId?: number } | null
    if (state?.focusId) {
      setDetailId(state.focusId)
      setDetailOpen(true)
    }
  }, [location.key])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nickname ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
    )
  }, [clients, query])

  async function remove(): Promise<void> {
    if (!toDelete) return
    try {
      await api.clients.remove(toDelete.id)
      toast.success('Cliente excluído.')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error('Não foi possível excluir', { description: (err as Error).message })
      setToDelete(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Clientes" description="Cadastro e saldo devedor">
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> Novo cliente
        </Button>
      </PageHeader>

      <div className="border-b px-8 py-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, apelido ou telefone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <UserRound className="h-8 w-8 text-muted-foreground" />
              <p className="text-base text-muted-foreground">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Mesas abertas</TableHead>
                  <TableHead className="text-right">Saldo devedor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setDetailId(c.id)
                      setDetailOpen(true)
                    }}
                  >
                    <TableCell className="font-medium">
                      {c.name}
                      {c.nickname && (
                        <span className="ml-1 text-muted-foreground">({c.nickname})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      {c.openTables > 0 ? (
                        <Badge variant="secondary">{c.openTables}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${c.debt > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatBRL(c.debt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(c)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </ScrollArea>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        onSaved={load}
      />
      <ClientDetailDialog clientId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir cliente"
        description={`Deseja excluir "${toDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
