import { useEffect, useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from 'sonner'

/** Portão de acesso ao módulo financeiro (senha). */
export function FinanceGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<'loading' | 'setup' | 'locked' | 'unlocked'>('loading')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')

  useEffect(() => {
    api.finance
      .hasPassword()
      .then((has) => setStatus(has ? 'locked' : 'setup'))
      .catch(() => setStatus('setup'))
  }, [])

  async function setup(): Promise<void> {
    if (pwd.length < 4) {
      toast.warning('A senha deve ter ao menos 4 caracteres.')
      return
    }
    if (pwd !== pwd2) {
      toast.warning('As senhas não conferem.')
      return
    }
    try {
      await api.finance.setPassword(pwd)
      toast.success('Senha definida.')
      setStatus('unlocked')
    } catch (err) {
      toast.error('Erro ao definir senha', { description: (err as Error).message })
    }
  }

  async function unlock(): Promise<void> {
    try {
      const ok = await api.finance.verifyPassword(pwd)
      if (ok) {
        setStatus('unlocked')
        setPwd('')
      } else {
        toast.error('Senha incorreta.')
      }
    } catch (err) {
      toast.error('Erro ao validar senha', { description: (err as Error).message })
    }
  }

  if (status === 'unlocked') return <>{children}</>
  if (status === 'loading') return <div className="p-8 text-muted-foreground">Carregando...</div>

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {status === 'setup' ? <ShieldCheck className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>
          <CardTitle>{status === 'setup' ? 'Proteger o Financeiro' : 'Área restrita'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === 'setup' ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Defina uma senha para proteger os dados financeiros.
              </p>
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar senha</Label>
                <Input
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setup()}
                />
              </div>
              <Button className="w-full" onClick={setup}>
                Definir senha
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && unlock()}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={unlock}>
                Entrar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
