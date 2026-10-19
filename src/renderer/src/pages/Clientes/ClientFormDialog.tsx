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
  const [openingDebt, setOpeningDebt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(client?.name ?? '')
      setNickname(client?.nickname ?? '')
      setPhone(client?.phone ?? '')
      setOpeningDebt('')
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
      if (client) {
        await api.clients.update(client.id, input)
      } else {
        const debt = Number(openingDebt.replace(',', '.')) || 0
        await api.clients.create({ ...input, openingDebt: debt > 0 ? debt : null })
      }
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
          {!client && (
            <div className="space-y-1.5 rounded-lg border border-dashed bg-muted/30 p-3">
              <Label>Saldo devedor anterior (R$)</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={openingDebt}
                onChange={(e) => setOpeningDebt(e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Se o cliente já devia de outro sistema, informe aqui — vira
                crediário em aberto (comanda “Saldo anterior”).
              </p>
            </div>
          )}
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
