import { useEffect, useState } from 'react'
import { Save, Palette, Receipt, Printer, Check, Beer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/stores/settings'
import { BRAND_COLORS } from '@/config/brandColors'
import { cn } from '@/lib/utils'
import type { FiscalConfig } from '@shared/types'
import { toast } from 'sonner'

export function ConfiguracoesPage(): React.JSX.Element {
  const [storeName, setStoreName] = useState('')
  const [tagline, setTagline] = useState('')
  const [fiscal, setFiscal] = useState<FiscalConfig>({
    enabled: false,
    providerUrl: '',
    apiToken: '',
    cnpj: ''
  })
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingFiscal, setSavingFiscal] = useState(false)
  const [printerName, setPrinterName] = useState('')
  const [printerWidth, setPrinterWidth] = useState('80mm')
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [savingPrinter, setSavingPrinter] = useState(false)
  const applyStoreName = useSettingsStore((s) => s.setStoreName)
  const applyTagline = useSettingsStore((s) => s.setTagline)
  const applyBrand = useSettingsStore((s) => s.setBrandColor)
  const brandColor = useSettingsStore((s) => s.brandColor)

  useEffect(() => {
    api.settings.get('store_name').then((v) => setStoreName(v ?? ''))
    api.settings.get('store_tagline').then((v) => setTagline(v ?? ''))
    api.fiscal.getConfig().then(setFiscal).catch(() => {})
    api.settings.get('thermal_printer_name').then((v) => setPrinterName(v ?? ''))
    api.settings.get('thermal_width').then((v) => setPrinterWidth(v || '80mm'))
    api.print.listPrinters().then(setPrinters).catch(() => setPrinters([]))
  }, [])

  async function savePrinter(): Promise<void> {
    setSavingPrinter(true)
    try {
      await api.settings.set('thermal_printer_name', printerName)
      await api.settings.set('thermal_width', printerWidth)
      toast.success('Impressora salva.')
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message })
    } finally {
      setSavingPrinter(false)
    }
  }

  async function saveGeneral(): Promise<void> {
    setSavingGeneral(true)
    try {
      await api.settings.set('store_name', storeName.trim())
      await api.settings.set('store_tagline', tagline.trim())
      await api.settings.set('brand_color', brandColor)
      applyStoreName(storeName.trim()) // reflete na sidebar e no título na hora
      applyTagline(tagline.trim())
      toast.success('Identidade visual salva.')
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
          {/* Identidade visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" /> Identidade visual
              </CardTitle>
              <CardDescription className="text-base">
                Personalize o nome, o slogan e a cor do seu estabelecimento. As mudanças
                aparecem na hora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Prévia */}
              <div className="flex items-center gap-3 rounded-xl border bg-card/60 p-4">
                <div className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
                  <Beer className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-lg font-bold">{storeName || 'Seu estabelecimento'}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {tagline || 'Gestão & Crediário'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome do estabelecimento</Label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex.: Depósito do Zé"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slogan</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Ex.: Bebidas geladas & conveniência"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor da marca</Label>
                <div className="flex flex-wrap gap-2.5">
                  {BRAND_COLORS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => applyBrand(b.id)}
                      title={b.label}
                      className={cn(
                        'relative h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110',
                        brandColor === b.id ? 'ring-foreground' : 'ring-transparent'
                      )}
                      style={{ backgroundColor: `hsl(${b.primary})` }}
                    >
                      {brandColor === b.id && (
                        <Check
                          className="absolute inset-0 m-auto h-5 w-5"
                          style={{ color: `hsl(${b.primaryForeground})` }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={saveGeneral} disabled={savingGeneral}>
                <Save className="h-4 w-4" /> Salvar identidade
              </Button>
            </CardContent>
          </Card>

          {/* Impressão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" /> Impressão da comanda
              </CardTitle>
              <CardDescription className="text-base">
                Impressora térmica (ESC/POS). Sem impressora definida, a comanda abre em
                pré-visualização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Impressora</Label>
                <Select value={printerName || '__none__'} onValueChange={(v) => setPrinterName(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pré-visualização (sem impressora)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Pré-visualização (sem impressora)</SelectItem>
                    {printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Largura do papel</Label>
                <Select value={printerWidth} onValueChange={setPrinterWidth}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80 mm</SelectItem>
                    <SelectItem value="58mm">58 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={savePrinter} disabled={savingPrinter}>
                <Save className="h-4 w-4" /> Salvar impressora
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
                Opcional. Quando ativo, permite emitir nota no fechamento da comanda.
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
