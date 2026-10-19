/**
 * Paleta de marca por estabelecimento (multi-tenant-ready). Cada preset define a
 * cor primária e seu texto, em HSL ("H S% L%") para casar com os tokens do tema.
 * Só sobrescrevemos primária/ring/gradiente — `success` (verde = dinheiro),
 * `warning` e `destructive` permanecem fixos por semântica.
 */
export interface BrandColor {
  id: string
  label: string
  /** Cor primária em HSL "H S% L%". */
  primary: string
  /** Texto sobre a primária em HSL "H S% L%". */
  primaryForeground: string
}

export const BRAND_COLORS: BrandColor[] = [
  { id: 'emerald', label: 'Esmeralda', primary: '150 70% 45%', primaryForeground: '150 90% 7%' },
  { id: 'lime', label: 'Verde-limão', primary: '100 60% 45%', primaryForeground: '100 90% 7%' },
  { id: 'cyan', label: 'Ciano', primary: '190 85% 48%', primaryForeground: '190 90% 8%' },
  { id: 'blue', label: 'Azul', primary: '212 90% 56%', primaryForeground: '0 0% 100%' },
  { id: 'violet', label: 'Violeta', primary: '265 85% 66%', primaryForeground: '0 0% 100%' },
  { id: 'magenta', label: 'Magenta', primary: '320 75% 58%', primaryForeground: '0 0% 100%' },
  { id: 'coral', label: 'Coral', primary: '12 85% 60%', primaryForeground: '0 0% 100%' },
  { id: 'amber', label: 'Âmbar', primary: '38 92% 55%', primaryForeground: '36 92% 8%' }
]

export const DEFAULT_BRAND_ID = 'emerald'
const STORAGE_KEY = 'brand_color'

export function brandById(id: string | null | undefined): BrandColor {
  return BRAND_COLORS.find((b) => b.id === id) ?? BRAND_COLORS[0]
}

/** Deriva o gradiente da marca a partir da primária (tom levemente deslocado). */
function gradientStops(primary: string): { from: string; to: string } {
  const [h, s, l] = primary.split(' ')
  const hue = Number(h) || 0
  // "from" um pouco mais quente/escuro, "to" na primária — visual de profundidade.
  const from = `${(hue + 12) % 360} ${s} ${l}`
  return { from, to: primary }
}

/** Aplica a cor da marca ao :root (e cacheia para aplicar no próximo boot sem flash). */
export function applyBrandColor(id: string): void {
  const brand = brandById(id)
  const root = document.documentElement
  const { from, to } = gradientStops(brand.primary)
  root.style.setProperty('--primary', brand.primary)
  root.style.setProperty('--primary-foreground', brand.primaryForeground)
  root.style.setProperty('--ring', brand.primary)
  root.style.setProperty('--brand-from', from)
  root.style.setProperty('--brand-to', to)
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Cor salva no cache local (para aplicar antes do React montar). */
export function cachedBrandId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BRAND_ID
  } catch {
    return DEFAULT_BRAND_ID
  }
}
