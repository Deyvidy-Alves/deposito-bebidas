import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog } from 'electron'
import { FinanceService } from './finance'
import { SettingsService } from './settings'
import type { Period, ReportKind } from '@shared/types'

const BRL = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)

const REPORT_TITLES: Record<ReportKind, string> = {
  summary: 'Resumo Financeiro',
  'top-products': 'Produtos Mais Vendidos',
  'sales-by-day': 'Vendas por Dia',
  debtors: 'Clientes com Saldo Devedor',
  'cash-flow': 'Fluxo de Caixa'
}

/** Monta as linhas (matriz) de um relatório para CSV/PDF. */
function buildRows(kind: ReportKind, period: Period): { headers: string[]; rows: string[][] } {
  switch (kind) {
    case 'summary': {
      const s = FinanceService.summary(period)
      return {
        headers: ['Indicador', 'Valor'],
        rows: [
          ['Faturamento recebido', BRL(s.revenue)],
          ['  Dinheiro', BRL(s.byMethod.cash)],
          ['  PIX', BRL(s.byMethod.pix)],
          ['  Cartão', BRL(s.byMethod.card)],
          ['CMV (custo de mercadoria)', BRL(s.cmv)],
          ['Lucro bruto', BRL(s.grossProfit)],
          ['Despesas operacionais', BRL(s.expenses)],
          ['Lucro líquido', BRL(s.netProfit)],
          ['Crediário pendente', BRL(s.pendingCredit)]
        ]
      }
    }
    case 'top-products': {
      const list = FinanceService.topProducts(period)
      return {
        headers: ['Produto', 'Quantidade', 'Faturamento'],
        rows: list.map((p) => [p.name, String(p.quantity), BRL(p.revenue)])
      }
    }
    case 'sales-by-day': {
      const list = FinanceService.salesByDay(period)
      return { headers: ['Data', 'Total'], rows: list.map((d) => [d.date, BRL(d.total)]) }
    }
    case 'debtors': {
      const list = FinanceService.debtors()
      return {
        headers: ['Cliente', 'Apelido', 'Saldo devedor'],
        rows: list.map((d) => [d.name, d.nickname ?? '', BRL(d.debt)])
      }
    }
    case 'cash-flow': {
      const list = FinanceService.cashFlow(period)
      return {
        headers: ['Data', 'Entradas', 'Saídas', 'Saldo'],
        rows: list.map((d) => [d.date, BRL(d.inflow), BRL(d.outflow), BRL(d.inflow - d.outflow)])
      }
    }
  }
}

function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string): string => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))]
  return '﻿' + lines.join('\r\n') // BOM p/ acentos no Excel
}

function toHtml(title: string, period: Period, sections: { heading: string; headers: string[]; rows: string[][] }[]): string {
  const store = SettingsService.get('store_name') ?? 'Depósito de Bebidas'
  const tables = sections
    .map(
      (s) => `
      <h2>${s.heading}</h2>
      <table>
        <thead><tr>${s.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${s.rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
          .join('')}</tbody>
      </table>`
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; color: #111; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .muted { color: #666; font-size: 12px; margin-bottom: 20px; }
    h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #16a34a; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
    th { background: #f3f4f6; }
  </style></head><body>
    <h1>${store} — ${title}</h1>
    <div class="muted">Período: ${period.from} a ${period.to}</div>
    ${tables}
  </body></html>`
}

export const FinanceExportService = {
  async exportCsv(kind: ReportKind, period: Period): Promise<string | null> {
    const { headers, rows } = buildRows(kind, period)
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(win!, {
      title: 'Exportar CSV',
      defaultPath: `${kind}_${period.from}_${period.to}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, toCsv(headers, rows), 'utf8')
    return filePath
  },

  async exportPdf(period: Period): Promise<string | null> {
    // Relatório consolidado com as principais seções.
    const sections = [
      { heading: REPORT_TITLES.summary, ...buildRows('summary', period) },
      { heading: REPORT_TITLES['top-products'], ...buildRows('top-products', period) },
      { heading: REPORT_TITLES['cash-flow'], ...buildRows('cash-flow', period) },
      { heading: REPORT_TITLES.debtors, ...buildRows('debtors', period) }
    ]
    const html = toHtml('Relatório Financeiro', period, sections)

    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(parent!, {
      title: 'Exportar PDF',
      defaultPath: `relatorio_financeiro_${period.from}_${period.to}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return null

    // Renderiza o HTML em uma janela oculta e imprime como PDF (Chromium nativo do Electron).
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      await writeFile(filePath, pdf)
      return filePath
    } finally {
      win.destroy()
    }
  }
}

export const financeExportRoutes = {
  'finance:exportCsv': (p: { kind: ReportKind; period: Period }) =>
    FinanceExportService.exportCsv(p.kind, p.period),
  'finance:exportPdf': (period: Period) => FinanceExportService.exportPdf(period)
}
