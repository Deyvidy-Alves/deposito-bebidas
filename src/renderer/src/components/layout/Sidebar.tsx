import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Beer, Cloud } from 'lucide-react'
import { NAV_ITEMS, NAV_GROUPS } from '@/config/nav'
import { useSettingsStore } from '@/stores/settings'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Sidebar(): React.JSX.Element {
  const storeName = useSettingsStore((s) => s.storeName)
  const tagline = useSettingsStore((s) => s.tagline)
  const load = useSettingsStore((s) => s.load)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    load()
  }, [load])

  // Pendências de sincronização (fila local do outbox).
  useEffect(() => {
    const tick = (): void => {
      api.sync
        .pendingCount()
        .then(setPending)
        .catch(() => {})
    }
    tick()
    const t = setInterval(tick, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
          <Beer className="h-6 w-6" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="line-clamp-1 text-base font-bold">{storeName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>

      {/* Navegação agrupada */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group}
            </p>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé: status de dados + atalho */}
      <div className="space-y-2 border-t px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Cloud className="h-4 w-4 text-primary/70" />
          <span>Dados locais</span>
          <span
            className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary"
            title={
              pending > 0
                ? `${pending} mudança(s) na fila para sincronizar quando a nuvem estiver ativa`
                : 'Nada pendente de sincronização'
            }
          >
            {pending > 0 ? `${pending} p/ sincronizar` : 'Online em breve'}
          </span>
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          <kbd className="rounded bg-muted px-1.5 py-0.5">Ctrl</kbd> +{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5">K</kbd> buscar
        </p>
      </div>
    </aside>
  )
}
