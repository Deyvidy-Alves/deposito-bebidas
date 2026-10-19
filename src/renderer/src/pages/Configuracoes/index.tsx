import { useEffect, useState } from 'react'
import { Save, Store, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/stores/settings'
import type { FiscalConfig } from '@shared/types'
import { toast } from 'sonner'

export function ConfiguracoesPage(): React.JSX.Element {
  const [storeName, setStoreName] = useState('')
  const [fiscal, setFiscal] = useState<FiscalConfig>({
    enabled: false,
    providerUrl: '',
    apiToken: '',
    cnpj: ''
  })
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingFiscal, setSavingFiscal] = useState(false)
  const applyStoreName = useSettingsStore((s) => s.setStoreName)

  useEffect(() => {
    api.settings.get('store_name').then((v) => setStoreName(v ?? ''))
    api.fiscal.getConfig().then(setFiscal).catch(() => {})
  }, [])

  async function saveGeneral(): Promise<void> {
    setSavingGeneral(true)
    try {
      await api.settings.set('store_name', storeName.trim())
      applyStoreName(storeName.trim()) // reflete na sidebar e no título na hora
      toast.success('Configurações salvas.')
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message })
    } finally {
      setSavingGeneral(false)
    }
  }

  async function saveFiscal(): Promise<void> {
    setSavingFiscal(true)
    try {
      await api.fiscal.setConfig(fiscal)
      toast.success('Módulo fiscal atualizado.')
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message })
    } finally {
      setSavingFiscal(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Configurações" description="Preferências do sistema" />

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-6 p-8">
          {/* Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do estabelecimento</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <Button onClick={saveGeneral} disabled={savingGeneral}>
                <Save className="h-4 w-4" /> Salvar
              </Button>
            </CardContent>
          </Card>

          {/* Fiscal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Módulo Fiscal
              </CardTitle>
              <CardDescription className="text-base">
                Opcional. Quando ativo, permite emitir nota no fechamento da mesa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Ativar emissão fiscal</p>
                  <p className="text-sm text-muted-foreground">
                    Integração com API REST (Nuvem Fiscal ou similar).
                  </p>
                </div>
                <Switch
                  checked={fiscal.enabled}
                  onCheckedChange={(v) => setFiscal((f) => ({ ...f, enabled: v }))}
                />
              </div>

              {fiscal.enabled && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>CNPJ do emitente</Label>
                    <Input
                      value={fiscal.cnpj}
                      onChange={(e) => setFiscal((f) => ({ ...f, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL da API fiscal</Label>
                    <Input
                      value={fiscal.providerUrl}
                      onChange={(e) => setFiscal((f) => ({ ...f, providerUrl: e.target.value }))}
                      placeholder="https://api.nuvemfiscal.com.br/nfce"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Token de acesso</Label>
                    <Input
                      type="password"
                      value={fiscal.apiToken}
                      onChange={(e) => setFiscal((f) => ({ ...f, apiToken: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <Button onClick={saveFiscal} disabled={savingFiscal}>
                <Save className="h-4 w-4" /> Salvar fiscal
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
