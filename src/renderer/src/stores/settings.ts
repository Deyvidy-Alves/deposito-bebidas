import { create } from 'zustand'
import { api } from '@/lib/api'

interface SettingsState {
  storeName: string
  loaded: boolean
  load: () => Promise<void>
  setStoreName: (name: string) => void
}

const DEFAULT_NAME = 'Depósito'

/** Atualiza o título da janela do SO a partir do nome da loja. */
function applyWindowTitle(name: string): void {
  document.title = name ? `${name} — Gestão` : 'Depósito — Gestão'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  storeName: DEFAULT_NAME,
  loaded: false,
  load: async () => {
    try {
      const name = (await api.settings.get('store_name')) || DEFAULT_NAME
      set({ storeName: name, loaded: true })
      applyWindowTitle(name)
    } catch {
      set({ loaded: true })
    }
  },
  setStoreName: (name) => {
    const value = name || DEFAULT_NAME
    set({ storeName: value })
    applyWindowTitle(value)
  }
}))
