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
import { api } from '@/lib/api'
import type { Client } from '@shared/types'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  nickname: z.string().trim().optional(),
  phone: z.string().trim().optional()
})

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  client?: Client | null
  onSaved: () => void
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved
}: ClientFormDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(client?.name ?? '')
      setNickname(client?.nickname ?? '')
      setPhone(client?.phone ?? '')
    }
  }, [open, client])

  async function save(): Promise<void> {
    const parsed = schema.safeParse({ name, nickname, phone })
    if (!parsed.success) {
      toast.warning(parsed.error.issues[0].message)
      return
    }
    setSaving(true)
    try {
      const input = {
        name: parsed.data.name,
        nickname: parsed.data.nickname || null,
        phone: parsed.data.phone || null
      }
      if (client) await api.clients.update(client.id, input)
      else await api.clients.create(input)
      toast.success(client ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao salvar cliente', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Apelido</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
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
