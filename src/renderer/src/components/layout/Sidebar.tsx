import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Beer } from 'lucide-react'
import { NAV_ITEMS } from '@/config/nav'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Sidebar(): React.JSX.Element {
  const [storeName, setStoreName] = useState('Depósito')

  useEffect(() => {
    api.settings
      .get('store_name')
      .then((v) => v && setStoreName(v))
      .catch(() => {})
  }, [])

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Beer className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="line-clamp-1 text-base font-bold">{storeName}</p>
          <p className="text-xs text-muted-foreground">Gestão & Crediário</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        <p>
          <kbd className="rounded bg-muted px-1.5 py-0.5">Ctrl</kbd> +{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5">K</kbd> buscar
        </p>
      </div>
    </aside>
  )
}
