import { BrowserWindow } from 'electron'
import posPrinterPkg from 'electron-pos-printer'
import type { PosPrintData, PosPrintOptions } from 'electron-pos-printer'
import { TablesService } from './tables'

// electron-pos-printer é CommonJS; no main (ESM) importamos o default e extraímos.
const { PosPrinter } = posPrinterPkg
import { SettingsService } from './settings'
import { formatBRL } from '../lib/money'

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card: 'Cartao',
  credit: 'Fiado',
  mixed: 'Misto'
}

/** Lista as impressoras detectadas pelo sistema (para escolher nas Configurações). */
export async function listPrinters(): Promise<{ name: string; displayName: string }[]> {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return []
  const printers = await win.webContents.getPrintersAsync()
  return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name }))
}

/** Monta uma linha "esquerda ........ direita" com largura fixa (monoespaçada). */
function fitLine(left: string, right: string, width: number): string {
  const maxLeft = Math.max(0, width - right.length - 1)
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left
  const pad = Math.max(1, width - l.length - right.length)
  return l + ' '.repeat(pad) + right
}

/** Monta os elementos da comanda térmica (ESC/POS via electron-pos-printer). */
function buildReceipt(tableId: number): PosPrintData[] {
  const d = TablesService.getDetails(tableId)
  const store = SettingsService.get('store_name') ?? 'Deposito'
  const title = d.label ?? `Mesa #${d.id}`
  const is58 = (SettingsService.get('thermal_width') || '80mm') === '58mm'
  const cols = is58 ? 32 : 44 // caracteres por linha conforme o papel

  const mono = { fontFamily: "'Courier New', monospace", fontSize: is58 ? '11px' : '12px' }
  const center = { ...mono, textAlign: 'center' as const }
  const sep = '-'.repeat(cols)

  const data: PosPrintData[] = [
    { type: 'text', value: store, style: { ...center, fontWeight: 'bold', fontSize: '15px' } },
    { type: 'text', value: `Comanda - ${title}`, style: center },
    { type: 'text', value: sep, style: center }
  ]

  // Itens — "2x Gin Invictus .......... R$ 90,00"
  for (const i of d.items) {
    data.push({
      type: 'text',
      value: fitLine(`${i.quantity}x ${i.description}`, formatBRL(i.subtotal), cols),
      style: mono
    })
  }

  data.push({ type: 'text', value: sep, style: center })
  data.push({ type: 'text', value: 'DIVISAO POR PESSOA', style: { ...mono, fontWeight: 'bold' } })

  for (const p of d.participants) {
    const pays = d.clientPayments[p.id] ?? []
    const methods = Array.from(new Set(pays.map((x) => x.method)))
    const mTxt =
      methods.length === 0
        ? ''
        : methods.length === 1
          ? ` (${METHOD_LABEL[methods[0]] ?? methods[0]})`
          : ' (Misto)'
    data.push({
      type: 'text',
      value: fitLine(`${p.nickname ?? p.name}${mTxt}`, formatBRL(d.perClientShare[p.id] ?? 0), cols),
      style: mono
    })
  }

  data.push({ type: 'text', value: sep, style: center })
  data.push({
    type: 'text',
    value: `TOTAL: ${formatBRL(d.total)}`,
    style: { ...center, fontWeight: 'bold', fontSize: '15px' }
  })
  data.push({ type: 'text', value: ' ', style: mono })
  data.push({ type: 'text', value: 'Obrigado!', style: { ...center, fontSize: '10px' } })

  return data
}

/** Imprime a comanda na impressora térmica configurada (ou abre o preview). */
export async function printBill(tableId: number): Promise<{ ok: boolean; preview: boolean }> {
  const data = buildReceipt(tableId)
  const printerName = SettingsService.get('thermal_printer_name') ?? ''
  const width = SettingsService.get('thermal_width') || '80mm'

  const options: PosPrintOptions = {
    preview: !printerName, // sem impressora definida -> mostra pré-visualização
    silent: !!printerName,
    printerName: printerName || undefined,
    width,
    margin: '0 0 0 0',
    copies: 1,
    timeOutPerLine: 400
  }

  await PosPrinter.print(data, options)
  return { ok: true, preview: !printerName }
}

export const thermalPrintRoutes = {
  'print:listPrinters': () => listPrinters(),
  'tables:printThermal': (tableId: number) => printBill(tableId)
}
