import { eq } from 'drizzle-orm'
import { getDb } from '../database'
import { settings } from '../database/schema'

export const SettingsService = {
  getAll(): Record<string, string> {
    const rows = getDb().select().from(settings).all()
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key] = r.value ?? ''
    return out
  },

  get(key: string): string | null {
    const row = getDb().select().from(settings).where(eq(settings.key, key)).get()
    return row?.value ?? null
  },

  set(key: string, value: string): void {
    getDb()
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run()
  }
}

export const settingsRoutes = {
  'settings:getAll': () => SettingsService.getAll(),
  'settings:get': (key: string) => SettingsService.get(key),
  'settings:set': (p: { key: string; value: string }) => SettingsService.set(p.key, p.value)
}
