import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from '@/components/GlobalSearch'

export function AppLayout(): React.JSX.Element {
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()

  // Atalhos globais: Ctrl+K busca, F3 busca cliente, F2 nova mesa.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (e.key === 'F3') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === 'F2') {
        e.preventDefault()
        navigate('/mesas', { state: { newTable: true } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
