import { create } from 'zustand'
import { api } from '@/lib/api'
import { applyBrandColor, cachedBrandId, DEFAULT_BRAND_ID } from '@/config/brandColors'

interface SettingsState {
  storeName: string
  tagline: string
  brandColor: string
  loaded: boolean
  load: () => Promise<void>
  setStoreName: (name: string) => void
  setTagline: (tagline: string) => void
  setBrandColor: (id: string) => void
}

const DEFAULT_NAME = 'Depósito'
const DEFAULT_TAGLINE = 'Gestão & Crediário'

/** Atualiza o título da janela do SO a partir do nome da loja. */
function applyWindowTitle(name: string): void {
  document.title = name ? `${name} — Gestão` : 'Depósito — Gestão'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: DEFAULT_NAME,
  tagline: DEFAULT_TAGLINE,
  brandColor: cachedBrandId(),
  loaded: false,
  load: async () => {
    try {
      const [name, tagline, brand] = await Promise.all([
        api.settings.get('store_name'),
        api.settings.get('store_tagline'),
        api.settings.get('brand_color')
      ])
      const resolvedName = name || DEFAULT_NAME
      const resolvedTagline = tagline || DEFAULT_TAGLINE
      const resolvedBrand = brand || DEFAULT_BRAND_ID
      set({
        storeName: resolvedName,
        tagline: resolvedTagline,
        brandColor: resolvedBrand,
        loaded: true
      })
      applyWindowTitle(resolvedName)
      applyBrandColor(resolvedBrand)
    } catch {
      set({ loaded: true })
    }
  },
  setStoreName: (name) => {
    const value = name || DEFAULT_NAME
    set({ storeName: value })
    applyWindowTitle(value)
  },
  setTagline: (tagline) => set({ tagline: tagline || DEFAULT_TAGLINE }),
  setBrandColor: (id) => {
    set({ brandColor: id })
    applyBrandColor(id)
  }
}))
