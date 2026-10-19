import { eq } from 'drizzle-orm'
import { getDb } from '../database'
import { copaIngredients, copaRecipes, products } from '../database/schema'
import { round2, sumMoney } from '../lib/money'
import { nowSql } from '../lib/time'
import { ingredientStockUnits } from '../lib/copa'
import type {
  CopaIngredientInput,
  CopaRecipeInput,
  CopaRecipeWithIngredients,
  ProductUnit
} from '@shared/types'

/** Custo de um insumo = unidades de estoque consumidas × custo do produto. */
function costOf(unit: ProductUnit, costPrice: number, volume: number, amount: number): number {
  return round2(ingredientStockUnits(unit, volume, amount) * costPrice)
}

interface ComputedIngredient {
  productId: number
  mlUsed: number
  liquid: boolean
  proportionalCost: number
}

// Tipo da transação do Drizzle (para o helper rodar dentro do tx).
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

/**
 * Resolve cada insumo: se vier `bottleMl` (dose), grava o volume no produto
 * (para a baixa de estoque futura) e usa-o no custo proporcional; senão trata
 * como insumo por unidade (ex.: gelo), cujo custo vem do preço daquela marca.
 * Precisa rodar dentro de uma transação (tx) para manter a atomicidade.
 */
function computeIngredients(tx: Tx, ingredients: CopaIngredientInput[]): ComputedIngredient[] {
  return ingredients.map((ing) => {
    const p = tx.select().from(products).where(eq(products.id, ing.productId)).get()
    if (!p) throw new Error('Insumo inexistente.')
    const bottle = ing.bottleMl && ing.bottleMl > 0 ? round2(ing.bottleMl) : 0
    if (bottle > 0 && bottle !== p.volumePerUnit) {
      tx.update(products).set({ volumePerUnit: bottle }).where(eq(products.id, p.id)).run()
    }
    const effVol = bottle > 0 ? bottle : p.volumePerUnit
    return {
      productId: ing.productId,
      mlUsed: round2(ing.mlUsed),
      liquid: effVol > 0,
      proportionalCost: costOf(p.unit, p.costPrice, effVol, ing.mlUsed)
    }
  })
}

function hydrate(recipeId: number): CopaRecipeWithIngredients {
  const db = getDb()
  const recipe = db.select().from(copaRecipes).where(eq(copaRecipes.id, recipeId)).get()
  if (!recipe) throw new Error('Receita não encontrada.')
  const ings = db
    .select({
      id: copaIngredients.id,
      recipeId: copaIngredients.recipeId,
      productId: copaIngredients.productId,
      mlUsed: copaIngredients.mlUsed,
      proportionalCost: copaIngredients.proportionalCost,
      productName: products.name,
      unit: products.unit,
      volumePerUnit: products.volumePerUnit
    })
    .from(copaIngredients)
    .innerJoin(products, eq(copaIngredients.productId, products.id))
    .where(eq(copaIngredients.recipeId, recipeId))
    .all()
  return { ...recipe, ingredients: ings }
}

export const CopaService = {
  list(): CopaRecipeWithIngredients[] {
    const db = getDb()
    const recipes = db
      .select()
      .from(copaRecipes)
      .where(eq(copaRecipes.active, true))
      .orderBy(copaRecipes.name)
      .all()
    return recipes.map((r) => hydrate(r.id))
  },

  get(id: number): CopaRecipeWithIngredients {
    return hydrate(id)
  },

  create(input: CopaRecipeInput): CopaRecipeWithIngredients {
    const db = getDb()
    if (!input.name?.trim()) throw new Error('Informe o nome da receita.')
    if (!input.ingredients?.length) throw new Error('Adicione ao menos um insumo.')

    return db.transaction((tx) => {
      const computed = computeIngredients(tx, input.ingredients)

      const totalMl = round2(computed.filter((c) => c.liquid).reduce((a, c) => a + c.mlUsed, 0))
      const cost = sumMoney(computed.map((c) => c.proportionalCost))
      const { salePrice, marginPct } = resolvePricing(cost, input)

      const recipe = tx
        .insert(copaRecipes)
        .values({
          name: input.name.trim(),
          recipeType: input.recipeType ?? 'copao',
          description: input.description?.trim() || null,
          totalMl,
          costPrice: cost,
          salePrice,
          marginPct
        })
        .returning()
        .get()

      for (const c of computed) {
        tx.insert(copaIngredients)
          .values({
            recipeId: recipe.id,
            productId: c.productId,
            mlUsed: c.mlUsed,
            proportionalCost: c.proportionalCost
          })
          .run()
      }
      return hydrate(recipe.id)
    })
  },

  update(id: number, input: CopaRecipeInput): CopaRecipeWithIngredients {
    const db = getDb()
    return db.transaction((tx) => {
      const computed = computeIngredients(tx, input.ingredients)
      const totalMl = round2(computed.filter((c) => c.liquid).reduce((a, c) => a + c.mlUsed, 0))
      const cost = sumMoney(computed.map((c) => c.proportionalCost))
      const { salePrice, marginPct } = resolvePricing(cost, input)

      tx.update(copaRecipes)
        .set({
          name: input.name.trim(),
          recipeType: input.recipeType ?? 'copao',
          description: input.description?.trim() || null,
          totalMl,
          costPrice: cost,
          salePrice,
          marginPct,
          updatedAt: nowSql
        })
        .where(eq(copaRecipes.id, id))
        .run()
      tx.delete(copaIngredients).where(eq(copaIngredients.recipeId, id)).run()
      for (const c of computed) {
        tx.insert(copaIngredients)
          .values({
            recipeId: id,
            productId: c.productId,
            mlUsed: c.mlUsed,
            proportionalCost: c.proportionalCost
          })
          .run()
      }
      return hydrate(id)
    })
  },

  remove(id: number): void {
    getDb()
      .update(copaRecipes)
      .set({ active: false, updatedAt: nowSql })
      .where(eq(copaRecipes.id, id))
      .run()
  }
}

/** Resolve preço de venda e margem a partir de margem% OU valor direto. */
function resolvePricing(
  cost: number,
  input: CopaRecipeInput
): { salePrice: number; marginPct: number } {
  if (input.salePrice != null && input.salePrice > 0) {
    const salePrice = round2(input.salePrice)
    const marginPct = cost > 0 ? round2((salePrice / cost - 1) * 100) : 0
    return { salePrice, marginPct }
  }
  const marginPct = round2(input.marginPct ?? 0)
  const salePrice = round2(cost * (1 + marginPct / 100))
  return { salePrice, marginPct }
}

export const copaRoutes = {
  'copa:list': () => CopaService.list(),
  'copa:get': (id: number) => CopaService.get(id),
  'copa:create': (input: CopaRecipeInput) => CopaService.create(input),
  'copa:update': (p: { id: number; input: CopaRecipeInput }) => CopaService.update(p.id, p.input),
  'copa:remove': (id: number) => CopaService.remove(id)
}
