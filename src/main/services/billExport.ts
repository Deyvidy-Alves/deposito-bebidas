import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog } from 'electron'
import { TablesService } from './tables'
import { SettingsService } from './settings'
import { formatBRL } from '../lib/money'

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

/** HTML da comanda (itens + divisão por pessoa + total). */
export function buildBillHtml(tableId: number): string {
  const d = TablesService.getDetails(tableId)
  const store = SettingsService.get('store_name') ?? 'Depósito'
  const title = d.label ?? `Mesa #${d.id}`

  const itemRows = d.items
    .map(
      (i) => `<tr>
        <td>${i.quantity}×</td>
        <td>${i.description}</td>
        <td class="r">${formatBRL(i.unitPrice)}</td>
        <td class="r">${formatBRL(i.subtotal)}</td>
      </tr>`
    )
    .join('')

  const shareRows = d.participants
    .map((p) => {
      const name = p.nickname ?? p.name
      return `<tr>
        <td>${name}${p.settled ? ' <span class="paid">(pago)</span>' : ''}</td>
        <td class="r">${formatBRL(d.perClientShare[p.id] ?? 0)}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { font-family: Arial, sans-serif; }
    body { color: #111; padding: 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 20px; margin: 0; }
    .sub { color: #555; font-size: 12px; margin: 2px 0 16px; }
    h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td, th { padding: 5px 4px; border-bottom: 1px solid #eee; text-align: left; }
    .r { text-align: right; }
    .total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 12px; border-top: 2px solid #111; padding-top: 10px; }
    .paid { color: #16a34a; font-size: 11px; }
    .foot { text-align: center; color: #888; font-size: 11px; margin-top: 20px; }
  </style></head><body>
    <h1>${store}</h1>
    <div class="sub">Comanda — ${title}<br/>
      Aberta: ${formatDateTime(d.createdAt)}${d.closedAt ? ` · Fechada: ${formatDateTime(d.closedAt)}` : ''}
    </div>
    <h2>Itens</h2>
    <table><tbody>${itemRows || '<tr><td colspan="4">Sem itens</td></tr>'}</tbody></table>
    <h2>Divisão por pessoa</h2>
    <table><tbody>${shareRows}</tbody></table>
    <div class="total"><span>TOTAL</span><span>${formatBRL(d.total)}</span></div>
    <div class="foot">${store} · ${formatDateTime(new Date().toISOString())}</div>
  </body></html>`
}

export const BillExportService = {
  async exportPdf(tableId: number): Promise<string | null> {
    const html = buildBillHtml(tableId)
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(parent!, {
      title: 'Salvar comanda',
      defaultPath: `comanda_mesa_${tableId}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return null

    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A5' })
      await writeFile(filePath, pdf)
      return filePath
    } finally {
      win.destroy()
    }
  }
}

export const billExportRoutes = {
  'tables:billPdf': (tableId: number) => BillExportService.exportPdf(tableId)
}
