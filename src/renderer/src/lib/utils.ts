import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Formata um número como moeda brasileira (R$). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

/** Rótulo amigável para a forma de pagamento. */
export function paymentMethodLabel(method: string): string {
  return (
    { cash: 'Dinheiro', pix: 'PIX', card: 'Cartão', credit: 'Fiado', mixed: 'Misto' }[method] ??
    method
  )
}

/** Resume as formas de pagamento de uma pessoa (ex.: "Dinheiro", "Misto"). */
export function summarizePayments(entries: { method: string; amount: number }[]): string {
  if (!entries || entries.length === 0) return ''
  const methods = Array.from(new Set(entries.map((e) => e.method)))
  if (methods.length === 1) return paymentMethodLabel(methods[0])
  return 'Misto'
}

/** Data local no formato YYYY-MM-DD. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Calcula um período (from/to) para os presets do financeiro. */
export function periodPreset(kind: 'day' | 'week' | 'month'): { from: string; to: string } {
  const now = new Date()
  const to = toISODate(now)
  if (kind === 'day') return { from: to, to }
  if (kind === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { from: toISODate(d), to }
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: toISODate(first), to }
}

/** Formata uma data ISO/epoch para dd/mm/aaaa hh:mm. */
export function formatDateTime(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}
