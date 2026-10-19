import { eq } from 'drizzle-orm'
import { getDb } from '../database'
import { clients, payments, tableClients, tableItems, tables } from '../database/schema'
import { round2 } from '../lib/money'
import { SettingsService } from './settings'
import type { FiscalConfig, InvoicePayload, InvoiceResult } from '@shared/types'

const KEYS = {
  enabled: 'fiscal_enabled',
  url: 'fiscal_provider_url',
  token: 'fiscal_api_token',
  cnpj: 'fiscal_cnpj'
}

export const FiscalService = {
  getConfig(): FiscalConfig {
    return {
      enabled: SettingsService.get(KEYS.enabled) === 'true',
      providerUrl: SettingsService.get(KEYS.url) ?? '',
      apiToken: SettingsService.get(KEYS.token) ?? '',
      cnpj: SettingsService.get(KEYS.cnpj) ?? ''
    }
  },

  setConfig(cfg: FiscalConfig): void {
    SettingsService.set(KEYS.enabled, cfg.enabled ? 'true' : 'false')
    SettingsService.set(KEYS.url, cfg.providerUrl ?? '')
    SettingsService.set(KEYS.token, cfg.apiToken ?? '')
    SettingsService.set(KEYS.cnpj, cfg.cnpj ?? '')
  },

  /** Monta o JSON da venda de uma mesa no formato esperado pela API fiscal. */
  buildInvoice(tableId: number): InvoicePayload {
    const db = getDb()
    const table = db.select().from(tables).where(eq(tables.id, tableId)).get()
    if (!table) throw new Error('Mesa não encontrada.')

    const items = db.select().from(tableItems).where(eq(tableItems.tableId, tableId)).all()
    const pays = db.select().from(payments).where(eq(payments.tableId, tableId)).all()

    const firstClient = db
      .select({ name: clients.name, nickname: clients.nickname })
      .from(tableClients)
      .innerJoin(clients, eq(tableClients.clientId, clients.id))
      .where(eq(tableClients.tableId, tableId))
      .get()

    const cfg = FiscalService.getConfig()
    return {
      cnpj: cfg.cnpj,
      tableId,
      customer: firstClient ?? null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.subtotal
      })),
      total: round2(items.reduce((a, i) => a + i.subtotal, 0)),
      payments: pays.map((p) => ({ method: p.method, amount: p.amount })),
      issuedAt: new Date().toISOString()
    }
  },

  /**
   * Emite a nota. A estrutura de integração REST (Nuvem Fiscal ou similar) está
   * pronta: quando houver URL + token configurados, envia o JSON montado. Sem
   * credenciais, retorna o rascunho para conferência (o dono emite poucas notas).
   */
  async emit(tableId: number): Promise<InvoiceResult> {
    const cfg = FiscalService.getConfig()
    if (!cfg.enabled) throw new Error('Módulo fiscal está desativado.')

    const payload = FiscalService.buildInvoice(tableId)

    if (!cfg.providerUrl || !cfg.apiToken) {
      return {
        status: 'draft',
        message: 'Rascunho gerado (configure URL e token da API fiscal para enviar).',
        payload
      }
    }

    try {
      const res = await fetch(cfg.providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        return { status: 'error', message: `API retornou ${res.status}.`, payload }
      }
      return { status: 'sent', message: 'Nota enviada à API fiscal.', payload }
    } catch (err) {
      return { status: 'error', message: `Falha de comunicação: ${(err as Error).message}`, payload }
    }
  }

  /*
   * Hook preparado para SAT/MFE via ffi-napi (não implementado — estrutura):
   *
   *   import ffi from 'ffi-napi'
   *   const sat = ffi.Library('SAT', {
   *     Enviar: ['string', ['int', 'string', 'string', 'string', 'double']]
   *   })
   *   function enviarSat(payload: InvoicePayload, codigoAtivacao: string): string {
   *     return sat.Enviar(1, codigoAtivacao, 'assinatura', JSON.stringify(payload), 0)
   *   }
   *
   * A DLL do equipamento SAT/MFE seria carregada aqui quando o lojista aderir.
   */
}

export const fiscalRoutes = {
  'fiscal:getConfig': () => FiscalService.getConfig(),
  'fiscal:setConfig': (cfg: FiscalConfig) => FiscalService.setConfig(cfg),
  'fiscal:buildInvoice': (tableId: number) => FiscalService.buildInvoice(tableId),
  'fiscal:emit': (tableId: number) => FiscalService.emit(tableId)
}
