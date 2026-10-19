import type { ProductUnit } from '@shared/types'

/**
 * Quantas unidades de estoque do produto são consumidas por 1 copão.
 *
 * - Produto líquido em garrafa (un/kg com volume por unidade): `amount` está em
 *   ML e consome a fração da garrafa → amount / volumePerUnit.
 * - Produto medido em ml: `amount` já está em ml → consome o próprio amount.
 * - Produto por unidade/peso sem volume (ex.: gelo, marcas diferentes): `amount`
 *   é a quantidade usada → consome o próprio amount. O custo diferente entre
 *   marcas vem do preço de custo de cada produto.
 */
export function ingredientStockUnits(
  unit: ProductUnit,
  volumePerUnit: number,
  amount: number
): number {
  if (unit === 'ml') return amount
  if (volumePerUnit > 0) return amount / volumePerUnit
  return amount
}

/** True quando o insumo é medido em ML (líquido em garrafa ou em ml). */
export function isLiquidIngredient(unit: ProductUnit, volumePerUnit: number): boolean {
  return unit === 'ml' || volumePerUnit > 0
}
