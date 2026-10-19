/**
 * Helpers monetários. Valores são armazenados em `real` (reais) no SQLite,
 * então toda operação de negócio arredonda para 2 casas (centavos) para
 * evitar acúmulo de erro de ponto flutuante — crítico no crediário.
 */

/** Arredonda para 2 casas decimais (centavos). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Formata um número como moeda brasileira (R$). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

/** Soma uma lista de valores monetários com arredondamento seguro. */
export function sumMoney(values: number[]): number {
  return round2(values.reduce((acc, v) => acc + (v || 0), 0))
}

/** Divide `total` em `parts` partes iguais, distribuindo os centavos restantes. */
export function splitEqually(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const cents = Math.round(round2(total) * 100)
  const base = Math.floor(cents / parts)
  const remainder = cents - base * parts
  return Array.from({ length: parts }, (_, i) => round2((base + (i < remainder ? 1 : 0)) / 100))
}
