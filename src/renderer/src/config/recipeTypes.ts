import { GlassWater, Martini, Wine, Package, UtensilsCrossed, Sparkles, type LucideIcon } from 'lucide-react'
import type { RecipeType } from '@shared/types'

export interface RecipeTypeMeta {
  value: RecipeType
  label: string
  /** Plural para títulos de seção/aba. */
  plural: string
  icon: LucideIcon
  hint: string
}

/**
 * Catálogo de tipos de ficha técnica. Pensado para SaaS: o mesmo motor de
 * custo proporcional atende bares, lanchonetes, adegas e conveniências.
 */
export const RECIPE_TYPES: RecipeTypeMeta[] = [
  { value: 'copao', label: 'Copão', plural: 'Copões', icon: GlassWater, hint: 'Bebida servida no copo grande (ex.: whisky + energético)' },
  { value: 'drink', label: 'Drink', plural: 'Drinks', icon: Martini, hint: 'Coquetéis e caipirinhas' },
  { value: 'dose', label: 'Dose', plural: 'Doses', icon: Wine, hint: 'Dose individual de destilado' },
  { value: 'combo', label: 'Combo', plural: 'Combos', icon: Package, hint: 'Conjunto de itens vendido junto' },
  { value: 'porcao', label: 'Porção', plural: 'Porções', icon: UtensilsCrossed, hint: 'Petiscos e porções' },
  { value: 'outro', label: 'Outro', plural: 'Outros', icon: Sparkles, hint: 'Qualquer item montado a partir do estoque' }
]

const BY_VALUE = new Map(RECIPE_TYPES.map((t) => [t.value, t]))

export function recipeTypeMeta(type: RecipeType | null | undefined): RecipeTypeMeta {
  return BY_VALUE.get(type ?? 'copao') ?? RECIPE_TYPES[0]
}
