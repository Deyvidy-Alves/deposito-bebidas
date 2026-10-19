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

/** Monta os elementos da comanda térmica (ESC/POS via electron-pos-printer). */
function buildReceipt(tableId: number): PosPrintData[] {
  const d = TablesService.getDetails(tableId)
  const store = SettingsService.get('store_name') ?? 'Deposito'
  const title = d.label ?? `Mesa #${d.id}`

  const data: PosPrintData[] = [
    { type: 'text', value: store, style: { fontWeight: 'bold', textAlign: 'center', fontSize: '20px' } },
    { type: 'text', value: `Comanda - ${title}`, style: { textAlign: 'center', fontSize: '12px' } },
    { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } }
  ]

  // Itens
  data.push({
    type: 'table',
    style: { width: '100%', fontSize: '12px' },
    tableHeader: ['Qtd', 'Item', 'Valor'],
    tableBody: d.items.map((i) => [`${i.quantity}x`, i.description, formatBRL(i.subtotal)]),
    tableHeaderStyle: { fontWeight: 'bold', textAlign: 'left' },
    tableBodyStyle: { textAlign: 'left' }
  })

  data.push({ type: 'text', value: '--------------------------------', style: { textAlign: 'center' } })

  // Divisao por pessoa
  data.push({ type: 'text', value: 'DIVISAO POR PESSOA', style: { fontWeight: 'bold', fontSize: '12px' } })
  for (const p of d.participants) {
    const pays = d.clientPayments[p.id] ?? []
    const methods = Array.from(new Set(pays.map((x) => x.method)))
    const mTxt = methods.length === 0 ? '' : methods.length === 1 ? ` (${METHOD_LABEL[methods[0]] ?? methods[0]})` : ' (Misto)'
    data.push({
      type: 'text',
      value: `${p.nickname ?? p.name}${mTxt}: ${formatBRL(d.perClientShare[p.id] ?? 0)}`,
      style: { fontSize: '12px' }
    })
  }

  data.push({ type: 'text', value: '--------------------------------', style: { textAlign: 'center' } })
  data.push({
    type: 'text',
    value: `TOTAL: ${formatBRL(d.total)}`,
    style: { fontWeight: 'bold', textAlign: 'right', fontSize: '16px' }
  })
  data.push({ type: 'text', value: ' ', style: {} })
  data.push({ type: 'text', value: store, style: { textAlign: 'center', fontSize: '10px' } })

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
