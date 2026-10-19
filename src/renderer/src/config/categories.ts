/**
 * Lista ampla e genérica de categorias (pensada para SaaS — não só um depósito).
 * O usuário pode criar novas pelo combobox; as já cadastradas são aprendidas.
 */
export const DEFAULT_CATEGORIES: string[] = [
  // Cervejas
  'Cerveja',
  'Chopp',
  // Destilados
  'Whisky',
  'Vodka',
  'Cachaça',
  'Gin',
  'Rum',
  'Tequila',
  'Conhaque',
  'Licor',
  'Aperitivo',
  // Vinhos
  'Vinho',
  'Espumante',
  'Sangria',
  // Outras bebidas alcoólicas
  'Ice / Vodka Ice',
  'Saquê',
  // Não alcoólicas
  'Refrigerante',
  'Energético',
  'Isotônico',
  'Suco',
  'Água',
  'Água com gás',
  'Água de coco',
  'Chá gelado',
  // Gelo
  'Gelo',
  'Gelo saborizado',
  // Tabacaria
  'Cigarro',
  'Tabaco',
  'Seda',
  'Isqueiro',
  'Essência / Narguilé',
  // Conveniência
  'Salgadinho',
  'Amendoim',
  'Chocolate',
  'Bala / Doce',
  'Biscoito',
  'Chiclete',
  'Petisco',
  // Acessórios
  'Abridor',
  'Copo',
  'Gelo seco',
  'Carregador',
  'Chaveiro',
  'Pilha',
  'Descartáveis',
  'Outros'
]

/** Une o catálogo padrão com categorias já usadas, sem duplicar (case-insensitive). */
export function mergeCategories(existing: string[]): string[] {
  const seen = new Set(DEFAULT_CATEGORIES.map((c) => c.toLowerCase()))
  const extra = existing.filter((c) => c && !seen.has(c.toLowerCase()))
  return [...extra, ...DEFAULT_CATEGORIES]
}
