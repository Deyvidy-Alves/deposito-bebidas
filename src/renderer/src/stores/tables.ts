import { create } from 'zustand'
import { api } from '@/lib/api'
import type { TableDetails, TableSummary } from '@shared/types'

interface TablesState {
  summaries: TableSummary[]
  filter: 'open' | 'closed'
  activeId: number | null
  detail: TableDetails | null
  loading: boolean
  setFilter: (f: 'open' | 'closed') => void
  loadSummaries: () => Promise<void>
  select: (id: number | null) => Promise<void>
  refreshDetail: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useTablesStore = create<TablesState>((set, get) => ({
  summaries: [],
  filter: 'open',
  activeId: null,
  detail: null,
  loading: false,

  setFilter: (f) => {
    set({ filter: f })
    void get().loadSummaries()
  },

  loadSummaries: async () => {
    const summaries = await api.tables.summaries(get().filter)
    set({ summaries })
    // Mantém seleção válida
    const { activeId } = get()
    if (activeId && !summaries.some((s) => s.id === activeId)) {
      set({ activeId: null, detail: null })
    }
  },

  select: async (id) => {
    set({ activeId: id })
    if (id == null) {
      set({ detail: null })
      return
    }
    set({ loading: true })
    try {
      const detail = await api.tables.details(id)
      set({ detail })
    } finally {
      set({ loading: false })
    }
  },

  refreshDetail: async () => {
    const { activeId } = get()
    if (activeId == null) return
    const detail = await api.tables.details(activeId)
    set({ detail })
  },

  refreshAll: async () => {
    await get().loadSummaries()
    await get().refreshDetail()
  }
}))
